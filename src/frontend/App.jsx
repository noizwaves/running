import React from 'react'
import { NavLink, Route, Switch } from 'react-router-dom'
import L from 'leaflet'

import { AnalysePage } from './AnalysePage'
import { PlanDetailsPage } from './PlanDetailsPage'
import { RunDetailsPage } from './RunDetailsPage'
import { RunListPage } from './RunListPage'

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
