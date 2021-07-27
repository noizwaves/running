import React from 'react'
import { Duration } from 'luxon'

export const DistanceValue = ({value}) => {
  const numeral = (value / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
  return (`${numeral} km`)
}

export const DistancesValues = ({values}) => {
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

export const PartiallyCompletedRuns = ({completed, remaining}) => {
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

export const DurationValue = ({value}) => {
  const duration = Duration.fromObject({seconds: value})
  return (duration.toFormat('m:ss'))
}

export const GainValue = ({value}) => {
  if (value === null) {
    return '-'
  }

  const numeral = (value * 100).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})
  return `${numeral} %`
}

export const PaceValue = ({speedValue}) => {
  const pace = 1 / (speedValue * 60 / 1000)
  const formatted = Duration.fromObject({minutes: pace})
  return `${formatted.toFormat('m:ss')} /km`
}

export const WeeklyRange = ({date}) => {
  const format = 'LLL d'
  const start = date.startOf('week')
  const end = date.endOf('week')
  return `${start.toFormat(format)} - ${end.toFormat(format)}`
}
