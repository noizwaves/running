const express = require('express')
const path = require('path')
const { DateTime } = require('luxon')
const { readdir } = require('fs').promises

const { RunDetails } = require('./model')
const { extractDetails, extractSummary } = require('./persistence')
const { Plan, computePlan } = require('./plan')

//
// Application
//
const buildApplication = ({runsRootPath}) => {
  const app = express()

  app.get('/api/runs/:id', async (req, res) => {
    const { id } = req.params
    const filePath = path.join(runsRootPath, id)

    const summary = await extractSummary(filePath)
    const details = await extractDetails(filePath)

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({id, filePath, details, summary}))
  })

  app.get('/api/runs', async (req, res) => {
    // TODO: capture file handling into a concept
    const runFilenames = await readdir(runsRootPath)

    const runs: any = await Promise.all(runFilenames.map(async (filename: string) => {
      const filePath = path.join(runsRootPath, filename)
      const summary = await extractSummary(filePath)
      return {
        ...summary,
        id: filename,
      }
    }))

    runs.sort((a, b) => a.startTime - b.startTime).reverse()

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({runs: runs}))
  })

  app.get('/api/plan', async (req, res) => {
    // Parse request parameters
    const weeksProjected: number = parseInt(req.query.projectForwardWeeks)
    const weeklyDistanceGain: number = parseFloat(req.query.weeklyDistanceGain)

    // Prepare input data for plan
    const runFilenames = await readdir(runsRootPath)
    const runs: any = await Promise.all(runFilenames.map(async (filename: string) => {
      const filePath = path.join(runsRootPath, filename)
      return await extractSummary(filePath)
    }))

    // Compute the plan
    const plan: typeof Plan = computePlan(weeklyDistanceGain, weeksProjected, DateTime.now(), runs)

    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify(plan))
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
