/** Toolbar actions of the Markdown editor, as pure text transformations. */
export type MarkdownAction = 'bold' | 'italic' | 'heading' | 'list' | 'ordered' | 'link'

export interface TextEdit {
  text: string
  selectionStart: number
  selectionEnd: number
}

/** Expands a selection to whole lines. */
function lineRange(text: string, start: number, end: number): [number, number] {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const next = text.indexOf('\n', end)
  return [lineStart, next === -1 ? text.length : next]
}

function wrap(
  text: string,
  start: number,
  end: number,
  mark: string,
  placeholder: string,
): TextEdit {
  const selected = text.slice(start, end) || placeholder
  const before = text.slice(0, start)
  const after = text.slice(end)
  return {
    text: `${before}${mark}${selected}${mark}${after}`,
    selectionStart: start + mark.length,
    selectionEnd: start + mark.length + selected.length,
  }
}

function prefixLines(
  text: string,
  start: number,
  end: number,
  prefix: (index: number) => string,
): TextEdit {
  const [from, to] = lineRange(text, start, end)
  const lines = text.slice(from, to).split('\n')
  const replaced = lines.map((line, i) => `${prefix(i)}${line}`).join('\n')
  return {
    text: text.slice(0, from) + replaced + text.slice(to),
    selectionStart: from,
    selectionEnd: from + replaced.length,
  }
}

/**
 * Applies an action to the selection. `placeholder` is inserted when nothing is selected
 * (and becomes selected, so typing replaces it).
 */
export function applyMarkdown(
  action: MarkdownAction,
  text: string,
  start: number,
  end: number,
  placeholder: string,
): TextEdit {
  switch (action) {
    case 'bold':
      return wrap(text, start, end, '**', placeholder)
    case 'italic':
      return wrap(text, start, end, '_', placeholder)
    case 'heading':
      return prefixLines(text, start, end, () => '## ')
    case 'list':
      return prefixLines(text, start, end, () => '- ')
    case 'ordered':
      return prefixLines(text, start, end, (i) => `${i + 1}. `)
    case 'link': {
      const label = text.slice(start, end) || placeholder
      const url = 'https://'
      const inserted = `[${label}](${url})`
      const urlStart = start + label.length + 3
      return {
        text: text.slice(0, start) + inserted + text.slice(end),
        selectionStart: urlStart,
        selectionEnd: urlStart + url.length,
      }
    }
  }
}
