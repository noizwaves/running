import express from 'express'
import path from 'path'
import { DateTime}  from 'luxon'

import { Analysis, Plan, EffortCollection, Effort, RunSummary } from './model'
import { makeEffortCollection } from './persistence'
import { computePlan } from './plan'
import { computeAnalysis } from './analyse'

//
// Application
//
const buildApplication = ({runsRootPath}) => {
  const effortCollection: EffortCollection = makeEffortCollection(runsRootPath)

  const app = express()

  app.get('/api/runs/:effortId/:id', async (req, res) => {
    const { effortId, id } = req.params

    const { details, summary } = await effortCollection.getDetails({id: effortId}, id)

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({id, details, summary}))
  })

  app.get('/api/runs', async (req, res) => {
    const current: Effort = await effortCollection.getCurrentEffort()
    const runs: RunSummary[] = await effortCollection.getSummaries(current)

    runs.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis()).reverse()

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({runs: runs}))
  })

  app.get('/api/plan', async (req, res) => {
    // Parse request parameters
    const weeksProjected: number = parseInt(req.query.projectForwardWeeks as string)
    const weeklyDistanceGain: number = parseFloat(req.query.weeklyDistanceGain as string)

    const current: Effort = await effortCollection.getCurrentEffort()
    const runs: RunSummary[] = await effortCollection.getSummaries(current)

    // Compute the plan
    const plan: Plan = computePlan(weeklyDistanceGain, weeksProjected, DateTime.now(), runs)

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(plan))
  })

  app.get('/api/efforts', async (req, res) => {
    const efforts: Effort[] = await effortCollection.getEfforts()
    const current: Effort = await effortCollection.getCurrentEffort()

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({current, efforts}))
  })

  app.get('/api/efforts/:id/analyse', async (req, res) => {
    const effort = { id: req.params.id as any as string }
    const runs = await effortCollection.getSummaries(effort)
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
