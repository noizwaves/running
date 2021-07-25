import { DateTime } from 'luxon'

import { RunSummary } from '../../src/backend/model'
import { Plan, computePlan } from '../../src/backend/plan'

describe('planning', () => {
  test('it plans', () => {
    const someWednesday = DateTime.fromObject({
      year: 2021,
      month: 7,
      day: 21,
      hour: 18,
    })

    const runs: RunSummary[] = [{
      startTime: DateTime.fromObject({year: 2021, month: 7, day: 14, hour: 18}),
      totalDistance: 0.1,
      totalTime: 20,
      avgHeartRate: 130,
      avgSpeed: 5,
      avgCadence: 180,
    }]

    const result: Plan = computePlan(0.1, 26, someWednesday, runs)

    expect(result).not.toBeNull()
  })
})
