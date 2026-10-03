import { Link } from 'react-router-dom'
import type { SiteSettings } from '@/api/types'
import { SmartImage } from '@/components/ui/SmartImage'
import { useLocale } from '@/lib/locale'

/** Uploaded logo when the CMS has one; otherwise the site name with the panel mark. */
export function Logo({ settings }: { settings: SiteSettings | undefined }) {
  const locale = useLocale()
  return (
    <Link to={`/${locale}`} className="flex min-h-11 items-center gap-2.5 font-display text-lg font-extrabold tracking-tight">
      {settings?.logo ? (
        <SmartImage media={settings.logo} className="h-8 w-auto" fit="contain" priority />
      ) : (
        <>
          <span aria-hidden="true" className="grid h-5 w-5 grid-cols-2 gap-[2px]">
            <i className="bg-accent" />
            <i className="bg-fg" />
            <i className="bg-fg" />
            <i className="bg-accent" />
          </span>
          {settings?.site_name ?? ' '}
        </>
      )}
    </Link>
  )
}
