import type { FieldIssue } from '../../api/errors'
import type { PageDetail, SectionRead } from '../../api/pages'

/** Publish problems of one place: a block, or the page's own settings. */
export interface ProblemGroup {
  section: SectionRead | null
  /** Issues with paths relative to the block form (or the settings form). */
  issues: FieldIssue[]
}

/** Splits publish errors (`["sections", i, "data", …]`, `["page", field]`) by place. */
export function groupProblems(page: PageDetail, issues: FieldIssue[]): ProblemGroup[] {
  const groups = new Map<string, ProblemGroup>()
  for (const issue of issues) {
    const [root, index, ...rest] = issue.loc
    if (root === 'sections' && typeof index === 'number') {
      const section =
        page.sections.find((s) => s.id === issue.section_id) ?? page.sections[index] ?? null
      const key = section?.id ?? `index-${index}`
      const group = groups.get(key) ?? { section, issues: [] }
      group.issues.push({ ...issue, loc: rest })
      groups.set(key, group)
    } else {
      const group = groups.get('page') ?? { section: null, issues: [] }
      group.issues.push({ ...issue, loc: root === 'page' ? issue.loc.slice(1) : issue.loc })
      groups.set('page', group)
    }
  }
  return [...groups.values()]
}
