import { useTranslation } from 'react-i18next'
import { Section } from '@/components/ui/Section'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * The project sheet while it loads, in the plates of the tone: the same first screen (crumb,
 * name, datum, column with the stamp, the cover) so nothing jumps when the data arrives.
 */
export function ProjectSkeleton() {
  const { t } = useTranslation()
  return (
    <Section tone="dark" space="none">
      <div
        aria-busy="true"
        className="flex min-h-[100svh] flex-col pb-section-y-end pt-[calc(var(--header-h)+clamp(24px,3vw,48px))]"
      >
        <p role="status" className="sr-only">
          {t('projectPage.loading')}
        </p>
        <div className="flex min-h-[3.75rem] items-center border-b border-line pb-4">
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="mt-[clamp(32px,4vw,64px)] h-[var(--fs-display)] w-[min(100%,9em)] text-display" />
        <div
          aria-hidden="true"
          className="my-[clamp(32px,3.4vw,56px)] ml-[calc(var(--trace-x)-var(--pad-l))] h-px bg-line-strong"
        />
        <div className="grid flex-1 grid-cols-12 gap-x-gap gap-y-10">
          <div className="order-2 col-span-12 flex flex-col justify-between gap-10 md:col-span-8 lg:order-1 lg:col-span-4 xl:col-span-3">
            <div className="grid gap-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
            <Skeleton className="h-64 border border-line-strong" />
          </div>
          <Skeleton className="order-1 col-span-12 aspect-[4/3] md:aspect-[16/9] lg:order-2 lg:col-span-8 lg:mr-[calc(var(--pad-r)*-1)] lg:aspect-auto lg:min-h-[clamp(360px,56svh,760px)] xl:col-span-9" />
        </div>
      </div>
    </Section>
  )
}
