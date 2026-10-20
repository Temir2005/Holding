/*
 * /dev/sections — stress bench for CMS blocks (dev builds only, like /dev/design).
 *   ?type=timeline   one block, or ?type=all for every registered block in a row
 *   &n=0|1|3|12      number of items       &long=1   long (Kazakh-length) texts
 *   &tone=dark|light|accent                 &media=0  no images
 * Renders through the real PageRenderer, so numbering, error boundaries and the line contract
 * are the same as on a page. Open it under /kk/… to check Kazakh UI strings too.
 */
import { useSearchParams } from 'react-router-dom'
import type { Tone } from '@/api/types'
import { PageRenderer } from '@/sections/PageRenderer'
import { FIXTURES, type FixtureOptions } from './sectionFixtures'
import './sectionFixtures/all'

const TONES: Tone[] = ['dark', 'light', 'accent']

export function Component() {
  const [params, setParams] = useSearchParams()
  const type = params.get('type') ?? 'all'
  const tone = (TONES.find((t) => t === params.get('tone')) ?? null) as Tone | null
  const base: Omit<FixtureOptions, 'tone'> = {
    n: Math.min(12, Math.max(0, Number(params.get('n') ?? 3))),
    long: params.get('long') === '1',
    media: params.get('media') !== '0',
  }
  const types = type === 'all' ? Object.keys(FIXTURES) : [type]
  const sections = types.flatMap((t, i) => {
    const build = FIXTURES[t as keyof typeof FIXTURES]
    // Without a forced tone, alternate like a real page so the line crosses tone borders.
    return build ? [build({ ...base, tone: tone ?? (i % 2 ? 'light' : 'dark') })] : []
  })
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  return (
    <>
      <nav
        aria-label="bench"
        className="tone-light sticky top-0 z-menu flex flex-wrap gap-x-6 gap-y-2 border-b border-line px-4 py-3 font-mono text-caption uppercase"
      >
        <Select
          label="type"
          value={type}
          options={['all', ...Object.keys(FIXTURES)]}
          onChange={(v) => set('type', v)}
        />
        <Select
          label="n"
          value={String(base.n)}
          options={['0', '1', '3', '12']}
          onChange={(v) => set('n', v)}
        />
        <Select
          label="tone"
          value={tone ?? 'auto'}
          options={['auto', ...TONES]}
          onChange={(v) => set('tone', v === 'auto' ? null : v)}
        />
        <Select
          label="long"
          value={base.long ? '1' : '0'}
          options={['0', '1']}
          onChange={(v) => set('long', v)}
        />
        <Select
          label="media"
          value={base.media ? '1' : '0'}
          options={['1', '0']}
          onChange={(v) => set('media', v)}
        />
      </nav>
      <PageRenderer sections={sections} />
    </>
  )
}

function Select(props: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2">
      {props.label}
      <select
        className="border border-line bg-surface px-1"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      >
        {props.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}
