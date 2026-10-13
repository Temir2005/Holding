import { describe, expect, it } from 'vitest'
import { AdminApiError, errorFromResponse, isApiError, locToPath } from './errors'

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('errorFromResponse', () => {
  it('reads the admin error envelope', async () => {
    const error = await errorFromResponse(
      jsonResponse(409, {
        error: {
          code: 'VERSION_CONFLICT',
          message: 'Запись изменилась',
          details: { expected_version: 1, current_version: 2 },
        },
      }),
    )
    expect(error).toBeInstanceOf(AdminApiError)
    expect(error.status).toBe(409)
    expect(error.code).toBe('VERSION_CONFLICT')
    expect(error.message).toBe('Запись изменилась')
    expect(error.details).toEqual({ expected_version: 1, current_version: 2 })
    expect(error.fieldIssues).toEqual([])
    expect(isApiError(error, 'VERSION_CONFLICT')).toBe(true)
    expect(isApiError(error, 'IN_USE')).toBe(false)
  })

  it('parses field issues of a 422, keeping section_id and dropping malformed items', async () => {
    const error = await errorFromResponse(
      jsonResponse(422, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Проверьте поля',
          details: [
            { loc: ['body', 'data', 'steps', 0, 'title', 'ru'], msg: 'Заполните текст' },
            { loc: ['sections', 2, 'data', 'title'], msg: 'Пусто', section_id: 's-1' },
            { msg: 'no loc' },
            'garbage',
          ],
        },
      }),
    )
    expect(error.fieldIssues).toEqual([
      { loc: ['body', 'data', 'steps', 0, 'title', 'ru'], msg: 'Заполните текст' },
      { loc: ['sections', 2, 'data', 'title'], msg: 'Пусто', section_id: 's-1' },
    ])
  })

  it('falls back to the status text for non-envelope bodies', async () => {
    const error = await errorFromResponse(
      new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }),
    )
    expect(error.code).toBe('UNKNOWN_ERROR')
    expect(error.status).toBe(502)
    expect(error.message).toBe('Bad Gateway')
  })

  it('does not treat the public API format as an admin error', async () => {
    const error = await errorFromResponse(jsonResponse(404, { detail: 'Not found' }))
    expect(error.code).toBe('UNKNOWN_ERROR')
  })
})

describe('locToPath', () => {
  it('drops the request part and joins nested paths', () => {
    expect(locToPath(['body', 'data', 'steps', 0, 'title', 'ru'])).toBe('data.steps.0.title.ru')
    expect(locToPath(['query', 'sort'])).toBe('sort')
    expect(locToPath(['body', 'slug'])).toBe('slug')
  })

  it('keeps paths without a request part', () => {
    expect(locToPath(['page', 'og_image_id'])).toBe('page.og_image_id')
  })

  it('strips a prefix and rejects paths outside it', () => {
    const loc = ['sections', 2, 'data', 'ctas', 0, 'href']
    expect(locToPath(loc, ['sections', 2])).toBe('data.ctas.0.href')
    expect(locToPath(loc, ['sections', '2'])).toBe('data.ctas.0.href')
    expect(locToPath(loc, ['sections', 3])).toBeNull()
  })

  it('returns null when nothing is left (error about the whole body)', () => {
    expect(locToPath(['body'])).toBeNull()
    expect(locToPath([])).toBeNull()
  })
})
