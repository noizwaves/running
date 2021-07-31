import { DateTime } from 'luxon'

import { Plan, RunSummary } from '../../src/backend/model'
import { computePlan } from '../../src/backend/plan'

const simpleDate = (year: number, month: number, day: number): DateTime => {
  return DateTime.fromObject({
    year,
    month,
    day,
    hour: 18,
  })
}

const simpleRun = (startTime: DateTime, totalDistance: number, totalTime: number): RunSummary => {
  return {
    startTime,
    totalDistance,
    totalTime,
    avgHeartRate: 130,
    avgSpeed: 5,
    avgCadence: 180,
  }
}

describe('planning', () => {
  const someWednesday = simpleDate(2021, 7, 21)

  const runs: RunSummary[] = [
    simpleRun(simpleDate(2021, 7, 14), 100, 50),
    simpleRun(simpleDate(2021, 7, 15), 120, 60),
    simpleRun(simpleDate(2021, 7, 16), 140, 70),
  ]

  test('it projects distance based upon previous weekly volume and a gain factor', () => {
    const result: Plan = computePlan(0.1, 2, someWednesday, runs)


    expect(result.currentWeek.start).toEqual(DateTime.fromISO('2021-07-19T00:00:00.000'))
    expect(result.currentWeek.projectedDistance).toBeCloseTo(396)

    expect(result.futureWeeks[0].start).toEqual(DateTime.fromISO('2021-07-26T00:00:00.000'))
    expect(result.futureWeeks[0].projectedDistance).toBeCloseTo(435.6)

    expect(result.futureWeeks[1].start).toEqual(DateTime.fromISO('2021-08-02T00:00:00.000'))
    expect(result.futureWeeks[1].projectedDistance).toBeCloseTo(479.16)
  })

  test('it projects individual run distances', () => {
    const result: Plan = computePlan(0.1, 1, someWednesday, runs)


    expect(result.currentWeek.asThreeRuns[0]).toBeCloseTo(127.83)
    expect(result.currentWeek.asThreeRuns[1]).toBeCloseTo(131.96)
    expect(result.currentWeek.asThreeRuns[2]).toBeCloseTo(136.22)

    expect(result.futureWeeks[0].asThreeRuns[0]).toBeCloseTo(140.61)
    expect(result.futureWeeks[0].asThreeRuns[1]).toBeCloseTo(145.15)
    expect(result.futureWeeks[0].asThreeRuns[2]).toBeCloseTo(149.84)
  })

  test('it includes existing runs in current week plan', () => {
    const withExtraRuns = runs.concat([
      simpleRun(simpleDate(2021, 7, 20), 128, 65)
    ])


    const result: Plan = computePlan(0.1, 1, someWednesday, withExtraRuns)


    expect(result.currentWeek.projectedDistance).toBeCloseTo(396)
    expect(result.currentWeek.accruedDistance).toBeCloseTo(128)
    expect(result.currentWeek.remainingDistance).toBeCloseTo(268)

    expect(result.currentWeek.accruedRuns[0]).toBeCloseTo(128)
    expect(result.currentWeek.remainingRuns[0]).toBeCloseTo(131.87)
    expect(result.currentWeek.remainingRuns[1]).toBeCloseTo(136.13)
  })
})
