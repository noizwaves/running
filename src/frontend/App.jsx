import React from 'react'
import axios from 'axios'
import {DateTime, Duration} from 'luxon'
import {Link, Route, Switch, useParams} from 'react-router-dom'

//
// Response parsing
//
const parseRunDetails = (raw) => {
  return {
    ...raw,
    summary: {
      ...raw.summary,
      startTime: DateTime.fromISO(raw.summary.startTime)
    },
  }
}

const parseRuns = (raw) => {
  return raw.map(rawRun => {
    return {
      ...rawRun,
      startTime: DateTime.fromISO(rawRun.startTime)
    }
  })
}

//
// Measurements
//
const DistanceValue = ({value}) => {
  const numeral = (value / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
  return (`${numeral} km`)
}

const DurationValue = ({value}) => {
  const duration = Duration.fromObject({seconds: value})
  return (duration.toFormat('m:ss'))
}

const PaceValue = ({speedValue}) => {
  const pace = 1 / (speedValue * 60 / 1000)
  const formatted = Duration.fromObject({minutes: pace})
  return `${formatted.toFormat('m:ss')} /km`
}

//
// Pages
//
const RunList = () => {
  const [runs, setRuns] = React.useState([])

  React.useEffect(() => {
    axios.get('/api/runs')
      .then(response => {
        setRuns(parseRuns(response.data.runs))
      })
  }, [])

  const renderDuration = (totalTime) => {
    const duration = Duration.fromObject({seconds: totalTime})
    return duration.toFormat('mm:ss')
  }

  const renderRunRows = () => {
    return runs.map((run) => {
      return (
        <tr key={run.id}>
          <td>
            <Link to={`/runs/${run.id}`}>{run.startTime.toFormat('ccc, M/d/yyyy')}</Link>
          </td>
          <td><DurationValue value={run.totalTime} /></td>
          <td><DistanceValue value={run.totalDistance} /></td>
        </tr>
      )
    })
  }

  const renderRuns = () => {
    return (
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Distance</th>
          </tr>
        </thead>
        <tbody>
          {renderRunRows()}
        </tbody>
      </table>
    )
  }

  return (
    <div>
      {renderRuns()}
    </div>
  )
}

const RunDetails = () => {
  const { id } = useParams()
  const [details, setDetails] = React.useState(null)

  React.useEffect(() => {
    axios.get(`/api/runs/${id}`)
      .then(response => {
        setDetails(parseRunDetails(response.data))
      })
  }, [])

  if (!details) {
    return (
      <div>Loading...</div>
    )
  }

  const summary = details.summary

  return (
    <div>
      <h2>{id}</h2>
      <span>
        {summary.startTime.toFormat("h:mm a 'on' cccc, LLLL d, yyyy")}
      </span>
      <dl>
        <dt>Distance</dt>
        <dd><DistanceValue value={summary.totalDistance} /></dd>
        <dt>Time</dt>
        <dd><DurationValue value={summary.totalTime} /></dd>
        <dt>Pace</dt>
        <dd><PaceValue speedValue={summary.avgSpeed} /></dd>
        <dt>Heart Rate</dt>
        <dd>{summary.avgHeartRate}</dd>
        <dt>Cadence</dt>
        <dd>{summary.avgCadence}</dd>
      </dl>
    </div>
  )
}

const App = () => {
  return (
    <Switch>
      <Route path="/runs/:id">
        <RunDetails></RunDetails>
      </Route>
      <Route path="/">
        <RunList></RunList>
      </Route>
    </Switch>
  )
}

export default App
