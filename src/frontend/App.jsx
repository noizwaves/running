import React from 'react'
import axios from 'axios'
import {DateTime, Duration} from 'luxon'
import {Link, NavLink, Route, Switch, useParams} from 'react-router-dom'
import L from 'leaflet'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import {FlexibleWidthXYPlot, XAxis, YAxis, HorizontalGridLines, LineSeries} from 'react-vis';

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
import 'react-vis/dist/style'
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
        <>
          <DistanceValue value={value} />
          {(index != values.length - 1) ? ', ' : ''}
        </>
      )
    })
  }
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
    <div className="container">
      <h3>Runs</h3>
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
      <MapContainer zoom={13} bounds={details.details.location} scrollWheelZoom={false} style={{height: '600'}}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline pathOptions={lineOptions} positions={details.details.location} />
      </MapContainer>
      <div style={{height: 200}}>
        <FlexibleWidthXYPlot height={200} getX={d => d[0]} getY={d => d[1]}>
          <HorizontalGridLines />
          <LineSeries data={zip(details.details.distance, details.details.speed)} />
          <XAxis />
          <YAxis />
        </FlexibleWidthXYPlot>
      </div>
      <div style={{height: 200}}>
        <FlexibleWidthXYPlot height={200} getX={d => d[0]} getY={d => d[1]}>
          <HorizontalGridLines />
          <LineSeries data={zip(details.details.distance, details.details.hrt)} />
          <XAxis />
          <YAxis />
        </FlexibleWidthXYPlot>
      </div>
    </div>
  )
}

const PlanDetails = () => {
  const [plan, setPlan] = React.useState(null)

  React.useEffect(() => {
    axios.get(`/api/plan`)
      .then(response => {
        setPlan(parsePlan(response.data))
      })
  }, [])

  if (!plan) {
    return (
      <div>Loading...</div>
    )
  }

  const { currentWeek, pastWeeks, futureWeeks } = plan

  const actualData = []
    .concat(pastWeeks.map(w => { return { date: w.start.toJSDate(), distance: w.accruedDistance }}))
    .concat([{ date: currentWeek.start.toJSDate(), distance: currentWeek.projectedDistance }])
  actualData.sort((a, b) => b.date - a.date)

  const projectedData = []
    .concat([{ date: currentWeek.start.toJSDate(), distance: currentWeek.projectedDistance }])
    .concat(futureWeeks.map(w => { return { date: w.start.toJSDate(), distance: w.projectedDistance}}))
  projectedData.sort((a, b) => b.date - a.date)

  return (
    <div class="container">
      <h3>Plan</h3>
      <div>
        <h4>Current Week</h4>
        <dl>
          <dt>Projected Distance</dt>
          <dd><DistanceValue value={currentWeek.projectedDistance} /></dd>
          <dt>As Three Runs</dt>
          <dd><DistancesValues values={currentWeek.asThreeRuns} /></dd>
          <dt>Accrued Runs</dt>
          <dd><DistancesValues values={currentWeek.accruedRuns} /></dd>
          <dt>Accrued Distance</dt>
          <dd><DistanceValue value={currentWeek.accruedDistance} /></dd>
          <dt>Remaining Distance</dt>
          <dd><DistanceValue value={currentWeek.remainingDistance} /></dd>
        </dl>
      </div>
      <div>
        <h4>Weekly Total Distance</h4>
        <div style={{height: 600}}>
          <FlexibleWidthXYPlot height={600} xType="time" getX={d => d.date} getY={d => d.distance}>
            <HorizontalGridLines />
            <LineSeries data={actualData} color='green' />
            <LineSeries data={projectedData} color='grey' strokeStyle='dashed' />
            <XAxis />
            <YAxis left='10' tickFormat={(v) => `${v/1000}km`} />
          </FlexibleWidthXYPlot>
        </div>
      </div>
    </div>
  )
}

const App = () => {
  return (
    <>
      <header>
        <nav class='container'>
          <NavLink to='/' className="button button-clear">Runs</NavLink>
          <NavLink to='/plan' className="button button-clear">Plan</NavLink>
        </nav>
      </header>
      <Switch>
        <Route path="/plan">
          <PlanDetails />
        </Route>
        <Route path="/runs/:id">
          <RunDetails></RunDetails>
        </Route>
        <Route path="/">
          <RunList></RunList>
        </Route>
      </Switch>
    </>
  )
}

export default App
