/**
 * Admin entry: loaded lazily from the site router (`/admin/*`), so none of this code,
 * its styles or its strings reach the site bundle.
 */
import './styles/admin.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Route, Routes } from 'react-router-dom'
import { createAdminQueryClient } from './api/queries'
import { AdminNotFound } from './features/Placeholder'
import { useT } from './i18n'
import { AdminLayout } from './layout/AdminLayout'
import { useAdminBody, useThemeChoice } from './layout/theme'
import { RequireAuth, RequireRole } from './session/guards'
import {
  AuditPage,
  CollectionItemPage,
  CollectionListPage,
  DashboardPage,
  LeadsPage,
  MediaLibraryPage,
  PageEditorPage,
  PagesListPage,
  SettingsPage,
  UsersPage,
} from './sections'
import { LoginPage } from './session/LoginPage'
import { SessionProvider } from './session/SessionProvider'
import { ConfirmProvider } from './ui/Confirm'
import { ToastProvider } from './ui/Toast'
import { TooltipProvider } from './ui/Tooltip'

// Development tools: not part of the production build.
const FormsPlayground = import.meta.env.DEV
  ? lazy(() =>
      import('./features/dev/FormsPlayground').then((m) => ({ default: m.FormsPlayground })),
    )
  : null

function AdminRoutes() {
  const theme = useThemeChoice()
  useAdminBody(theme.resolved)
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AdminLayout theme={theme.choice} onThemeChange={theme.setChoice} />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="pages" element={<PagesListPage />} />
        <Route path="pages/:pageId" element={<PageEditorPage />} />
        <Route path="media" element={<MediaLibraryPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="collections/:collection" element={<CollectionListPage />} />
        <Route path="collections/:collection/:itemId" element={<CollectionItemPage />} />
        <Route
          path="settings"
          element={
            <RequireRole role="admin">
              <SettingsPage />
            </RequireRole>
          }
        />
        <Route
          path="users"
          element={
            <RequireRole role="admin">
              <UsersPage />
            </RequireRole>
          }
        />
        <Route
          path="audit"
          element={
            <RequireRole role="admin">
              <AuditPage />
            </RequireRole>
          }
        />
        {FormsPlayground && <Route path="dev/forms" element={<FormsPlayground />} />}
        <Route path="*" element={<AdminNotFound />} />
      </Route>
    </Routes>
  )
}

export function Component() {
  const t = useT()
  const [queryClient] = useState(createAdminQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      {/* Independent of the proxy's X-Robots-Tag: the admin is never indexed. */}
      <Helmet>
        <title>{t('app.title')}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <TooltipProvider delayDuration={300}>
        <ToastProvider>
          <ConfirmProvider>
            <SessionProvider>
              <AdminRoutes />
            </SessionProvider>
          </ConfirmProvider>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
