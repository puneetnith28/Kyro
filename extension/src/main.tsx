import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/chrome-extension'
import { ErrorBoundary } from './ErrorBoundary'
import './index.css'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_cmVsaWV2ZWQtd2hhbGUtMjAuY2xlcmsuYWNjb3VudHMuZGV2JA";

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider 
        publishableKey={PUBLISHABLE_KEY} 
        syncHost="http://localhost:5175"
        allowedRedirectOrigins={[`chrome-extension://${chrome.runtime.id}`]}
      >
        <App />
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
)
