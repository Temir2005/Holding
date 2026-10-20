import { fid, media, registerFixture, text } from './index'

// Bench only: ?embed=0 uses a video file instead of an embed. n=0: no video, title only.
const embed = () => new URLSearchParams(window.location.search).get('embed') !== '0'

registerFixture('video', (o) => ({
  id: fid(),
  anchor: null,
  type: 'video',
  tone: o.tone,
  data: {
    eyebrow: 'Видео',
    title: text('Как устроено производство', o.long),
    embed_url: o.n > 0 && embed() ? 'https://www.example.com/embed/placeholder' : null,
    video:
      o.n > 0 && !embed()
        ? {
            id: fid(),
            url: '/placeholder.mp4',
            width: 1920,
            height: 1080,
            alt: 'Видео-плейсхолдер',
            mime_type: 'video/mp4',
            placeholder: { dominant_color: null },
            variants: [],
          }
        : null,
    poster: media(o, { width: 1600, height: 900, alt: 'Постер видео' }),
  },
}))
