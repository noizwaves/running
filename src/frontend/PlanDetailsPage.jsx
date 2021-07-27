import React from 'react'
import axios from 'axios'
import { DateTime } from 'luxon'
import { ResponsiveLine } from '@nivo/line'

import { DistanceValue, DistancesValues, PartiallyCompletedRuns, WeeklyRange } from './ValueDisplaying'


const parsePlan = ({currentWeek, pastWeeks, futureWeeks}) => {
  return {
    currentWeek: {...currentWeek, start: DateTime.fromISO(currentWeek.start)},
    pastWeeks: pastWeeks.map(w => { return { ...w, start: DateTime.fromISO(w.start) }}),
    futureWeeks: futureWeeks.map(w => { return { ...w, start: DateTime.fromISO(w.start) }}),
  }
}


const NivoLineWeeklyDistanceTotalChart = ({ actualData, projectedData }) => {
  const data = [
    {
      id: 'actual',
      data: actualData.map(({ date, distance }) => { return { x: date.toFormat('yyyy-MM-dd'), y: distance }}),
    },
    {
      id: 'projected',
      data: projectedData.map(({ date, distance }) => { return { x: date.toFormat('yyyy-MM-dd'), y: distance }})
    },
  ]

  const yFormat = (value) => {
    const numeral = (value / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
    return `${numeral} km`
  }

  const xFormat = (startOfWeekDate) => {
    const format = 'LLL d'

    // Timezone info is messed up from the chart, so set to UTC so time value is correct
    const start = DateTime.fromJSDate(startOfWeekDate).toUTC()
    const end = start.endOf('week')

    return `${start.toFormat(format)} - ${end.toFormat(format)}`
  }

  return (
    <div>
      <h4>Weekly Total Distance</h4>
      <div style={{height: 500}}>
        <ResponsiveLine
            data={data}
            enableLabel={true}
            isInteractive={true}
            useMesh={true}
            margin={{ top: 10, right: 60, bottom: 35, left: 65 }}
            xScale={{type: 'time', format: '%Y-%m-%d'}}
            xFormat={xFormat}
            yFormat={yFormat}
            colors={['#9b4dca', '#ccc']}
            axisTop={null}
            axisRight={null}
            axisBottom={{legendPosition: 'middle', legendOffset: 32, format: '%b %d'}}
            axisLeft={{format: (v) => `${v/1000} km`, legendPosition: 'middle', legendOffset: -60}}
        />
      </div>
    </div>
  )
}

export const PlanDetailsPage = () => {
  const [plan, setPlan] = React.useState(null)
  const [projectForwardWeeks, setProjectForward] = React.useState(26)
  const [weeklyDistanceGain, setWeeklyDistanceGain] = React.useState(0.1)

  React.useEffect(() => {
    axios.get(`/api/plan?projectForwardWeeks=${projectForwardWeeks}&weeklyDistanceGain=${weeklyDistanceGain}`)
      .then(response => {
        setPlan(parsePlan(response.data))
      })
  }, [projectForwardWeeks, weeklyDistanceGain])

  if (!plan) {
    return (
      <></>
    )
  }

  const { currentWeek, pastWeeks, futureWeeks } = plan
  const nextWeek = futureWeeks[0]

  const actualData = []
    .concat(pastWeeks.map(w => { return { date: w.start, distance: w.accruedDistance }}))
    .concat([{ date: currentWeek.start, distance: currentWeek.projectedDistance }])
  actualData.sort((a, b) => a.date - b.date)

  const projectedData = []
    .concat([{ date: currentWeek.start, distance: currentWeek.projectedDistance }])
    .concat(futureWeeks.map(w => { return { date: w.start, distance: w.projectedDistance}}))
  projectedData.sort((a, b) => a.date - b.date)

  const renderProjectForwardWeeks = () => {
    const optionData = [
      [13, '3 months'],
      [26, '6 months'],
      [39, '9 months'],
      [52, '12 months'],
    ]

    const options = optionData.map(
      ([value, text]) => <option key={value} value={value}>{text}</option>
    )

    return (
      <>
        <label htmlFor="projectForwardWeeks">Project Forward (Weeks)</label>
        <select id="projectForwardWeeks" value={projectForwardWeeks} onChange={(e) => setProjectForward(e.target.value)}>
          {options}
        </select>
      </>
    )
  }

  const renderWeeklyDistanceGain = () => {
    const optionData = [
      [0.1, '10%'],
      [0.331, '33.1%'],
    ]

    const options = optionData.map(
      ([value, text]) => <option key={value} value={value}>{text}</option>
    )

    return (
      <>
        <label htmlFor="weeklyDistanceGain">Weekly Distance Gain</label>
        <select id="weeklyDistanceGain" value={weeklyDistanceGain} onChange={(e) => setWeeklyDistanceGain(e.target.value)}>
          {options}
        </select>
      </>
    )
  }

  const renderNextRun = () => {
    if (currentWeek.remainingRuns.length > 0) {
      const nextRun = currentWeek.remainingRuns[currentWeek.remainingRuns.length - 1]
      return (
        <span><DistanceValue value={nextRun} /> this week</span>
      )
    } else {
      const nextRun = nextWeek.asThreeRuns[0]
      return (
        <span><DistanceValue value={nextRun} /> next week</span>
      )
    }
  }

  return (
    <div className="container">
      <h3>Plan</h3>
      <div className="row">
        <div className="column">
          <h4>Next run</h4>
          <p>
            {renderNextRun()}
          </p>
        </div>
      </div>
      <div className="row">
        <div className="column">
          <h4>Current Week (<WeeklyRange date={currentWeek.start} />)</h4>
          <dl>
            <dt>Distance</dt>
            <dd>
              <DistanceValue value={currentWeek.accruedDistance} /> of{' '}
              <DistanceValue value={currentWeek.projectedDistance} />{' '}
              (<DistanceValue value={currentWeek.remainingDistance} /> remaining)
            </dd>
            <dt>Runs</dt>
            <dd>
              <PartiallyCompletedRuns completed={currentWeek.accruedRuns} remaining={currentWeek.remainingRuns} />
              </dd>
          </dl>
        </div>
        <div className="column">
          <h4>Next Week (<WeeklyRange date={nextWeek.start} />)</h4>
          <dl>
            <dt>Projected Distance</dt>
            <dd><DistanceValue value={nextWeek.projectedDistance} /></dd>
            <dt>As Three Runs</dt>
            <dd><DistancesValues values={nextWeek.asThreeRuns} /></dd>
          </dl>
        </div>
      </div>
      <NivoLineWeeklyDistanceTotalChart actualData={actualData} projectedData={projectedData} />
      <div className="row">
        <div className="column">
          <form>
            <fieldset>
              {renderProjectForwardWeeks()}
              {renderWeeklyDistanceGain()}
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  )
}
