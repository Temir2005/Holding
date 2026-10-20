/**
 * Authoritative Kazakh glyph check: reads the cmap table straight out of each woff2 file
 * (WOFF2 = brotli stream of tables; cmap is never transformed) and reports which of the
 * Kazakh letters are mapped, plus woff2 sizes for latin + cyrillic + cyrillic-ext.
 * Usage: node tools/cmap.cjs  (from design/), writes tools/cmap.json.
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const KAZAKH = [...'әғқңөұүһіӘҒҚҢӨҰҮҺІ']
const EXTRA = [...'ёЁ№']

function base128(buf, pos) {
  let v = 0
  for (let i = 0; i < 5; i++) {
    const b = buf[pos.i++]
    v = v * 128 + (b & 0x7f)
    if (!(b & 0x80)) return v
  }
  throw new Error('bad UIntBase128')
}

function cmapOf(file) {
  const buf = fs.readFileSync(file)
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not woff2')
  const numTables = buf.readUInt16BE(12)
  const pos = { i: 48 }
  const tables = []
  for (let t = 0; t < numTables; t++) {
    const flags = buf[pos.i++]
    const known = flags & 0x3f
    if (known === 0x3f) pos.i += 4
    const xform = (flags >> 6) & 3
    const orig = base128(buf, pos)
    let len = orig
    const glyfLoca = known === 10 || known === 11
    if ((glyfLoca && xform === 0) || (!glyfLoca && xform !== 0)) len = base128(buf, pos)
    tables.push({ known, len })
  }
  const data = zlib.brotliDecompressSync(buf.subarray(pos.i, pos.i + buf.readUInt32BE(20)))
  let off = 0
  for (const t of tables) {
    if (t.known === 0) return data.subarray(off, off + t.len)
    off += t.len
  }
  throw new Error('no cmap')
}

/** Set of code points with a non-zero glyph, from format 4 and format 12 subtables. */
function codepoints(cmap) {
  const set = new Set()
  const n = cmap.readUInt16BE(2)
  for (let r = 0; r < n; r++) {
    const o = cmap.readUInt32BE(4 + r * 8 + 4)
    const format = cmap.readUInt16BE(o)
    if (format === 4) {
      const seg = cmap.readUInt16BE(o + 6) / 2
      const ends = o + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2
      for (let s = 0; s < seg; s++) {
        const end = cmap.readUInt16BE(ends + s * 2), start = cmap.readUInt16BE(starts + s * 2)
        const delta = cmap.readInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(ranges + s * 2)
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let g
          if (ro === 0) g = (c + delta) & 0xffff
          else {
            const at = ranges + s * 2 + ro + (c - start) * 2
            g = cmap.readUInt16BE(at)
            if (g) g = (g + delta) & 0xffff
          }
          if (g) set.add(c)
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(o + 12)
      for (let gi = 0; gi < groups; gi++) {
        const b = o + 16 + gi * 12
        const start = cmap.readUInt32BE(b), end = cmap.readUInt32BE(b + 4)
        for (let c = start; c <= end; c++) set.add(c)
      }
    }
  }
  return set
}

const dir = path.join(__dirname, '../concepts/_shared/fonts')
const report = []
for (const pkg of fs.readdirSync(dir).sort()) {
  const files = path.join(dir, pkg, 'files')
  if (!fs.existsSync(files)) continue
  const all = fs.readdirSync(files)
  // Group files into "styles": one variable axis file (wght/standard) or one static weight.
  const styles = {}
  for (const f of all) {
    const m = f.match(/-(latin-ext|latin|cyrillic-ext|cyrillic)-([a-z0-9]+)-(normal|italic)\.woff2$/)
    if (!m || m[1] === 'latin-ext' || m[3] === 'italic') continue
    ;(styles[m[2]] ??= {})[m[1]] = f
  }
  for (const [style, subsets] of Object.entries(styles)) {
    const covered = new Set()
    let bytes = 0
    const sizes = {}
    for (const [subset, f] of Object.entries(subsets)) {
      const p = path.join(files, f)
      sizes[subset] = fs.statSync(p).size
      bytes += sizes[subset]
      for (const c of codepoints(cmapOf(p))) covered.add(c)
    }
    const missing = [...KAZAKH, ...EXTRA].filter((ch) => !covered.has(ch.codePointAt(0)))
    report.push({ pkg, style, subsets: Object.keys(subsets), sizes, kb: +(bytes / 1024).toFixed(1), missing })
  }
}
fs.writeFileSync(path.join(__dirname, 'cmap.json'), JSON.stringify(report, null, 2))
for (const r of report) {
  console.log(`${r.missing.length ? 'MISSING' : 'OK     '} ${r.pkg.padEnd(48)} ${r.style.padEnd(9)} ${String(r.kb).padStart(6)} KB  [${r.subsets.join('+')}] ${r.missing.join(' ')}`)
}
