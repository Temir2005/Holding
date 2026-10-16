/**
 * Sections of the admin, each in its own chunk: the first screen (sign-in, dashboard) loads
 * without the editors, the media library or the forms. Once the admin is idle, the other
 * sections are fetched in the background, so moving between them stays instant.
 */
export const sectionLoaders = {
  dashboard: () => import('./features/dashboard/DashboardPage'),
  pagesList: () => import('./features/pages/PagesListPage'),
  pageEditor: () => import('./features/pages/PageEditorPage'),
  media: () => import('./features/media/MediaLibraryPage'),
  collectionList: () => import('./features/collections/CollectionListPage'),
  collectionItem: () => import('./features/collections/CollectionItemPage'),
  leads: () => import('./features/leads/LeadsPage'),
  settings: () => import('./features/settings/SettingsPage'),
  users: () => import('./features/users/UsersPage'),
  audit: () => import('./features/audit/AuditPage'),
}

let preloaded = false

/** Fetches every section chunk when the browser is idle (once per session). */
export function preloadSections() {
  if (preloaded) return
  preloaded = true
  const run = () => {
    for (const load of Object.values(sectionLoaders)) void load().catch(() => undefined)
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 2000)
}
