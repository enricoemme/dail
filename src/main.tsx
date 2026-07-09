import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

// No StrictMode: its dev-mode double-mount would open (and immediately drop)
// a second Live API connection every round.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
