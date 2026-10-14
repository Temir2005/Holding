import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { mediaItemQuery } from '../../api/queries'
import { useT } from '../../i18n'
import { Sheet } from '../../ui/Dialog'
import { PageTitle } from '../Placeholder'
import { displayName } from './format'
import { MediaBrowser } from './MediaBrowser'
import { MediaCard } from './MediaCard'

const FILE_PARAM = 'file'

/** The media library; the open file is in the URL (`?file=<id>`), so it can be linked. */
export function MediaLibraryPage() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const openId = params.get(FILE_PARAM)
  const { data: open } = useQuery({ ...mediaItemQuery(openId ?? ''), enabled: Boolean(openId) })

  const setOpen = (id: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set(FILE_PARAM, id)
        else next.delete(FILE_PARAM)
        return next
      },
      { replace: !id },
    )

  return (
    <>
      <PageTitle>{t('media.title')}</PageTitle>
      <MediaBrowser mode="library" onActivate={(item) => setOpen(item.id)} />
      <Sheet
        open={Boolean(openId)}
        onOpenChange={(next) => !next && setOpen(null)}
        title={open ? displayName(open) || t('media.card.title') : t('media.card.title')}
      >
        {openId && <MediaCard id={openId} onDeleted={() => setOpen(null)} />}
      </Sheet>
    </>
  )
}
