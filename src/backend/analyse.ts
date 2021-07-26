import { DateTime } from 'luxon'
import * as Z from 'zebras'

import { Analysis, ByWeekAnalysis, RunSummary } from './model'

const firstDayOfWeek = (run: RunSummary): string => {
  return run.startTime.startOf('week').toISO()
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

export const computeAnalysis = (runs: RunSummary[]): Analysis => {
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

  const byWeek = Z.sort((a, b) => b.start.toMillis() - a.start.toMillis(), unsortedByWeek) as ByWeekAnalysis[]

  return {
    byWeek,
  }
}
