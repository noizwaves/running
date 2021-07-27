import React from 'react'
import axios from 'axios'
import {DateTime} from 'luxon'

import { DistanceValue, GainValue, WeeklyRange } from './ValueDisplaying'

const parseAnalysis = ({byWeek}) => {
  return {
    byWeek: byWeek.map(bw => { return { ...bw, start: DateTime.fromISO(bw.start)} }),
  }
}

export const AnalysePage = () => {
  const [analysis, setAnalysis] = React.useState(null)

  React.useEffect(() => {
    axios.get(`/api/analyse`)
      .then(response => {
        setAnalysis(parseAnalysis(response.data))
      })
  }, [])

  if (!analysis) {
    return (
      <></>
    )
  }

  const { byWeek } = analysis

  const renderByWeekRows = () => {
    return byWeek.map((week, index) => {
      return (
        <tr key={index}>
          <td>
            <WeeklyRange date={week.start} />
          </td>
          <td>
            <DistanceValue value={week.totalDistance} />
          </td>
          <td>
            <GainValue value={week.distanceGain} />
          </td>
        </tr>
      )
    })
  }

  const renderByWeek = () => {
    return (
      <table>
        <thead>
          <tr>
            <th>Week</th>
            <th>Total Distance</th>
            <th>Distance Gain</th>
          </tr>
        </thead>
        <tbody>
          {renderByWeekRows()}
        </tbody>
      </table>
    )
  }

  return (
    <div className='container'>
      <h3>Analyse</h3>
      <h4>By Week</h4>
      {renderByWeek()}
    </div>
  )
}
