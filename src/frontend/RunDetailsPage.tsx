import React from 'react'
import axios from 'axios'
import { DateTime } from 'luxon'
import { useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Polyline } from 'react-leaflet'
import { ResponsiveLine } from '@nivo/line'

import { DistanceValue, DurationValue, PaceValue } from './ValueDisplaying'

// https://stackoverflow.com/a/22015930
const zip = (a, b) => a.map((k, i) => [k, b[i]]);

const parseRunDetails = (raw) => {
  return {
    ...raw,
    summary: {
      ...raw.summary,
      startTime: DateTime.fromISO(raw.summary.startTime)
    },
  }
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

          // enableLabel={true}
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

export const RunDetailsPage = () => {
  const { id } = useParams<{id: string}>()
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
