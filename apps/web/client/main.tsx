import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import LandingPage from './LandingPage.tsx'
import './index.css'

function Root() {
	const [path, setPath] = useState(window.location.pathname)

	useEffect(() => {
		const handlePopState = () => setPath(window.location.pathname)
		window.addEventListener('popstate', handlePopState)
		return () => window.removeEventListener('popstate', handlePopState)
	}, [])

	const openApp = () => {
		window.history.pushState({}, '', '/app')
		setPath('/app')
		window.scrollTo({ top: 0 })
	}

	return path === '/app' ? <App /> : <LandingPage onOpenApp={openApp} />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<Root />)
