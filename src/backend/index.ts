const express = require('express')
const path = require('path')

//
// Application
//
const buildApplication = ({}) => {
  const app = express()

  app.get('/hello', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({hello: 'world'}))
  })

  app.use('/', express.static(path.join(__dirname, '../../dist/frontend/')))
  app.use('/*', express.static(path.join(__dirname, '../../dist/frontend/index.html')))

  return app
}


//
// Configuration
//
const PORT = process.env.PORT || 3000;


//
// Bootstrap the application
//
const app = buildApplication({})

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})
