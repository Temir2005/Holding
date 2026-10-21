import { SiteLink } from '@/components/ui/SiteLink'
import type { SiteSettings } from '@/api/types'
import { SmartImage } from '@/components/ui/SmartImage'
import { cn } from '@/lib/cn'
import { useLocale } from '@/lib/locale'

type Props = { settings: SiteSettings | undefined; className?: string }

/** Uploaded logo when the CMS has one; otherwise the site name with the drawing mark. */
export function Logo({ settings, className }: Props) {
  const locale = useLocale()
  return (
    <SiteLink
      to={`/${locale}`}
      className={cn(
        'flex min-h-11 flex-none items-center gap-2.5 text-lg font-bold tracking-[-0.02em]',
        className,
      )}
    >
      {settings?.logo ? (
        <SmartImage media={settings.logo} className="h-8 w-auto" fit="contain" priority />
      ) : (
        <>
          {/* A sheet with the red line in its binding margin. */}
          <span
            aria-hidden="true"
            className="relative h-[18px] w-[18px] flex-none border border-current"
          >
            <i className="absolute -bottom-px -top-px left-1 w-0.5 bg-trace" />
          </span>
          {settings?.site_name ?? ' '}
        </>
      )}
    </SiteLink>
  )
}
