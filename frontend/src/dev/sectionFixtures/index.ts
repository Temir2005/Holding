/*
 * Fixture sections for the dev-only stress bench /dev/sections (never shipped).
 * Each section type registers a builder: n = number of items (0, 1, 3, 12), long = long texts
 * (Kazakh-length words), so every block is checked "in uncomfortable conditions" without
 * touching the CMS. Placeholders only, no real facts.
 */
import type { Media, Section, SectionType, Tone } from '@/api/types'
import { SAMPLE_MEDIA } from '../fixtures'

export type FixtureOptions = { n: number; long: boolean; tone: Tone; media: boolean }
export type FixtureBuilder = (o: FixtureOptions) => Section

export const FIXTURES: Partial<Record<SectionType, FixtureBuilder>> = {}

/** Registers the builder of a section type (call from the type's fixture module). */
export function registerFixture(type: SectionType, build: FixtureBuilder) {
  FIXTURES[type] = build
}

let seq = 0
/** A unique fake id for fixture objects. */
export const fid = () => `00000000-0000-0000-0000-${String(++seq).padStart(12, '0')}`

/** Short or long placeholder text: long ones carry long Kazakh words to stress line breaks. */
export const text = (short: string, long: boolean) =>
  long
    ? `${short} · Әлеуметтік-экономикалық жауапкершілік және құрылыс материалдарының өндірісі`
    : short

/** The drawn sample image, or nothing when the bench runs with ?media=0. */
export const media = (o: FixtureOptions, overrides: Partial<Media> = {}): Media | null =>
  o.media ? { ...SAMPLE_MEDIA, id: fid(), ...overrides } : null

/** n copies of an item builder, numbered from 1. */
export const many = <T>(n: number, item: (i: number) => T): T[] =>
  Array.from({ length: n }, (_, i) => item(i + 1))
