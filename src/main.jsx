import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { startBetaDiagnostics } from './betaDiagnostics'

import { Amplify } from 'aws-amplify'
import awsconfig from './aws-exports'

Amplify.configure(awsconfig)

startBetaDiagnostics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
