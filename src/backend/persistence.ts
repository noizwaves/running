import { readdir, readFile } from 'fs/promises'
import path from 'path'
import fitDecoder from 'fit-decoder'
import { DateTime } from 'luxon'

import { RunId, RunDetails, RunSummary, Effort, EffortCollection } from './model'

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

const firstNumberOrNull = (arr: number[]): number | null => {
  if (arr.length > 0 && typeof arr[0] === 'number') {
    return arr[0]
  } else {
    return null
  }
}

const getAvgSpeed = (json: any, totalDistance: number, totalTime: number): number => {
  const sessionValue = firstNumberOrNull(fitDecoder.getRecordFieldValue(json, 'session', 'avg_speed'))

  // fall back to derived average speed if field not present
  if (sessionValue === null) {
    return totalDistance / totalTime
  } else {
    return sessionValue
  }
}

const extractSummary = async (cache: any, filePath: string): Promise<RunSummary> => {
  const buffer = await readBufferWithCache(cache, filePath)

  const jsonRaw = fitDecoder.fit2json(buffer)
  const json = fitDecoder.parseRecords(jsonRaw)

  const startTime = DateTime.fromJSDate(fitDecoder.getRecordFieldValue(json, 'session', 'start_time')[0])
  const totalDistance = fitDecoder.getRecordFieldValue(json, 'session', 'total_distance')[0]
  const totalTime = fitDecoder.getRecordFieldValue(json, 'session', 'total_timer_time')[0] / 1000

  const avgHeartRate = firstNumberOrNull(fitDecoder.getRecordFieldValue(json, 'session', 'avg_heart_rate'))
  const avgSpeed = getAvgSpeed(json, totalDistance, totalTime)

  const rawAvgCadence = firstNumberOrNull(fitDecoder.getRecordFieldValue(json, 'session', 'avg_cadence'))
  const avgCadence = (rawAvgCadence === null) ? null : rawAvgCadence * 2

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

export const makeEffortCollection = (runsRoot: string): EffortCollection => {
  const _cache = {}

  const getEfforts = async () => {
    const allEffortFolderNames = await readdir(runsRoot, {withFileTypes: true})
    return allEffortFolderNames
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        return {
          id: dirent.name
        }
      })
  }

  const getCurrentEffort = async () => {
    const efforts = await getEfforts()

    efforts.sort((a, b) => a.id.localeCompare(b.id))

    return efforts[efforts.length - 1]
  }

  const getSummaries = async (effort: Effort): Promise<RunSummary[]> => {
    const effortPath = path.join(runsRoot, effort.id)
    const allFilenames = await readdir(effortPath)
    const runFilenames = allFilenames.filter((filename) => filename.toLowerCase().endsWith('.fit'))

    const runs: any = await Promise.all(runFilenames.map(async (filename: string) => {
      const filePath = path.join(effortPath, filename)
      const summary = await extractSummary(_cache, filePath)
      return {
        ...summary,
        effortId: effort.id,
        id: filename,
      }
    }))

    return runs
  }

  const getDetails = async (effort: Effort, id: RunId): Promise<{details: RunDetails, summary: RunSummary}> => {
    const filePath = path.join(runsRoot, effort.id, id)

    const summary = await extractSummary(_cache, filePath)
    const details = await extractDetails(_cache, filePath)

    return { details, summary }
  }

  return {
    getEfforts,
    getCurrentEffort,
    getSummaries,
    getDetails,
  }
}
