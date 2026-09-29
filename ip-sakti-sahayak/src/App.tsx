import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, useRouteError, Link } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Skeleton } from './components/ui/primitives'
import { useAppStore } from './store/useAppStore'
import AssistantPage from './pages/AssistantPage'

const ClassifyPage = lazy(() => import('./pages/ClassifyPage'))
const AbsPage = lazy(() => import('./pages/AbsPage'))
const TkdlPage = lazy(() => import('./pages/TkdlPage'))
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-8 h-72 w-full rounded-xl" />
    </div>
  )
}

const page = (el: React.ReactNode) => <Suspense fallback={<PageFallback />}>{el}</Suspense>

function RouteError() {
  const error = useRouteError() as { status?: number } | undefined
  const notFound = error?.status === 404
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="font-serif text-5xl font-semibold text-primary">{notFound ? '404' : 'Oops'}</p>
      <h1 className="mt-4 text-xl font-semibold text-ink">{notFound ? 'This page does not exist' : 'Something went wrong on this page'}</h1>
      <p className="mt-2 text-muted">{notFound ? 'The link may be out of date.' : 'Try reloading. Your chats are saved in this browser.'}</p>
      <Link to="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-fg">
        Go to the assistant
      </Link>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <AssistantPage /> },
      { path: '/classify', element: page(<ClassifyPage />) },
      { path: '/abs', element: page(<AbsPage />) },
      { path: '/tkdl', element: page(<TkdlPage />) },
      { path: '/sources', element: page(<SourcesPage />) },
      { path: '/help', element: page(<HelpPage />) },
      { path: '*', element: <RouteError /> },
    ],
  },
])

export default function App() {
  const theme = useAppStore((s) => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return <RouterProvider router={router} />
}
