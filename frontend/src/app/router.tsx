import { createBrowserRouter, Navigate, type LoaderFunctionArgs } from 'react-router-dom'
import { settingsQuery } from '@/api/queries'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/locale'
import { CmsPage, CmsPageRoute } from '@/pages/CmsPage'
import { ProjectPage } from '@/pages/ProjectPage'
import { NotFoundPage, PageSkeleton } from '@/pages/states'
import { prefetchPage, prefetchProject } from './prefetch'
import { queryClient } from './queryClient'

const localeOf = ({ params }: LoaderFunctionArgs): Locale =>
  isLocale(params.locale) ? params.locale : DEFAULT_LOCALE

// Loaders start fetching as soon as navigation begins, without blocking it:
// pages render their skeleton immediately and pick up the data from the query cache.
const prefetch = (load: (args: LoaderFunctionArgs) => void) => (args: LoaderFunctionArgs) => {
  load(args)
  return null
}

export const router = createBrowserRouter(
  [
    { path: '/', element: <Navigate to={`/${DEFAULT_LOCALE}`} replace /> },
    // The admin is a separate lazy chunk: its code, styles and strings stay out of the site bundle.
    { path: '/admin/*', lazy: () => import('@/admin/route'), hydrateFallbackElement: <></> },
    {
      path: '/:locale',
      element: <SiteLayout />,
      // Shown only while a lazy child route (preview, dev benches) opened directly loads its
      // chunk; the eager pages render at once and never reach it.
      hydrateFallbackElement: <PageSkeleton />,
      loader: prefetch((args) => void queryClient.prefetchQuery(settingsQuery(localeOf(args)))),
      children: [
        {
          index: true,
          element: <CmsPage slug="home" />,
          loader: prefetch((args) => void prefetchPage('home', localeOf(args))),
        },
        {
          path: 'projects/:slug',
          element: <ProjectPage />,
          // the sheets below the first screen load alongside the data, not after it
          loader: prefetch((args) => void prefetchProject(args.params.slug ?? '', localeOf(args))),
        },
        // Draft by a link from the admin; a separate chunk, the site does not load it.
        {
          path: 'preview/:slug',
          lazy: () => import('@/pages/PreviewPage'),
        },
        // Design system bench. Dev builds only: production drops the branch and the chunk.
        ...(import.meta.env.DEV
          ? [
              {
                path: 'dev/design',
                lazy: () => import('@/dev/DesignPage'),
              },
              {
                path: 'dev/sections',
                lazy: () => import('@/dev/SectionsBench'),
              },
            ]
          : []),
        {
          path: ':slug',
          element: <CmsPageRoute />,
          loader: prefetch((args) => void prefetchPage(args.params.slug ?? '', localeOf(args))),
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
)
