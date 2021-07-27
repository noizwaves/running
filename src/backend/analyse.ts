import { DateTime } from 'luxon'
import * as Z from 'zebras'

import { Analysis, ByDayAnalysis, ByWeekAnalysis, RunSummary } from './model'

const firstDayOfWeek = (run: RunSummary): string => {
  return run.startTime.startOf('week').toISO()
}

const startOfDay = (run: RunSummary): string => {
  return run.startTime.startOf('day').toISO()
}

const addMissingWeeks = (incomplete) => {
  const dates = Z.getCol('group', incomplete) as any as string[]
  const start = DateTime.fromISO(dates[0])
  const finish = DateTime.fromISO(dates[dates.length - 1])


  const missing = []
  let cursor: DateTime = start
  while (cursor <= finish) {
    if (!dates.includes(cursor.toISO())) {
      missing.push({group: cursor.toISO(), sum: 0})
    }
    cursor = cursor.plus({weeks: 1})
  }

  const concatted = Z.concat(incomplete, missing)
  return Z.sort((a, b) => DateTime.fromISO(a['group']).toMillis() - DateTime.fromISO(b['group']).toMillis(), concatted)
}

const addMissingDays = (incomplete) => {
  const dates = Z.getCol('group', incomplete) as any as string[]
  const start = DateTime.fromISO(dates[0])
  const finish = DateTime.fromISO(dates[dates.length - 1])


  const missing = []
  let cursor: DateTime = start
  while (cursor <= finish) {
    if (!dates.includes(cursor.toISO())) {
      missing.push({group: cursor.toISO(), sum: null})
    }
    cursor = cursor.plus({days: 1})
  }

  const concatted = Z.concat(incomplete, missing)
  return Z.sort((a, b) => DateTime.fromISO(a['group']).toMillis() - DateTime.fromISO(b['group']).toMillis(), concatted)
}

const computeByWeek = (runs: RunSummary[]): ByWeekAnalysis[] => {
  const grpByWeeks = Z.groupBy(firstDayOfWeek, runs)
  const distanceByWeeks = Z.gbSum('totalDistance', grpByWeeks)
  const withMissingWeeks = addMissingWeeks(distanceByWeeks)

  const unsortedByWeek = withMissingWeeks.map(({group, sum}: any, index: number) => {
    const previousTotal = (index === 0) ? null : withMissingWeeks[index - 1]['sum']
    const distanceGain = (previousTotal === null || previousTotal < 0.00001) ? null : ((sum / previousTotal) - 1)

    return {
      start: DateTime.fromISO(group),
      totalDistance: sum,
      distanceGain,
    }
  })

  return Z.sort((a, b) => b.start.toMillis() - a.start.toMillis(), unsortedByWeek) as ByWeekAnalysis[]
}

const computeByDay = (runs: RunSummary[]): ByDayAnalysis[] => {
  const grpByDay = Z.groupBy(startOfDay, runs)
  const distanceByDay = Z.gbSum('totalDistance', grpByDay)
  const withMissingDays = addMissingDays(distanceByDay)

  const unsorted = withMissingDays.map(({group, sum}: any) => {
    return {
      date: DateTime.fromISO(group),
      totalDistance: sum,
    }
  })

  return Z.sort((a, b) => b.date.toMillis() - a.date.toMillis(), unsorted) as ByDayAnalysis[]
}

export const computeAnalysis = (runs: RunSummary[]): Analysis => {
  const byWeek = computeByWeek(runs)
  const byDay = computeByDay(runs)

  return {
    byWeek,
    byDay,
  }
}
