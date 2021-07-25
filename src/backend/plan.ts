import { DateTime } from 'luxon'
import Z from 'zebras'

import { RunSummary } from './model'

export interface CurrentWeek {
  start: DateTime
  accruedRuns: number[]
  accruedDistance: number

  projectedDistance: number
  remainingDistance: number

  asThreeRuns: number[]
  remainingRuns: number[]
}

export interface PastWeek {
  start: DateTime
  accruedRuns: number[]

  accruedDistance: number
  projectedDistance: number
  remainingDistance: number
}

export interface FutureWeek {
  start: DateTime

  projectedDistance: number

  asThreeRuns: number[]
}

export interface Plan {
  currentWeek: CurrentWeek
  pastWeeks: PastWeek[]
  futureWeeks: FutureWeek[]
}

const firstDayOfWeek = (run: RunSummary): string => {
  return run.startTime.startOf('week').toISO()
}

const addMissingWeeks = (planOutTo: DateTime, incomplete) => {
  const dates = Z.getCol('group', incomplete) as any as string[]
  const start = DateTime.fromISO(dates[0])
  const incompleteFinish = DateTime.fromISO(dates[dates.length - 1])
  const planOutToFinish = planOutTo.startOf('week')
  const finish = (planOutToFinish > incompleteFinish) ? planOutToFinish : incompleteFinish

  const missing = []
  let cursor: DateTime = start
  while (cursor <= finish) {
    if (!dates.includes(cursor.toISO())) {
      missing.push({group: cursor.toISO(), sum: 0})
    }
    cursor = cursor.plus({weeks: 1})
  }

  return Z.concat(incomplete, missing)
}

// TODO: enhance to work with weeks w/ 0 accrued
const computeProjectedDistance = (weeklyGain: number) => (accruedDistances) => {
  if (accruedDistances.length >= 2) {
    const previousAccrued = accruedDistances[accruedDistances.length - 2]
    return previousAccrued * weeklyGain
  } else {
    return 0
  }
}

const computeThreeRunApproach = (weeklyGain: number) => (row: {projectedDistance: number}) => {
  const perRunGain = Math.pow(weeklyGain, 1 / 3)
  const { projectedDistance } = row
  const baseDistance = projectedDistance / (1 + perRunGain + Math.pow(perRunGain, 2))

  return [
    baseDistance,
    baseDistance * perRunGain,
    baseDistance * Math.pow(perRunGain, 2)
  ]
}

const computeRemainingRuns = (weeklyGain: number) => (row: {projectedDistance: number, remainingDistance: number, accruedRuns: number[]}) => {
  const { accruedRuns, remainingDistance } = row
  const numRemaining = 3 - accruedRuns.length
  const perRunGain = Math.pow(weeklyGain, 1 / 3)

  switch(numRemaining) {
    case 0:
      // no more runs remaining
      return []

    case 1:
      // just run the entire remaining distance
      return [remainingDistance]

    case 2:
      const baseDistance = remainingDistance / (1 + perRunGain)
      return [
        baseDistance,
        baseDistance * perRunGain,
      ]

    case 3:
      // all three runs remain
      return computeThreeRunApproach(weeklyGain)(row)

    default:
      throw new Error('Unexpected number of runs remaining')
  }
}

const projectFutureWeeks = (current: CurrentWeek, weeklyGain: number, weeksProjected: number) => {
  // determine future week start dates
  // TODO: make less mutation-y
  const withProjectedDistance = []
  for (let i = 1; i <= weeksProjected; i++) {
    withProjectedDistance.push({
      start: current.start.plus({weeks: i}),
      projectedDistance: current.projectedDistance * Math.pow(weeklyGain, i),
    })
  }

  const threeRuns = Z.deriveCol(computeThreeRunApproach(weeklyGain), withProjectedDistance)
  const withThreeRuns = Z.addCol('asThreeRuns', threeRuns, withProjectedDistance)

  return withThreeRuns
}

export const computePlan = (weeklyDistanceGain: number, weeksProjected: number, now: DateTime, runs: RunSummary[]): Plan => {
  const weeklyGain: number = weeklyDistanceGain + 1.0

  const byWeeks = Z.groupBy(firstDayOfWeek, runs)
  const distanceByWeek = Z.gbSum('totalDistance', byWeeks)
  const distanceByAllWeeks = addMissingWeeks(now, distanceByWeek)

  // Get actual run distances
  const actualRuns = {}
  Object.entries(byWeeks).forEach(keyValue => {
    const start: string = keyValue[0]
    const rs: RunSummary[] = keyValue[1] as RunSummary[]
    actualRuns[start] = rs.map(r => r.totalDistance)
  })

  const weeks = distanceByAllWeeks.map((row: any) => {
    return {
      start: DateTime.fromISO(row.group),
      accruedDistance: row.sum,
      accruedRuns: actualRuns[row.group] || []
    }
  })
  const sortedWeeks = Z.sortByCol('start', 'asc', weeks)

  // Calculate projected from previous weeks accrued
  const accruedDistance = Z.getCol('accruedDistance', sortedWeeks)
  const shiftedProjected = Z.cumulative(computeProjectedDistance(weeklyGain), accruedDistance) as number[]
  const withProjected = Z.addCol('projectedDistance', shiftedProjected, sortedWeeks)

  // Calculate remaining distance
  const remainingDistance = Z.deriveCol((row: any) => row.projectedDistance - row.accruedDistance, withProjected)
  const withRemaining = Z.addCol('remainingDistance', remainingDistance, withProjected)

  // All current runs captured here
  const allWeeks = Z.sortByCol('start', 'desc', withRemaining)

  const currentWeek: any = Z.head(1, allWeeks)[0]
  const pastWeeks = Z.tail(allWeeks.length - 1, allWeeks)

  // TODO: make this less mutation-y
  currentWeek.asThreeRuns = computeThreeRunApproach(weeklyGain)(currentWeek)
  currentWeek.remainingRuns = computeRemainingRuns(weeklyGain)(currentWeek)

  // Show latest week first
  return {
    currentWeek: currentWeek as CurrentWeek,
    pastWeeks: pastWeeks as PastWeek[],
    futureWeeks: projectFutureWeeks(currentWeek, weeklyGain, weeksProjected) as FutureWeek[],
   }
}
