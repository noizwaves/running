import express from 'express'
import path from 'path'
import { DateTime}  from 'luxon'

import { RunCollection, Analysis, Plan } from './model'
import { makeRunCollection } from './persistence'
import { computePlan } from './plan'
import { computeAnalysis } from './analyse'

//
// Application
//
const buildApplication = ({runsRootPath}) => {
  const runCollection: RunCollection = makeRunCollection(runsRootPath)

  const app = express()

  app.get('/api/runs/:id', async (req, res) => {
    const { id } = req.params

    const { details, summary } = await runCollection.getDetails(id)

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({id, details, summary}))
  })

  app.get('/api/runs', async (req, res) => {
    const runs = await runCollection.getSummaries()

    runs.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis()).reverse()

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({runs: runs}))
  })

  app.get('/api/plan', async (req, res) => {
    // Parse request parameters
    const weeksProjected: number = parseInt(req.query.projectForwardWeeks as string)
    const weeklyDistanceGain: number = parseFloat(req.query.weeklyDistanceGain as string)

    const runs = await runCollection.getSummaries()

    // Compute the plan
    const plan: Plan = computePlan(weeklyDistanceGain, weeksProjected, DateTime.now(), runs)

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(plan))
  })

  app.get('/api/analyse', async (req, res) => {
    const runs = await runCollection.getSummaries()
    const analysis: Analysis = computeAnalysis(DateTime.now(), runs)

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(analysis))
  })

  app.use('/', express.static(path.join(__dirname, '../../dist/frontend/')))
  app.use('/*', express.static(path.join(__dirname, '../../dist/frontend/index.html')))

  return app
}


//
// Configuration
//
const PORT = process.env.PORT || 3000;
const runsRootPath = path.resolve(process.env.RUNS_ROOT_PATH || 'fixtures/runs')


//
// Bootstrap the application
//
const app = buildApplication({runsRootPath})

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`)
})
