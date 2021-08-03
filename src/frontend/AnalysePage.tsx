import React from 'react'
import axios from 'axios'
import { DateTime } from 'luxon'
import { ResponsiveLine } from '@nivo/line'

import { DistanceValue, GainValue, WeeklyRange } from './ValueDisplaying'

const parseAnalysis = ({byWeek, byDay}) => {
  return {
    byWeek: byWeek.map(bw => { return { ...bw, start: DateTime.fromISO(bw.start)} }),
    byDay: byDay.map(d => { return { ...d, date: DateTime.fromISO(d.date)} }),
  }
}

const parseEfforts = ({efforts}) => {
  return efforts
}

const NivoLineByDayChart = ({ byDay }) => {
  const data = [
    {
      id: 'runDistance',
      data: byDay
        .filter(({ totalDistance }) => totalDistance !== null)
        .map(({ date, totalDistance }) => { return { x: date.toFormat('yyyy-MM-dd'), y: totalDistance }}),
    },
  ]

  const yFormat = (value) => {
    const numeral = (value / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    return `${numeral} km`
  }

  const xFormat = (date) => {
    const format = 'LLL dd'
    // Timezone info is messed up from the chart, so set to UTC so time value is correct
    const start = DateTime.fromJSDate(date).toUTC()
    return `${start.toFormat(format)}`
  }

  return (
    <div>
      <div style={{height: 500}}>
        <ResponsiveLine
            data={data}
            // enableLabel={true}
            isInteractive={true}
            useMesh={true}
            margin={{ top: 10, right: 15, bottom: 35, left: 65 }}
            xScale={{type: 'time', format: '%Y-%m-%d'}}
            xFormat={xFormat}
            yFormat={yFormat}
            colors={['#9b4dca']}
            axisTop={null}
            axisRight={null}
            axisBottom={{legendPosition: 'middle', legendOffset: 32, format: '%b %d'}}
            axisLeft={{format: (v) => `${v/1000} km`, legendPosition: 'middle', legendOffset: -60}}
        />
      </div>
    </div>
  )
}

export const AnalysePage = () => {
  const [efforts, setEfforts] = React.useState(null)
  const [selectedEffort, setSelectedEffort] = React.useState(undefined)

  const [analysis, setAnalysis] = React.useState(null)

  React.useEffect(() => {
    axios.get(`/api/efforts`)
      .then(response => {
        const result = parseEfforts(response.data)
        setEfforts(result)

        if (result.some((effort) => effort.id === 'current')) {
          setSelectedEffort('current')
        }
      })
  }, [])

  React.useEffect(() => {
    if (selectedEffort) {
      axios.get(`/api/efforts/${selectedEffort}/analyse`)
        .then(response => {
          setAnalysis(parseAnalysis(response.data))
        })
    }
  }, [selectedEffort])

  if (!analysis) {
    return (
      <></>
    )
  }

  const { byWeek, byDay } = analysis

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

  const renderEffortSelector = () => {
    const optionData = efforts === null
      ? []
      : efforts.map(({id}) => [id, id])

    const options = optionData.map(
      ([value, text]) => <option key={value} value={value}>{text}</option>
    )

    return (
      <>
        <label htmlFor="selectedEffort">Effort</label>
        <select id="selectedEffort" value={selectedEffort} onChange={(e) => setSelectedEffort(e.target.value)}>
          {options}
        </select>
      </>
    )
  }

  return (
    <div className='container'>
      <h3>Analyse</h3>
      {renderEffortSelector()}
      <h4>By Week</h4>
      {renderByWeek()}
      <h4>By Day</h4>
      <NivoLineByDayChart byDay={byDay} />
    </div>
  )
}
