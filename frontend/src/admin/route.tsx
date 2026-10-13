/**
 * Admin entry: loaded lazily from the site router (`/admin/*`), so none of this code,
 * its styles or its strings reach the site bundle.
 */
import './styles/admin.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Route, Routes } from 'react-router-dom'
import { createAdminQueryClient } from './api/queries'
import { AdminNotFound, CollectionPlaceholder, SectionPlaceholder } from './features/Placeholder'
import { useT } from './i18n'
import { AdminLayout } from './layout/AdminLayout'
import { useAdminBody, useThemeChoice } from './layout/theme'
import { RequireAuth, RequireRole } from './session/guards'
import { LoginPage } from './session/LoginPage'
import { SessionProvider } from './session/SessionProvider'
import { ConfirmProvider } from './ui/Confirm'
import { ToastProvider } from './ui/Toast'
import { TooltipProvider } from './ui/Tooltip'

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
        <Route index element={<SectionPlaceholder title="nav.dashboard" />} />
        <Route path="pages/*" element={<SectionPlaceholder title="nav.pages" />} />
        <Route path="media/*" element={<SectionPlaceholder title="nav.media" />} />
        <Route path="leads/*" element={<SectionPlaceholder title="nav.leads" />} />
        <Route path="collections/:collection/*" element={<CollectionPlaceholder />} />
        <Route
          path="settings"
          element={
            <RequireRole role="admin">
              <SectionPlaceholder title="nav.settings" />
            </RequireRole>
          }
        />
        <Route
          path="users/*"
          element={
            <RequireRole role="admin">
              <SectionPlaceholder title="nav.users" />
            </RequireRole>
          }
        />
        <Route
          path="audit"
          element={
            <RequireRole role="admin">
              <SectionPlaceholder title="nav.audit" />
            </RequireRole>
          }
        />
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
