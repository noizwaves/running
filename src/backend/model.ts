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
  avgHeartRate: number

  /** Average speed of the run (in m/s) */
  avgSpeed: number

  /** Average cadence of the run (in steps per minute) */
  avgCadence: number
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
