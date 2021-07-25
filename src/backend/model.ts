type RunId = string

interface RunSummary {
  startTime: typeof DateTime
  totalDistance: number
  totalTime: number
  avgHeartRate: number
  avgSpeed: number
  avgCadence: number
}

interface RunDetails {
  timestamp: any;
  location: any;
  distance: any;
  speed: any;
  hrt: any;
  cadence: any;
}

interface RunCollection {
  getSummaries: () => Promise<RunSummary[]>;
  getDetails: (id: RunId) => Promise<{details: RunDetails, summary: RunSummary}>;
}
