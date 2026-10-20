/** A point of the scene path, in px of the stage. */
export type Pt = readonly [number, number]

/**
 * The scene's own part of the red line, measured from the layout of the stage (never per frame).
 * - `d`: SVG path; `keys` → `lens`: piecewise map from the scene progress p to the drawn share of
 *   the path (useTransform), so the line runs through the stage nodes continuously with p.
 * - `entry`: y where the line enters the stage path. Above it the section's own line shows
 *   through a slit in the stage background, so before the pin the pen draws it, as everywhere.
 * - `corners`: turns of the path with the drawn share at which they light up.
 */
export type SceneGeometry = {
  w: number
  h: number
  d: string
  keys: number[]
  lens: number[]
  entry: number
  corners: { x: number; y: number; at: number }[]
}

/**
 * Wide screens: the rail is a horizontal axis. The line turns out of the margin onto it, runs
 * through the stage nodes (node i is reached at p = i/N, when stage i opens), on the last stage
 * goes to the right edge, down under the progress dimension, back along the bottom into the
 * margin and down to the bottom edge of the stage, so it leaves the scene in the margin.
 * Phones: the rail is vertical and its axis is the line in the margin itself.
 */
export function sceneGeometry(
  size: { w: number; h: number },
  x: number,
  nodes: Pt[],
  right: number,
): SceneGeometry | null {
  const n = nodes.length
  const first = nodes[0]
  const last = nodes[n - 1]
  if (!first || !last || n < 2) return null
  const { w, h } = size
  const row = Math.abs(first[1] - last[1]) < 2
  let pts: Pt[]
  let keys: number[]
  let cornerIdx: number[]
  if (row) {
    const ay = first[1]
    const ry = h - Math.min(32, h * 0.04)
    pts = [[x, ay], ...nodes, [right, ay], [right, ry], [x, ry], [x, h]]
    keys = [
      0,
      // the short run from the turn to the first node draws as the pin starts
      0.12 / n,
      ...nodes.slice(1).map((_, i) => (i + 1) / n),
      (n - 0.7) / n,
      (n - 0.5) / n,
      (n - 0.15) / n,
      1,
    ]
    cornerIdx = [0, n + 1, n + 2, n + 3]
  } else {
    pts = [...nodes.map(([, y]) => [x, y] as const), [x, h]]
    keys = [...nodes.map((_, i) => i / n), 1]
    cornerIdx = []
  }
  for (let i = 1; i < keys.length; i++) keys[i] = Math.max(keys[i] ?? 0, (keys[i - 1] ?? 0) + 1e-4)

  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1] as Pt
    const b = pts[i] as Pt
    cum.push((cum[i - 1] ?? 0) + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const len = Math.max(1, cum[cum.length - 1] ?? 1)
  const lens = cum.map((c) => c / len)
  const f = (v: number) => v.toFixed(1)
  return {
    w,
    h,
    d: 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L'),
    keys,
    lens,
    entry: (pts[0] as Pt)[1],
    corners: cornerIdx.map((i) => ({
      x: (pts[i] as Pt)[0],
      y: (pts[i] as Pt)[1],
      at: lens[i] ?? 0,
    })),
  }
}

/** Position of a node inside `root` from layout offsets: transforms of transitions never move it. */
export function offsetIn(node: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let current: HTMLElement | null = node
  while (current && current !== root) {
    x += current.offsetLeft
    y += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }
  return { x, y }
}

/**
 * Scroll position at which stage i of a pinned scene is open (the middle of its share), for the
 * keyboard: focus inside an inactive stage scrolls to it. Called from a focus handler only.
 */
export function stageScrollTop(scene: HTMLElement, stage: HTMLElement, i: number, n: number) {
  const top = scene.getBoundingClientRect().top + window.scrollY
  const range = Math.max(1, scene.offsetHeight - stage.offsetHeight)
  return top + ((i + 0.5) / n) * range
}
