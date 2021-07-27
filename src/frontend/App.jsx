import React from 'react'
import axios from 'axios'
import {DateTime, Duration} from 'luxon'
import {Link, NavLink, Route, Switch, useParams} from 'react-router-dom'
import L from 'leaflet'
import {MapContainer, TileLayer, Polyline} from 'react-leaflet'
import {ResponsiveLine} from '@nivo/line'

//
// Configure leaflet
// https://github.com/PaulLeCam/react-leaflet/issues/453#issuecomment-761806673
//
delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

//
// Styling
//
import 'leaflet/dist/leaflet.css'
import 'milligram/dist/milligram.css'

//
// Core utilties
//

// https://stackoverflow.com/a/22015930
const zip = (a, b) => a.map((k, i) => [k, b[i]]);

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

const parsePlan = ({currentWeek, pastWeeks, futureWeeks}) => {
  return {
    currentWeek: {...currentWeek, start: DateTime.fromISO(currentWeek.start)},
    pastWeeks: pastWeeks.map(w => { return { ...w, start: DateTime.fromISO(w.start) }}),
    futureWeeks: futureWeeks.map(w => { return { ...w, start: DateTime.fromISO(w.start) }}),
  }
}

const parseAnalysis = ({byWeek}) => {
  return {
    byWeek: byWeek.map(bw => { return { ...bw, start: DateTime.fromISO(bw.start)} }),
  }
}

//
// Measurements
//
const DistanceValue = ({value}) => {
  const numeral = (value / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
  return (`${numeral} km`)
}

const DistancesValues = ({values}) => {
  if (values.length === 0) {
    return (
      'none'
    )
  } else {
    return values.map((value, index) => {
      return (
        <span key={index}>
          <DistanceValue value={value} />
          {(index != values.length - 1) ? ', ' : ''}
        </span>
      )
    })
  }
}

const PartiallyCompletedRuns = ({completed, remaining}) => {
  const runs = []
    .concat(completed.map(distance => { return { distance: distance, icon: '✅'}}))
    .concat(remaining.map(distance => { return { distance: distance, icon: '⏱️'}}))

    if (runs.length === 0) {
      return (
        'none'
      )
    } else {
      return runs.map(({distance, icon}, index) => {
        return (
          <span key={index}>
            {icon}&nbsp;
            <DistanceValue value={distance} />
            {(index != runs.length - 1) ? ', ' : ''}
            &nbsp;
          </span>
        )
      })
    }
}

const DurationValue = ({value}) => {
  const duration = Duration.fromObject({seconds: value})
  return (duration.toFormat('m:ss'))
}

const GainValue = ({value}) => {
  if (value === null) {
    return '-'
  }

  const numeral = (value * 100).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})
  return `${numeral} %`
}

const PaceValue = ({speedValue}) => {
  const pace = 1 / (speedValue * 60 / 1000)
  const formatted = Duration.fromObject({minutes: pace})
  return `${formatted.toFormat('m:ss')} /km`
}

const WeeklyRange = ({date}) => {
  const format = 'LLL d'
  const start = date.startOf('week')
  const end = date.endOf('week')
  return `${start.toFormat(format)} - ${end.toFormat(format)}`
}

//
// Pages
//
const RunListPage = () => {
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

const NivoRunDetailLineChart = ({ title, xData, yData }) => {
  const data = zip(xData, yData).map(([x, y]) => { return { x, y }})
  return (
    <div>
      <h4>{title}</h4>
      <div style={{height: 200}}>
        <ResponsiveLine
          data={[ {id: 'something', data} ]}
          curve='natural'

          xScale={{ type: 'linear' }}
          yScale={{ type: 'linear', min: 'auto' }}

          enableLabel={true}
          isInteractive={true}
          useMesh={true}

          margin={{ top: 5, right: 10, bottom: 35, left: 50 }}
          colors={['#9b4dca']}
          pointSize={0}

          axisTop={null}
          axisRight={null}
          axisBottom={{legendPosition: 'middle', legendOffset: 32}}
          axisLeft={{legendPosition: 'middle', legendOffset: -60}}
        />
      </div>
    </div>
  )
}

const RunDetailsPage = () => {
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
      <></>
    )
  }

  const summary = details.summary

  const lineOptions = { color: 'red' }

  return (
    <div className="container">
      <div>
        <h2>{id}</h2>
        <span>
          {summary.startTime.toFormat("h:mm a 'on' cccc, LLLL d, yyyy")}
        </span>
      </div>
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
      <MapContainer zoom={13} bounds={details.details.location} scrollWheelZoom={false} style={{height: '600', marginBottom: '20'}}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline pathOptions={lineOptions} positions={details.details.location} />
      </MapContainer>
      <NivoRunDetailLineChart
        title='Speed'
        xData={details.details.distance}
        yData={details.details.speed}
      />
      <NivoRunDetailLineChart
        title='Heart Rate'
        xData={details.details.distance}
        yData={details.details.hrt}
      />
    </div>
  )
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

const PlanDetailsPage = () => {
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

const AnalysePage = () => {
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

//
// App
//
const NavigationBar = () => {
  return (
    <header>
      <nav className='container'>
        <NavLink to='/' className="button button-clear">Runs</NavLink>
        <NavLink to='/plan' className="button button-clear">Plan</NavLink>
        <NavLink to='/analyse' className="button button-clear">Analyse</NavLink>
      </nav>
    </header>
  )
}

const App = () => {
  return (
    <>
      <NavigationBar />
      <Switch>
        <Route path="/plan">
          <PlanDetailsPage />
        </Route>
        <Route path="/analyse">
          <AnalysePage />
        </Route>
        <Route path="/runs/:id">
          <RunDetailsPage />
        </Route>
        <Route path="/">
          <RunListPage />
        </Route>
      </Switch>
    </>
  )
}

export default App
