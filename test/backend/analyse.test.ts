import { DateTime } from 'luxon'

import { Analysis, RunSummary } from '../../src/backend/model'
import { computeAnalysis } from '../../src/backend/analyse'

const simpleRun = (month: number, day: number, distance: number, time: number): RunSummary => {
  return {
    startTime: DateTime.fromObject({year: 2021, month, day, hour: 18}),
    totalDistance: distance,
    totalTime: time,
    avgHeartRate: 130,
    avgSpeed: 5,
    avgCadence: 180,
  }
}

describe('analysing', () => {
  it('performs week by week analysis', () => {
    const runs: RunSummary[] = [
      simpleRun(7, 14, 0.5, 180),
      simpleRun(7, 21, 1.0, 360),
      simpleRun(7, 28, 1.5, 540),
    ]

    const analysis: Analysis = computeAnalysis(runs)

    expect(analysis).not.toBeNull()
    expect(analysis.byWeek).toEqual([
      {
        start: DateTime.fromObject({year: 2021, month: 7, day: 26}),
        totalDistance: 1.5,
        distanceGain: 0.5,
      },
      {
        start: DateTime.fromObject({year: 2021, month: 7, day: 19}),
        totalDistance: 1.0,
        distanceGain: 1.0,
      },
      {
        start: DateTime.fromObject({year: 2021, month: 7, day: 12}),
        totalDistance: 0.5,
        distanceGain: null,
      },
    ])
  })

  it('handles no-run weeks', () => {
    const runs: RunSummary[] = [
      simpleRun(7, 14, 0.5, 180),
      simpleRun(7, 28, 1.5, 540),
    ]

    const analysis: Analysis = computeAnalysis(runs)

    expect(analysis).not.toBeNull()
    expect(analysis.byWeek).toEqual([
      {
        start: DateTime.fromObject({year: 2021, month: 7, day: 26}),
        totalDistance: 1.5,
        distanceGain: null,
      },
      {
        start: DateTime.fromObject({year: 2021, month: 7, day: 19}),
        totalDistance: 0.0,
        distanceGain: -1.0,
      },
      {
        start: DateTime.fromObject({year: 2021, month: 7, day: 12}),
        totalDistance: 0.5,
        distanceGain: null,
      },
    ])
  })

  it('performs day by day analysis', () => {
    const runs: RunSummary[] = [
      simpleRun(7, 14, 0.5, 180),
      simpleRun(7, 15, 1.0, 360),
      simpleRun(7, 16, 1.5, 540),
    ]

    const analysis: Analysis = computeAnalysis(runs)

    expect(analysis).not.toBeNull()
    expect(analysis.byDay).toEqual([
      {
        date: DateTime.fromObject({year: 2021, month: 7, day: 16}),
        totalDistance: 1.5,
      },
      {
        date: DateTime.fromObject({year: 2021, month: 7, day: 15}),
        totalDistance: 1.0,
      },
      {
        date: DateTime.fromObject({year: 2021, month: 7, day: 14}),
        totalDistance: 0.5,
      },
    ])
  })

  it('handles no-run days', () => {
    const runs: RunSummary[] = [
      simpleRun(7, 15, 1.0, 360),
      simpleRun(7, 17, 1.5, 540),
    ]

    const analysis: Analysis = computeAnalysis(runs)

    expect(analysis).not.toBeNull()
    expect(analysis.byDay).toEqual([
      {
        date: DateTime.fromObject({year: 2021, month: 7, day: 17}),
        totalDistance: 1.5,
      },
      {
        date: DateTime.fromObject({year: 2021, month: 7, day: 16}),
        totalDistance: null,
      },
      {
        date: DateTime.fromObject({year: 2021, month: 7, day: 15}),
        totalDistance: 1.0,
      },
    ])
  })
})
