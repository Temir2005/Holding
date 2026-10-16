import { useQuery } from '@tanstack/react-query'
import { KeyRound, MoreVertical, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { metaQuery } from '../../api/queries'
import { usersQuery, type AdminUser } from '../../api/users'
import { useT } from '../../i18n'
import { useCurrentUser } from '../../session/context'
import { Button } from '../../ui/Button'
import { Badge, ErrorState, Skeleton } from '../../ui/feedback'
import { IconButton } from '../../ui/IconButton'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../ui/Menu'
import { optionLabel } from '../leads/leadUpdate'
import { formatDate } from '../media/format'
import { PageTitle } from '../Placeholder'
import { PasswordDialog, UserDialog } from './UserDialogs'

function UserRow({
  user,
  isSelf,
  onEdit,
  onPassword,
}: {
  user: AdminUser
  isSelf: boolean
  onEdit: () => void
  onPassword: () => void
}) {
  const t = useT()
  const { data: meta } = useQuery(metaQuery())
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-panel p-3 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{user.full_name}</span>
          {isSelf && <Badge tone="info">{t('users.you')}</Badge>}
        </span>
        <span className="truncate text-xs text-mute">{user.email}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <Badge tone={user.role === 'admin' ? 'warning' : 'neutral'}>
          {optionLabel(meta, 'user_roles', user.role)}
        </Badge>
        {user.is_active ? (
          <Badge tone="success">{t('users.activeBadge')}</Badge>
        ) : (
          <Badge tone="danger">{t('users.inactiveBadge')}</Badge>
        )}
      </span>
      <span className="basis-full text-xs text-mute md:basis-auto">
        {user.last_login_at
          ? t('users.lastLogin', { date: formatDate(user.last_login_at) })
          : t('users.neverLoggedIn')}
      </span>
      <Menu>
        <MenuTrigger asChild>
          <IconButton
            label={t('users.actions', { name: user.full_name })}
            icon={<MoreVertical size={16} aria-hidden="true" />}
            className="ml-auto md:ml-0"
          />
        </MenuTrigger>
        <MenuContent>
          <MenuItem icon={<Pencil size={16} />} onSelect={onEdit}>
            {t('users.edit')}
          </MenuItem>
          {/* One's own password is changed in the profile menu, with the current one. */}
          {!isSelf && (
            <MenuItem icon={<KeyRound size={16} />} onSelect={onPassword}>
              {t('users.setPassword')}
            </MenuItem>
          )}
        </MenuContent>
      </Menu>
    </li>
  )
}

/** Admin users (admin only): create, role, disable and enable, new password. */
export function UsersPage() {
  const t = useT()
  const me = useCurrentUser()
  const { data, isPending, isError, refetch } = useQuery(usersQuery())
  const users = data?.items ?? []
  // undefined: closed; null: a new user.
  const [editing, setEditing] = useState<AdminUser | null | undefined>(undefined)
  const [passwordFor, setPasswordFor] = useState<AdminUser | null>(null)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
        <PageTitle>{t('nav.users')}</PageTitle>
        <Button
          variant="primary"
          icon={<Plus size={16} aria-hidden="true" />}
          onClick={() => setEditing(null)}
        >
          {t('users.new')}
        </Button>
      </div>
      {isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : isError || users.length === 0 ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t('nav.users')}>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isSelf={user.id === me.id}
              onEdit={() => setEditing(user)}
              onPassword={() => setPasswordFor(user)}
            />
          ))}
        </ul>
      )}
      {editing !== undefined && (
        <UserDialog
          key={editing ? `${editing.id}-${editing.version}` : 'new'}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          user={editing}
          isSelf={editing?.id === me.id}
        />
      )}
      <PasswordDialog user={passwordFor} onClose={() => setPasswordFor(null)} />
    </>
  )
}
