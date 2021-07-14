const express = require('express')
const path = require('path')
const {DateTime} = require('luxon')
const {readdir, readFile} = require('fs').promises
const fitDecoder = require('fit-decoder')
const Z = require('zebras')

//
// Core utilties
//

// https://stackoverflow.com/a/22015930
const zip = (a, b) => a.map((k, i) => [k, b[i]]);

//
// FIT data extraction
//
interface RunSummary {
  startTime: typeof DateTime
  totalDistance: number
  totalTime: number
  avgHeartRate: number
  avgSpeed: number
  avgCadence: number
}

const extractSummary = async (filePath: string): Promise<RunSummary> => {
  const file = await readFile(filePath)

  const jsonRaw = fitDecoder.fit2json(file.buffer)
  const json = fitDecoder.parseRecords(jsonRaw)

  const startTime = DateTime.fromJSDate(fitDecoder.getRecordFieldValue(json, 'session', 'start_time')[0])
  const totalDistance = fitDecoder.getRecordFieldValue(json, 'session', 'total_distance')[0]
  const totalTime = fitDecoder.getRecordFieldValue(json, 'session', 'total_timer_time')[0] / 1000
  const avgHeartRate = fitDecoder.getRecordFieldValue(json, 'session', 'avg_heart_rate')[0]
  const avgSpeed = fitDecoder.getRecordFieldValue(json, 'session', 'avg_speed')[0]
  const avgCadence = fitDecoder.getRecordFieldValue(json, 'session', 'avg_cadence')[0] * 2

  return {startTime, totalDistance, totalTime, avgSpeed, avgHeartRate, avgCadence}
}

const extractDetails = async (filePath: string) => {
  const file = await readFile(filePath)
  const buffer = file.buffer

  const jsonRaw = fitDecoder.fit2json(buffer)
  const json = fitDecoder.parseRecords(jsonRaw)

  const timestamp = fitDecoder.getRecordFieldValue(json, 'record', 'timestamp')
  const location = zip(
    fitDecoder.getRecordFieldValue(json, 'record', 'position_lat'),
    fitDecoder.getRecordFieldValue(json, 'record', 'position_long')
  )
  const distance = fitDecoder.getRecordFieldValue(json, 'record', 'distance')
  const speed = fitDecoder.getRecordFieldValue(json, 'record', 'speed')
  const hrt = fitDecoder.getRecordFieldValue(json, 'record', 'heart_rate')
  const cadence = fitDecoder.getRecordFieldValue(json, 'record', 'cadence')

  return {timestamp, location, distance, speed, hrt, cadence}
}

//
// Planning
//
const WEEKLY_GAIN_MAX = 1.1

interface WeeklyPlan {
  start: typeof DateTime
  accruedDistance: number
  projectedDistance: number
  remainingDistance: number
  asThreeEqualRuns: number;
}

interface Plan {
  weeks: WeeklyPlan[]
}

const firstDayOfWeek = (run: RunSummary): string => {
  return run.startTime.startOf('week').toISO()
}

const addMissingWeeks = (planOutTo: typeof DateTime, incomplete) => {
  const dates = Z.getCol('group', incomplete)
  const start = DateTime.fromISO(dates[0])
  const incompleteFinish = DateTime.fromISO(dates[dates.length - 1])
  const planOutToFinish = planOutTo.startOf('week')
  const finish = (planOutToFinish > incompleteFinish) ? planOutToFinish : incompleteFinish

  const missing = []
  let cursor = start
  while (cursor <= finish) {
    if (!dates.includes(cursor.toISO())) {
      missing.push({group: cursor.toISO(), sum: 0})
    }
    cursor = cursor.plus({weeks: 1})
  }

  return Z.concat(incomplete, missing)
}

// TODO: enhance to work with weeks w/ 0 accrued
const computeProjectedDistance = (weeklyGain) => (accruedDistances) => {
  if (accruedDistances.length >= 2) {
    const previousAccrued = accruedDistances[accruedDistances.length - 2]
    return previousAccrued * weeklyGain
  } else {
    return 0
  }
}

const computePlan = (weeklyGain: number, planOutTo: typeof DateTime, runs: RunSummary[]): Plan => {
  const byWeeks = Z.groupBy(firstDayOfWeek, runs)
  const distanceByWeek = Z.gbSum('totalDistance', byWeeks)
  const distanceByAllWeeks = addMissingWeeks(planOutTo, distanceByWeek)

  // Get actual run distances
  const actualRuns = {}
  Object.entries(byWeeks).forEach(keyValue => {
    const start: string = keyValue[0]
    const rs: RunSummary[] = keyValue[1] as RunSummary[]
    actualRuns[start] = rs.map(r => r.totalDistance)
  })

  const weeks = distanceByAllWeeks.map(row => {
    return {
      start: DateTime.fromISO(row.group),
      accruedDistance: row.sum,
      accruedRuns: actualRuns[row.group] || []
    }
  })
  const sortedWeeks = Z.sortByCol('start', 'asc', weeks)

  // Calculate projected from previous weeks accrued
  const accruedDistance = Z.getCol('accruedDistance', sortedWeeks)
  const shiftedProjected = Z.cumulative(computeProjectedDistance(weeklyGain), accruedDistance)
  const withProjected = Z.addCol('projectedDistance', shiftedProjected, sortedWeeks)

  // Calculate remaining distance
  const remainingDistance = Z.deriveCol((row) => row.projectedDistance - row.accruedDistance, withProjected)
  const withRemaining = Z.addCol('remainingDistance', remainingDistance, withProjected)

  // Calculate plan for 3 equal runs per week
  const threeRatio = 1 + ((weeklyGain - 1) / 2)
  const threeEqualRuns = Z.deriveCol((row) => [
    (row.projectedDistance / 3) / threeRatio,
    row.projectedDistance / 3,
    (row.projectedDistance / 3) * threeRatio,
  ], withProjected)
  const withThreeEqualRuns = Z.addCol('asThreeEqualRuns', threeEqualRuns, withRemaining)

  // Show latest week first
  return { weeks: Z.sortByCol('start', 'desc', withThreeEqualRuns) }
}


//
// Application
//
const buildApplication = ({runsRootPath}) => {
  const app = express()

  app.get('/api/runs/:id', async (req, res) => {
    const { id } = req.params
    const filePath = path.join(runsRootPath, id)

    const summary = await extractSummary(filePath)
    const details = await extractDetails(filePath)

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({id, filePath, details, summary}))
  })

  app.get('/api/runs', async (req, res) => {
    const runFilenames = await readdir(runsRootPath)

    const runs: any = await Promise.all(runFilenames.map(async (filename: string) => {
      const filePath = path.join(runsRootPath, filename)
      const summary = await extractSummary(filePath)
      return {
        ...summary,
        id: filename,
      }
    }))

    runs.sort((a, b) => a.startTime - b.startTime).reverse()

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({runs: runs}))
  })

  app.get('/api/plan', async (req, res) => {
    const runFilenames = await readdir(runsRootPath)
    const runs: any = await Promise.all(runFilenames.map(async (filename: string) => {
      const filePath = path.join(runsRootPath, filename)
      return await extractSummary(filePath)
    }))

    const plan = computePlan(WEEKLY_GAIN_MAX, DateTime.now(), runs)

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(plan))
  })

  app.use('/', express.static(path.join(__dirname, '../../dist/frontend/')))
  app.use('/*', express.static(path.join(__dirname, '../../dist/frontend/index.html')))

  return app
}


//
// Configuration
//
const PORT = process.env.PORT || 3000;
const runsRootPath = path.resolve(process.env.RUNS_ROOT_PATH || 'fixtures/runs')


//
// Bootstrap the application
//
const app = buildApplication({runsRootPath})

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})
