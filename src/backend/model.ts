import { DateTime}  from 'luxon'

export type RunId = string

export interface RunSummary {
  /** When the run started */
  startTime: DateTime

  /** Distance of the run (in meters) */
  totalDistance: number

  /** Duration of the run (in seconds) */
  totalTime: number

  /** Average heart rate for the run (in beats per minute) */
  avgHeartRate: number | null

  /** Average speed of the run (in m/s) */
  avgSpeed: number

  /** Average cadence of the run (in steps per minute) */
  avgCadence: number | null
}

export interface RunDetails {
  timestamp: any
  location: any
  distance: any
  speed: any
  hrt: any
  cadence: any
}

export interface RunCollection {
  getSummaries: () => Promise<RunSummary[]>
  getDetails: (id: RunId) => Promise<{details: RunDetails, summary: RunSummary}>
}

// Planning
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

// Analysing
export interface ByWeekAnalysis {
  start: DateTime
  totalDistance: number

  // The percentage increase in total distance on previous week
  distanceGain: number
}

export interface ByDayAnalysis {
  date: DateTime
  totalDistance: number
}

export interface Analysis {
  byWeek: ByWeekAnalysis[]
  byDay: ByDayAnalysis[]
}
