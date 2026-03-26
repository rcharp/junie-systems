import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const githubPagesRedirect = sessionStorage.getItem('github-pages-path')

if (githubPagesRedirect) {
  sessionStorage.removeItem('github-pages-path')
  window.history.replaceState(null, '', githubPagesRedirect)
}

createRoot(document.getElementById("root")!).render(<App />);
