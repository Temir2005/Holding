import type { Person } from '@/api/types'

export type TeamMode = 'founder' | 'key' | 'rest' | 'all'

/** Fewer people than this in `all` mode join the grid instead of a register of their own. */
const MIN_REGISTER = 3

export type TeamGroups = { founders: Person[]; key: Person[]; rest: Person[] }

/**
 * Splits the people of a block into its three presentations: the founder's spread, the
 * editorial grid of key people and the register of the wider team. The mode decides the group;
 * a founder picked by hand into any block still gets the spread.
 */
export function splitPeople(people: Person[], mode: TeamMode): TeamGroups {
  if (mode === 'founder') return { founders: people, key: [], rest: [] }
  const founders = people.filter((p) => p.is_founder)
  const others = people.filter((p) => !p.is_founder)
  if (mode === 'key') return { founders, key: others, rest: [] }
  if (mode === 'rest') return { founders, key: [], rest: others }
  const key = others.filter((p) => p.is_key)
  const rest = others.filter((p) => !p.is_key)
  // A register of one or two rows under a grid reads as leftovers: they join the grid.
  if (key.length && rest.length < MIN_REGISTER) return { founders, key: others, rest: [] }
  return { founders, key, rest }
}

/** Divisions present among the people, in order of first appearance: [slug, name]. */
export function divisionsOf(people: Person[]): [string, string][] {
  const map = new Map<string, string>()
  people.forEach(
    (p) => p.division && !map.has(p.division.slug) && map.set(p.division.slug, p.division.name),
  )
  return [...map]
}
