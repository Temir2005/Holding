import { cn } from '@/lib/cn'
import { useT } from '../../i18n'
import { useSchemaFormContext } from './context'

/** One language switch for the whole form: translators fill a block language by language. */
export function LocaleSwitch() {
  const t = useT()
  const { locales, locale, setLocale } = useSchemaFormContext()
  if (locales.length < 2) return null
  return (
    <div
      role="group"
      aria-label={t('form.locale.label')}
      className="inline-flex rounded border border-line-strong bg-panel p-0.5"
    >
      {locales.map((l) => (
        <button
          key={l.code}
          type="button"
          aria-pressed={l.code === locale}
          title={l.title}
          onClick={() => setLocale(l.code)}
          className={cn(
            'min-h-touch min-w-touch rounded px-3 font-mono text-sm md:min-h-8 md:min-w-10',
            l.code === locale ? 'bg-fg text-canvas' : 'text-mute hover:text-fg',
          )}
        >
          {t(`locales.short.${l.code}`, { defaultValue: l.code.toUpperCase() })}
        </button>
      ))}
    </div>
  )
}
