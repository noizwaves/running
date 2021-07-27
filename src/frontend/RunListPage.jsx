import React from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { DateTime } from 'luxon'

import { DistanceValue, DurationValue, PaceValue } from './ValueDisplaying'

const parseRuns = (raw) => {
  return raw.map(rawRun => {
    return {
      ...rawRun,
      startTime: DateTime.fromISO(rawRun.startTime)
    }
  })
}

export const RunListPage = () => {
  const [runs, setRuns] = React.useState(null)

  React.useEffect(() => {
    axios.get('/api/runs')
      .then(response => {
        setRuns(parseRuns(response.data.runs))
      })
  }, [])

  if (!runs) {
    return (
      <></>
    )
  }

  const renderRunRows = () => {
    return runs.map((run) => {
      return (
        <tr key={run.id}>
          <td>
            <Link to={`/runs/${run.id}`}>{run.startTime.toFormat('ccc, M/d/yyyy')}</Link>
          </td>
          <td><DistanceValue value={run.totalDistance} /></td>
          <td>{run.avgCadence}</td>
          <td><DurationValue value={run.totalTime} /></td>
          <td><PaceValue speedValue={run.avgSpeed} /></td>
          <td>{run.avgHeartRate}</td>
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
            <th>Distance</th>
            <th>Cadence</th>
            <th>Time</th>
            <th>Pace</th>
            <th>Heart Rate</th>
          </tr>
        </thead>
        <tbody>
          {renderRunRows()}
        </tbody>
      </table>
    )
  }

  return (
    <div className="container">
      <h3>Runs</h3>
      {renderRuns()}
    </div>
  )
}
