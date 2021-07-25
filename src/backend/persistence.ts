import { readdir, readFile } from 'fs/promises'
import path from 'path'
import fitDecoder from 'fit-decoder'
import { DateTime } from 'luxon'

import { RunId, RunCollection, RunDetails, RunSummary } from './model'

// https://stackoverflow.com/a/22015930
const zip = (a, b) => a.map((k, i) => [k, b[i]]);

const readBufferWithCache = async (cache: any, filePath: string): Promise<any> => {
  if (filePath in cache) {
    return Promise.resolve(cache[filePath])
  } else {
    const file = await readFile(filePath)
    const buffer = file.buffer
    cache[filePath] = buffer
    return Promise.resolve(buffer)
  }
}

const extractSummary = async (cache: any, filePath: string): Promise<RunSummary> => {
  const buffer = await readBufferWithCache(cache, filePath)

  const jsonRaw = fitDecoder.fit2json(buffer)
  const json = fitDecoder.parseRecords(jsonRaw)

  const startTime = DateTime.fromJSDate(fitDecoder.getRecordFieldValue(json, 'session', 'start_time')[0])
  const totalDistance = fitDecoder.getRecordFieldValue(json, 'session', 'total_distance')[0]
  const totalTime = fitDecoder.getRecordFieldValue(json, 'session', 'total_timer_time')[0] / 1000
  const avgHeartRate = fitDecoder.getRecordFieldValue(json, 'session', 'avg_heart_rate')[0]
  const avgSpeed = fitDecoder.getRecordFieldValue(json, 'session', 'avg_speed')[0]
  const avgCadence = fitDecoder.getRecordFieldValue(json, 'session', 'avg_cadence')[0] * 2

  return {startTime, totalDistance, totalTime, avgSpeed, avgHeartRate, avgCadence}
}

const extractDetails = async (cache: any, filePath: string): Promise<RunDetails> => {
  const buffer = await readBufferWithCache(cache, filePath)

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

export const makeRunCollection = (runsRoot: string): RunCollection => {
  const _cache = {}

  const getSummaries = async (): Promise<RunSummary[]> => {
    const runFilenames = await readdir(runsRoot)

    const runs: any = await Promise.all(runFilenames.map(async (filename: string) => {
      const filePath = path.join(runsRoot, filename)
      const summary = await extractSummary(_cache, filePath)
      return {
        ...summary,
        id: filename,
      }
    }))

    return runs
  }

  const getDetails = async (id: RunId): Promise<{details: RunDetails, summary: RunSummary}> => {
    const filePath = path.join(runsRoot, id)

    const summary = await extractSummary(_cache, filePath)
    const details = await extractDetails(_cache, filePath)

    return { details, summary }
  }

  return {
    getSummaries,
    getDetails
  }
}
