import { lazy } from 'react'
import { sectionLoaders as load } from './sectionLoaders'

export const DashboardPage = lazy(() =>
  load.dashboard().then((m) => ({ default: m.DashboardPage })),
)
export const PagesListPage = lazy(() =>
  load.pagesList().then((m) => ({ default: m.PagesListPage })),
)
export const PageEditorPage = lazy(() =>
  load.pageEditor().then((m) => ({ default: m.PageEditorPage })),
)
export const MediaLibraryPage = lazy(() =>
  load.media().then((m) => ({ default: m.MediaLibraryPage })),
)
export const CollectionListPage = lazy(() =>
  load.collectionList().then((m) => ({ default: m.CollectionListPage })),
)
export const CollectionItemPage = lazy(() =>
  load.collectionItem().then((m) => ({ default: m.CollectionItemPage })),
)
export const LeadsPage = lazy(() => load.leads().then((m) => ({ default: m.LeadsPage })))
export const SettingsPage = lazy(() => load.settings().then((m) => ({ default: m.SettingsPage })))
export const UsersPage = lazy(() => load.users().then((m) => ({ default: m.UsersPage })))
export const AuditPage = lazy(() => load.audit().then((m) => ({ default: m.AuditPage })))
