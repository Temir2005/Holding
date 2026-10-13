import { ExternalLink, KeyRound, LogOut, Monitor, Moon, Sun, UserRound } from 'lucide-react'
import { useState } from 'react'
import { logout } from '../api/auth'
import { useT } from '../i18n'
import { ChangePasswordDialog } from '../session/ChangePasswordDialog'
import { useCurrentUser } from '../session/context'
import { IconButton } from '../ui/IconButton'
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from '../ui/Menu'
import { useToast } from '../ui/toast-context'
import { Tooltip } from '../ui/Tooltip'
import { THEME_CHOICES, type ThemeChoice } from './theme'

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon }

interface TopbarProps {
  theme: ThemeChoice
  onThemeChange: (theme: ThemeChoice) => void
}

export function Topbar({ theme, onThemeChange }: TopbarProps) {
  const t = useT()
  const toast = useToast()
  const user = useCurrentUser()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const ThemeIcon = THEME_ICON[theme]

  const onLogout = () => {
    // The session ends locally either way; a failed request only leaves the cookie to expire.
    logout().catch((error: unknown) => toast.error(error))
  }

  return (
    <header className="sticky top-0 z-nav flex h-topbar items-center gap-2 border-b border-line bg-panel/95 px-3 backdrop-blur md:px-4">
      <span className="flex items-center gap-2 font-semibold md:hidden">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded bg-accent font-mono text-xs font-bold text-on-accent"
        >
          M
        </span>
        {t('app.brand')}
      </span>
      <div className="flex-1" />

      <Tooltip label={t('app.openSite')}>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          aria-label={t('app.openSite')}
          className="inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded px-2 text-sm text-mute hover:bg-sunken hover:text-fg md:min-h-9"
        >
          <ExternalLink size={18} aria-hidden="true" />
          <span className="hidden xl:inline">{t('app.openSite')}</span>
        </a>
      </Tooltip>

      <Menu>
        <MenuTrigger asChild>
          <IconButton label={t('theme.label')} icon={<ThemeIcon size={18} aria-hidden="true" />} />
        </MenuTrigger>
        <MenuContent>
          <MenuLabel>{t('theme.label')}</MenuLabel>
          <MenuRadioGroup value={theme} onValueChange={(v) => onThemeChange(v as ThemeChoice)}>
            {THEME_CHOICES.map((choice) => (
              <MenuRadioItem key={choice} value={choice}>
                {t(`theme.${choice}`)}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>

      <Menu>
        <MenuTrigger asChild>
          <IconButton label={t('account.menu')} icon={<UserRound size={18} aria-hidden="true" />} />
        </MenuTrigger>
        <MenuContent>
          <div className="flex flex-col px-2 py-1.5">
            <span className="truncate text-sm font-medium">{user.full_name}</span>
            <span className="truncate text-xs text-mute">{user.email}</span>
            <span className="text-xs text-mute">{t(`roles.${user.role}`)}</span>
          </div>
          <MenuSeparator />
          <MenuItem icon={<KeyRound size={16} />} onSelect={() => setPasswordOpen(true)}>
            {t('account.changePassword')}
          </MenuItem>
          <MenuItem icon={<LogOut size={16} />} onSelect={onLogout}>
            {t('account.logout')}
          </MenuItem>
        </MenuContent>
      </Menu>

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </header>
  )
}
