import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DataTable,
  ErrorState,
  FormField,
  Input,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge,
  Tabs,
  toast,
} from '@/shared/ui'
import { useListParams } from '@/shared/hooks/useListParams'
import { toastApiError } from '@/shared/hooks/useMutationToast'
import { useCan } from '@/shared/auth/useAuth'
import { cn } from '@/shared/lib/cn'
import { formatDateTime } from '@/shared/lib/format'
import { PERMISSIONS, PERMISSION_GROUPS, type Permission } from '@/shared/auth/permissions'
import type { AdminUser, Role } from '@/shared/types/domain'
import {
  useAdmins,
  useInviteAdmin,
  useRoles,
  useSaveRole,
  useUpdateAdmin,
} from './api'

// ── Invite admin modal ───────────────────────────────────────────────────────
function InviteModal({
  open,
  onClose,
  roles,
}: {
  open: boolean
  onClose: () => void
  roles: Role[]
}) {
  const invite = useInviteAdmin()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  function toggleRole(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((r) => r !== id) : [...s, id]))
  }

  function reset() {
    setEmail('')
    setName('')
    setSelected([])
  }

  function close() {
    reset()
    onClose()
  }

  function submit() {
    invite.mutate(
      { email: email.trim(), name: name.trim(), roles: selected },
      {
        onSuccess: () => {
          toast.success('Invite sent')
          close()
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  const canSubmit = email.trim().length > 0 && name.trim().length > 0

  return (
    <Modal
      open={open}
      onClose={close}
      title="Invite admin"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={invite.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={invite.isPending} disabled={!canSubmit}>
            Send invite
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Email" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Roles">
          <div className="space-y-1.5">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  onChange={() => toggleRole(r.id)}
                />
                {r.name}
              </label>
            ))}
            {roles.length === 0 && (
              <p className="text-xs text-muted-foreground">No roles defined.</p>
            )}
          </div>
        </FormField>
      </div>
    </Modal>
  )
}

// ── Per-row admin actions ────────────────────────────────────────────────────
function AdminRowActions({ admin }: { admin: AdminUser }) {
  const update = useUpdateAdmin(admin.id)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const disabled = admin.status === 'disabled'

  function setStatus() {
    update.mutate(
      { status: disabled ? 'active' : 'disabled' },
      {
        onSuccess: () => {
          toast.success(disabled ? 'Admin enabled' : 'Admin disabled')
          setConfirmDisable(false)
        },
        onError: (e) => toastApiError(e),
      },
    )
  }

  function toggleTotp() {
    update.mutate(
      { totpEnabled: !admin.totpEnabled },
      {
        onSuccess: () => toast.success(admin.totpEnabled ? 'TOTP requirement lifted' : 'TOTP enforced'),
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        loading={update.isPending}
        onClick={(e) => {
          e.stopPropagation()
          toggleTotp()
        }}
      >
        {admin.totpEnabled ? 'Unenforce TOTP' : 'Enforce TOTP'}
      </Button>
      <Button
        size="sm"
        variant={disabled ? 'secondary' : 'danger'}
        loading={update.isPending}
        onClick={(e) => {
          e.stopPropagation()
          if (disabled) setStatus()
          else setConfirmDisable(true)
        }}
      >
        {disabled ? 'Enable' : 'Disable'}
      </Button>
      <ConfirmDialog
        open={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        onConfirm={() => setStatus()}
        title="Disable admin?"
        description={`${admin.name} (${admin.email}) will lose console access immediately.`}
        confirmLabel="Disable admin"
        variant="danger"
        loading={update.isPending}
      />
    </div>
  )
}

// ── Admins tab ───────────────────────────────────────────────────────────────
function AdminsTab() {
  const canManage = useCan('admin.manage')
  const { state, apiParams, setPage } = useListParams()
  const query = useAdmins(apiParams)
  const roles = useRoles()
  const [inviteOpen, setInviteOpen] = useState(false)

  const columns = useMemo<ColumnDef<AdminUser, unknown>[]>(
    () => [
      { id: 'email', header: 'Email', accessorKey: 'email' },
      { id: 'name', header: 'Name', accessorKey: 'name' },
      {
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) => row.original.roles.join(', ') || '—',
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'totpEnabled',
        header: 'TOTP',
        cell: ({ row }) => (
          <Badge tone={row.original.totpEnabled ? 'green' : 'grey'}>
            {row.original.totpEnabled ? 'On' : 'Off'}
          </Badge>
        ),
      },
      {
        id: 'lastLoginAt',
        header: 'Last login',
        cell: ({ row }) =>
          row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : '—',
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: '',
              cell: ({ row }: { row: { original: AdminUser } }) => (
                <AdminRowActions admin={row.original} />
              ),
            } as ColumnDef<AdminUser, unknown>,
          ]
        : []),
    ],
    [canManage],
  )

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setInviteOpen(true)}>Invite admin</Button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={query.data?.data}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        emptyTitle="No admins"
      />
      <Pagination
        page={state.page}
        limit={state.limit}
        total={query.data?.total ?? 0}
        onPageChange={setPage}
      />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} roles={roles.data ?? []} />
    </div>
  )
}

// ── Role editor ──────────────────────────────────────────────────────────────
function RoleEditor({ role }: { role: Role | null }) {
  const save = useSaveRole(role?.id)
  const [name, setName] = useState(role?.name ?? '')
  const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissions ?? []))

  useEffect(() => {
    setName(role?.name ?? '')
    setPerms(new Set(role?.permissions ?? []))
  }, [role])

  function toggle(p: Permission) {
    setPerms((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  function submit() {
    save.mutate(
      { name: name.trim(), permissions: PERMISSIONS.filter((p) => perms.has(p)) },
      {
        onSuccess: () => toast.success(role ? 'Role updated' : 'Role created'),
        onError: (e) => toastApiError(e),
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{role ? `Edit role: ${role.name}` : 'Create role'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Role name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Agent" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.domain} className="rounded-md border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.domain}
              </p>
              <div className="space-y-1.5">
                {group.permissions.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={perms.has(p)} onChange={() => toggle(p)} />
                    <span className="font-mono text-xs">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} loading={save.isPending} disabled={!name.trim()}>
            {role ? 'Save role' : 'Create role'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Roles tab ────────────────────────────────────────────────────────────────
function RolesTab() {
  const canManage = useCan('admin.manage')
  const roles = useRoles()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  if (roles.isLoading) return <LoadingState />
  if (roles.isError) return <ErrorState error={roles.error} onRetry={() => roles.refetch()} />

  const list = roles.data ?? []
  const selected = creating ? null : list.find((r) => r.id === selectedId) ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-medium">Roles</span>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCreating(true)
                setSelectedId(null)
              }}
            >
              Create role
            </Button>
          )}
        </div>
        <div>
          {list.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setCreating(false)
                setSelectedId(r.id)
              }}
              className={cn(
                'flex w-full flex-col items-start border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-0 hover:bg-muted/40',
                !creating && selectedId === r.id && 'bg-brand-50/60',
              )}
            >
              <span className="font-medium">{r.name}</span>
              <span className="text-xs text-muted-foreground">
                {r.permissions.length} permission(s)
              </span>
            </button>
          ))}
          {list.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No roles.</p>
          )}
        </div>
      </Card>

      <div>
        {!canManage ? (
          selected ? (
            <Card>
              <CardHeader>
                <CardTitle>{selected.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {selected.permissions.map((p) => (
                  <Badge key={p} tone="grey">
                    {p}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Select a role to view its permissions.
              </CardContent>
            </Card>
          )
        ) : creating || selected ? (
          <RoleEditor key={selected?.id ?? 'new'} role={selected} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Select a role to edit, or create a new one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export function AdminsPage() {
  const [tab, setTab] = useState('admins')

  return (
    <div className="space-y-4">
      <PageHeader title="Admins & Roles" description="Manage who can do what." />
      <Tabs
        tabs={[
          { value: 'admins', label: 'Admins' },
          { value: 'roles', label: 'Roles' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'admins' ? <AdminsTab /> : <RolesTab />}
    </div>
  )
}
