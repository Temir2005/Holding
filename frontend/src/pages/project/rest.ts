import { lazyWithPreload } from '@/lib/lazy'

/** Everything of the project sheet below the first screen: a chunk of its own (Markdown, gallery). */
export const loadProjectRest = lazyWithPreload(() =>
  import('./ProjectRest').then((m) => m.ProjectRest),
)
