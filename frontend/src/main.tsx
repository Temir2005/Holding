// Site fonts: Geologica and IBM Plex Mono, instanced and subset by design/tools/build-fonts.sh
// (all Kazakh letters verified by design/tools/cmap.cjs). Licences: OFL-*.txt next to them.
import './assets/fonts/fonts.css'
// Admin fonts. The site never uses these families, so browsers do not download their files on
// the site; only the @font-face rules ship. TODO: move into the admin chunk with its next stage.
import '@fontsource-variable/jetbrains-mono'
import '@fontsource/golos-text/400.css'
import '@fontsource/golos-text/500.css'
import '@fontsource/golos-text/600.css'
import './styles/globals.css'
import './i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

const root = document.getElementById('root')
if (!root) throw new Error('#root element is missing in index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
