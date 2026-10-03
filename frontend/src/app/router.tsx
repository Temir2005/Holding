import { createBrowserRouter, Navigate, type LoaderFunctionArgs } from 'react-router-dom'
import { pageQuery, projectQuery, settingsQuery } from '@/api/queries'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/locale'
import { CmsPage, CmsPageRoute } from '@/pages/CmsPage'
import { ProjectPage } from '@/pages/ProjectPage'
import { NotFoundPage } from '@/pages/states'
import { queryClient } from './queryClient'

const localeOf = ({ params }: LoaderFunctionArgs): Locale =>
  isLocale(params.locale) ? params.locale : DEFAULT_LOCALE

// Loaders start fetching as soon as navigation begins, without blocking it:
// pages render their skeleton immediately and pick up the data from the query cache.
const prefetch = (load: (args: LoaderFunctionArgs) => void) => (args: LoaderFunctionArgs) => {
  load(args)
  return null
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to={`/${DEFAULT_LOCALE}`} replace /> },
  {
    path: '/:locale',
    element: <SiteLayout />,
    loader: prefetch((args) => void queryClient.prefetchQuery(settingsQuery(localeOf(args)))),
    children: [
      {
        index: true,
        element: <CmsPage slug="home" />,
        loader: prefetch((args) => void queryClient.prefetchQuery(pageQuery('home', localeOf(args)))),
      },
      {
        path: 'projects/:slug',
        element: <ProjectPage />,
        loader: prefetch(
          (args) => void queryClient.prefetchQuery(projectQuery(args.params.slug ?? '', localeOf(args))),
        ),
      },
      {
        path: ':slug',
        element: <CmsPageRoute />,
        loader: prefetch(
          (args) => void queryClient.prefetchQuery(pageQuery(args.params.slug ?? '', localeOf(args))),
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
})
