import React from 'react'
import axios from 'axios'
import {DateTime, Duration} from 'luxon'

const parseRuns = (raw) => {
  return raw.map(rawRun => {
    return {
      ...rawRun,
      startTime: DateTime.fromISO(rawRun.startTime)
    }
  })
}

const App = () => {
  const [runs, setRun] = React.useState([])

  React.useEffect(() => {
    axios.get('/api/runs')
      .then(response => {
        setRun(parseRuns(response.data.runs))
      })
  }, [])

  const renderDistance = (totalDistance) => {
    const numeral = (totalDistance / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    return `${numeral} km`
  }

  const renderDuration = (totalTime) => {
    const duration = Duration.fromObject({seconds: totalTime})
    return duration.toFormat('mm:ss')
  }

  const renderRunRows = () => {
    return runs.map((run) => {
      return (
        <tr key={run.id}>
          <td>{run.startTime.toFormat('ccc, M/d/yyyy')}</td>
          <td>{renderDuration(run.totalTime)}</td>
          <td>{renderDistance(run.totalDistance)}</td>
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

export default App
