const { readdir, readFile } = require('fs').promises
const path = require('path')
const fitDecoder = require('fit-decoder')
const { DateTime } = require('luxon')

const { RunId, RunCollection, RunDetails, RunSummary } = require('./model')

// https://stackoverflow.com/a/22015930
const zip = (a, b) => a.map((k, i) => [k, b[i]]);

const extractSummary = async (filePath: string): Promise<typeof RunSummary> => {
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

const extractDetails = async (filePath: string): Promise<typeof RunDetails> => {
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

export const makeRunCollection = (runsRoot: string): typeof RunCollection => {
  const getSummaries = async (): Promise<typeof RunSummary[]> => {
    const runFilenames = await readdir(runsRoot)

    const runs: any = await Promise.all(runFilenames.map(async (filename: string) => {
      const filePath = path.join(runsRoot, filename)
      const summary = await extractSummary(filePath)
      return {
        ...summary,
        id: filename,
      }
    }))

    return runs
  }

  const getDetails = async (id: typeof RunId): Promise<{details: typeof RunDetails, summary: typeof RunSummary}> => {
    const filePath = path.join(runsRoot, id)

    const summary = await extractSummary(filePath)
    const details = await extractDetails(filePath)

    return { details, summary }
  }

  return {
    getSummaries,
    getDetails
  }
}
