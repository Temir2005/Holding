/** Waits until the dev server and the API answer: containers start before they are ready. */
export default async function globalSetup() {
  const base = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
  const deadline = Date.now() + 120_000
  const targets = [`${base}/admin`, `${base}/api/v1/health`]
  for (const url of targets) {
    for (;;) {
      try {
        const res = await fetch(url)
        if (res.ok) break
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) throw new Error(`${url} did not become ready`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}
