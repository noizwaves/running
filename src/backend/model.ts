export type RunId = string

export interface RunSummary {
  startTime: typeof DateTime
  totalDistance: number
  totalTime: number
  avgHeartRate: number
  avgSpeed: number
  avgCadence: number
}

export interface RunDetails {
  timestamp: any;
  location: any;
  distance: any;
  speed: any;
  hrt: any;
  cadence: any;
}

export interface RunCollection {
  getSummaries: () => Promise<RunSummary[]>;
  getDetails: (id: RunId) => Promise<{details: RunDetails, summary: RunSummary}>;
}