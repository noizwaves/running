const express = require('express')
const path = require('path')
const {DateTime} = require('luxon')
const {readdir, readFile} = require('fs').promises
const fitDecoder = require('fit-decoder')

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
