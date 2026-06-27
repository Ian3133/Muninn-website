import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

import { Amplify } from 'aws-amplify'
import awsconfig from './aws-exports'

if (
  import.meta.env.VITE_ENABLE_AUTH === 'true' ||
  import.meta.env.VITE_ENABLE_CLOUD_SETTINGS === 'true'
) {
  Amplify.configure(awsconfig)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
