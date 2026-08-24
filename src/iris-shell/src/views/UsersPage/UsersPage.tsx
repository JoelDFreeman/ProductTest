import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AppShell } from '../AppShell/AppShell.js';
import { navigate } from '../../lib/router.js';
import { useUsers } from '../../lib/usersStore.js';
import { useDirectory } from '../../lib/directoryStore.js';
import { showToast } from '../../lib/toastStore.js';
import { useAppShell } from '../../lib/appShellContext.js';
import { cx } from '../../lib/cx.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { IconButton } from '../../components/IconButton/IconButton.js';
import { Icon } from '../../components/Icon/Icon.js';
import { Avatar } from '../../components/Avatar/Avatar.js';
import { Menu, type MenuEntry } from '../../components/Menu/Menu.js';
import { Button } from '../../components/Button/Button.js';
import { Badge, type BadgeTone } from '../../components/Badge/Badge.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { Link } from '../../components/Link/Link.js';
import { ContentHeader } from '../../components/ContentHeader/ContentHeader.js';
import { DataTable, type DataTableColumn, type RowKey } from '../../components/DataTable/DataTable.js';
import { Pagination } from '../../components/Pagination/Pagination.js';
import { ActionBar } from '../../components/ActionBar/ActionBar.js';
import { ResetPasswordModal } from '../UserDetailPage/ResetPasswordModal/ResetPasswordModal.js';
import { DeleteUserModal } from '../UserDetailPage/DeleteUserModal/DeleteUserModal.js';
import { NewUserModal, type NewUserModalProps } from './NewUserModal.js';
import type { User } from './mockUsers.js';
import styles from './UsersPage.module.css';
import { useAdvancedSearch } from '../../lib/advancedSearchStore.js';
import { AdvancedSearchButton } from '../../components/AdvancedSearch/AdvancedSearchButton.js';
import { AppliedFiltersEmptyState } from '../../components/AdvancedSearch/AppliedFiltersEmptyState.js';
import { isActiveDirectoryLocation } from '../../lib/directoryData.js';

/** Map a status string to its semantic badge tone. */
function statusBadge(status: string): { tone: BadgeTone } {
  switch (status.toLowerCase()) {
    case 'active':
      return { tone: 'success' };
    case 'inactive':
    case 'disabled':
      return { tone: 'error' };
    case 'unknown':
    case 'pending':
      return { tone: 'warning' };
    default:
      return { tone: 'neutral' };
  }
}

/** Copy → Check icon swap for the Object ID copy action — two icons in one
 *  slot that cross-fade when `copied` flips (mirrors the reset-password and
 *  AI-panel copy affordances). */
function CopyCheckSwap({ copied }: { copied: boolean }) {
  return (
    <span
      className={styles.copySwap}
      data-copied={copied ? 'true' : 'false'}
      aria-hidden="true"
    >
      <span className={cx(styles.copySwapLayer, styles.copySwapCopy)}>
        <Icon name="Copy" size="16px" />
      </span>
      <span className={cx(styles.copySwapLayer, styles.copySwapCheck)}>
        <Icon name="CheckCircle" size="16px" />
      </span>
    </span>
  );
}

/** Object ID copy button with a transient "copied" confirmation. Lives as its
 *  own component so each row keeps independent copy state (the columns are
 *  defined at module scope and can't hold hooks). */
function CopyObjectIdButton({ objectId, userName }: { objectId: string; userName: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    // Clipboard API first; fall back to a hidden textarea for insecure
    // contexts. Feedback is best-effort — acknowledge the click regardless.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(objectId);
      } else {
        throw new Error('clipboard-unavailable');
      }
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = objectId;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        /* both paths failed */
      }
    }
    setCopied(true);
  };

  return (
    <IconButton
      icon={<CopyCheckSwap copied={copied} />}
      ariaLabel={copied ? 'Object ID copied' : `Copy Object ID for ${userName}`}
      size="s"
      className={cx(styles.copyBtn, copied && styles.copyBtnDone)}
      onClick={handleCopy}
    />
  );
}

const COLUMNS: DataTableColumn<User>[] = [
  {
    key: 'name',
    header: 'Displayname',
    icon: 'IdentificationCard',
    width: '180px',
    cell: (u) => (
      <Link
        href={`#/users/${u.id}`}
        className={styles.nameCell}
        onClick={(e: MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          navigate(`#/users/${u.id}?tab=overview`);
        }}
      >
        <span className={styles.nameContent}>
          <Avatar src={u.avatarUrl} name={u.name} size="s" />
          <span>{u.name}</span>
        </span>
      </Link>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    icon: 'UserCircleCheck',
    width: '128px',
    cell: (u) => {
      const { tone } = statusBadge(u.status);
      return (
        <Badge tone={tone} className={styles.statusBadge}>
          {u.status}
        </Badge>
      );
    },
  },
  {
    key: 'description',
    header: 'Description',
    icon: 'ArticleNyTimes',
    minWidth: '224px',
    maxWidth: '480px',
    grow: 2,
    cell: (u) => <span title={u.description}>{u.description}</span>,
  },
  {
    key: 'tags',
    header: 'Tags',
    icon: 'Tag',
    minWidth: '190px',
    maxWidth: '320px',
    grow: 1,
    cell: (u) => (
      <span className={styles.tagsCell}>
        {getTags(u).map((tag) => (
          <span key={tag} className={styles.tag}>
            <Icon name="X" size="12px" />
            <span>{tag}</span>
          </span>
        ))}
      </span>
    ),
  },
  {
    key: 'location',
    header: 'Location',
    icon: 'BuildingOffice',
    width: '180px',
    cell: (u) => <span>{getLocation(u)}</span>,
  },
];

function getTags(user: User): string[] {
  return user.tags ?? (user.status.toLowerCase() === 'active' ? ['HR', 'Engineering'] : ['Security', 'Platform']);
}

function getLocation(user: User): string {
  return user.location ?? 'Entra 1';
}

function directoryKey(location: string): string {
  if (location === 'Entra 2') return 'entra-2';
  if (location.startsWith('AD-1\\')) return 'ad-1';
  if (location.startsWith('AD-2\\')) return 'ad-2';
  return 'entra-1';
}

/** Page-level actions shown in the heading's overflow menu. */
const PAGE_ACTIONS_MENU_ITEMS: MenuEntry[] = [
  { kind: 'item', label: 'Customize', icon: 'Pencil' },
  { kind: 'divider' },
  { kind: 'item', label: 'Add to favorites', icon: 'Star' },
  { kind: 'divider' },
  { kind: 'item', label: 'Ask AI', icon: 'Sparkle' },
];

const TABLE_SETTINGS_MENU_ITEMS: MenuEntry[] = [
  { kind: 'item', label: 'Adjust columns', icon: 'Columns' },
  { kind: 'item', label: 'Add columns', icon: 'ColumnsPlusLeft' },
  { kind: 'divider' },
  { kind: 'item', label: 'Export', icon: 'Export' },
  { kind: 'divider' },
  { kind: 'item', label: 'Ask AI', icon: 'Sparkle' },
];

/** Items-per-page choices offered below the users table. */
const PAGE_SIZE_OPTIONS = [15, 20, 30, 40, 50];

/**
 * UsersPage — the Directory Management → Users listing view.
 */
export function UsersPage() {
  const { openSearch, appliedFilters } = useAdvancedSearch();
  const { users, addUser } = useUsers();
  const { selectedDirectories } = useDirectory();
  const { aiOpen, setAiOpen, setAiContext } = useAppShell();
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserKind, setNewUserKind] = useState<'entra' | 'ad'>('entra');
  const createMenuItems = useMemo<MenuEntry[]>(() => {
    const entraSelected = selectedDirectories.has('entra-1') || selectedDirectories.has('entra-2');
    const adSelected = selectedDirectories.has('ad-1') || selectedDirectories.has('ad-2');
    const items: MenuEntry[] = [];
    if (entraSelected) items.push({ kind: 'item', label: 'New Entra user', icon: 'WindowsLogo', onSelect: () => { setNewUserKind('entra'); setNewUserOpen(true); } });
    if (adSelected) {
      if (items.length > 0) items.push({ kind: 'divider' });
      items.push({ kind: 'item', label: 'New AD user', icon: 'WindowsLogo', onSelect: () => { setNewUserKind('ad'); setNewUserOpen(true); } });
    }
    if (items.length > 0) items.push({ kind: 'divider' });
    items.push({ kind: 'item', label: 'Add user', icon: 'Plus' });
    return items;
  }, [selectedDirectories]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [selected, setSelected] = useState<Set<RowKey>>(() => new Set());

  // Which user (if any) has a row-action modal open. `null` = closed.
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const rows = useMemo<User[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = users.filter((u) => selectedDirectories.has(directoryKey(getLocation(u))) &&
      [u.name, u.description, u.email, u.objectId].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
    return filtered.filter((user) =>
      appliedFilters.every((filter) => {
        if (!filter.value) return true;
        if (filter.fieldId === 'tags') return getTags(user).includes(filter.value);
        if (filter.fieldId === 'location') return getLocation(user) === filter.value;
        if (filter.fieldId === 'displayName') return user.details.displayName.toLowerCase().includes(filter.value.toLowerCase());
        if (filter.fieldId === 'objectType') return 'user'.includes(filter.value.toLowerCase());
        return true;
      }),
    );
  }, [users, query, appliedFilters, selectedDirectories]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo<User[]>(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  // Changing the page size keeps the first currently-visible row in view so the
  // user isn't thrown to an unrelated part of the list (and never stranded on a
  // now-nonexistent page).
  const handlePageSizeChange = (nextSize: number) => {
    const firstVisibleIndex = (safePage - 1) * pageSize;
    setPageSize(nextSize);
    setPage(Math.floor(firstVisibleIndex / nextSize) + 1);
  };

  // Quick-action menu shown from each row's trailing "more" button. Reset
  // password and Delete open their respective modals; the rest are PoC no-ops.
  const rowMenuItems = (u: User): MenuEntry[] => [
    { kind: 'item', label: 'Reset password', icon: 'Password', onSelect: () => setResetUser(u) },
    { kind: 'item', label: 'Copy', icon: 'Copy' },
    { kind: 'item', label: 'Move', icon: 'Folder' },
    { kind: 'item', label: 'Properties', icon: 'UserList', onSelect: () => navigate(`#/users/${u.id}?tab=general`) },
    { kind: 'divider' },
    { kind: 'item', label: 'Connections', icon: 'Plugs', onSelect: () => navigate(`#/users/${u.id}?tab=connections`) },
    { kind: 'item', label: 'Managed units', icon: 'Cube', onSelect: () => navigate(`#/users/${u.id}?tab=managed-units`) },
    { kind: 'item', label: 'Memberships', icon: 'UsersThree', onSelect: () => navigate(`#/users/${u.id}?tab=memberships`) },
    { kind: 'item', label: 'Roles', icon: 'IdentificationBadge', onSelect: () => navigate(`#/users/${u.id}?tab=roles`) },
    { kind: 'divider' },
    { kind: 'item', label: 'Deprovision', icon: 'Prohibit', danger: true },
    { kind: 'item', label: 'Deactivate', icon: 'XCircle', danger: true },
    { kind: 'item', label: 'Delete', icon: 'Trash', danger: true, onSelect: () => setDeleteUser(u) },
  ];

  return (
    <AppShell
      breadcrumb={[{ label: 'Directory Management' }, { label: 'Users' }]}
    >
      <ContentHeader
        icon="Users"
        title="Users"
        actions={
          <Menu
            ariaLabel="Page actions"
            align="end"
            items={PAGE_ACTIONS_MENU_ITEMS}
            trigger={({ ref, onClick, expanded }) => (
              <Tooltip label="More options">
                <IconButton
                  ref={ref as React.Ref<HTMLButtonElement>}
                  icon="DotsThree"
                  ariaLabel="Page actions"
                  aria-haspopup="menu"
                  aria-expanded={expanded}
                  onClick={onClick}
                />
              </Tooltip>
            )}
          />
        }
        search={
          <TextInput
            iconLead="MagnifyingGlass"
            placeholder="Search by name, email, or object ID"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            aria-label="Search users"
          />
        }
        toolbarActions={
          <>
            <span className={styles.toolbarSeparator} aria-hidden="true" />
            <AdvancedSearchButton shortcut={['⌘', '⇧', 'F']} />
            <Menu
              ariaLabel="Create options"
              align="end"
              items={createMenuItems}
              trigger={({ ref, onClick, expanded }) => (
                <Button
                  ref={ref as React.Ref<HTMLButtonElement>}
                  variant="primary"
                  iconLead="Plus"
                  iconTrail="CaretDown"
                  className={styles.addBtn}
                  aria-haspopup="menu"
                  aria-expanded={expanded}
                  onClick={onClick}
                >
                  Create
                </Button>
              )}
            />
          </>
        }
      />

      <div className={styles.tableWrap}>
        <DataTable
          rows={pageRows}
          columns={COLUMNS}
          ariaLabel="Users"
          appearance="light"
          selected={selected}
          onSelectionChange={setSelected}
          rowLabel={(u) => u.name}
          rowActions={(u) => (
            <Menu
              ariaLabel={`Actions for ${u.name}`}
              align="end"
              items={rowMenuItems(u)}
              trigger={({ ref, onClick, expanded }) => (
                <IconButton
                  ref={ref as React.Ref<HTMLButtonElement>}
                  icon="DotsThree"
                  ariaLabel={`Actions for ${u.name}`}
                  size="s"
                  aria-haspopup="menu"
                  aria-expanded={expanded}
                  onClick={onClick}
                />
              )}
            />
          )}
          headerAction={
            <Menu
              ariaLabel="Table settings"
              align="end"
              items={TABLE_SETTINGS_MENU_ITEMS}
              trigger={({ ref, onClick, expanded }) => (
                <IconButton
                  ref={ref as React.Ref<HTMLButtonElement>}
                  icon="SlidersHorizontal"
                  ariaLabel="Table settings"
                  size="s"
                  aria-haspopup="menu"
                  aria-expanded={expanded}
                  onClick={onClick}
                />
              )}
            />
          }
          emptyContent={appliedFilters.length > 0 && !query ? <AppliedFiltersEmptyState /> : undefined}
          emptyState={
            query
              ? {
                  title: 'No matching users',
                  description: `No users match “${query}”.`,
                  actionLabel: 'Clear search',
                  onAction: () => {
                    setQuery('');
                    setPage(1);
                  },
                }
              : { title: 'No users yet', description: 'Add your first user to get started.' }
          }
        />
      </div>

      {pageCount > 1 && (
        <div className={styles.pagination}>
          <Pagination
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            pageSizeSuffix="/ Page"
            showBoundaryControls
            appearance="compact"
            ariaLabel="Users pages"
          />
        </div>
      )}

      <ActionBar
        open={selected.size > 0}
        selectedCount={selected.size}
        totalCount={users.length}
        layout="inline"
        onDismiss={() => setSelected(new Set())}
        groups={[
          [
            {
              icon: 'SelectionAll',
              label: 'Select all',
              iconOnly: aiOpen,
              onClick: () => setSelected(new Set(users.map((u) => u.id))),
            },
            { icon: 'Copy', label: 'Copy', iconOnly: aiOpen, onClick: () => undefined },
            { icon: 'Folder', label: 'Move', iconOnly: aiOpen, onClick: () => undefined },
            {
              icon: 'UserList',
              label: 'Properties',
              iconOnly: aiOpen,
              onClick: () => {
                const selectedUser = users.find((user) => selected.has(user.id));
                if (selectedUser) navigate(`#/users/${selectedUser.id}?tab=general`);
              },
            },
            {
              icon: 'Sparkle',
              label: 'Ask AI',
              tone: 'brand',
              beam: true,
              onClick: () => {
                setAiContext(
                  [...selected].flatMap((id) => {
                    const u = users.find((x) => x.id === id);
                    return u ? [{ kind: 'user' as const, id: u.id, label: u.name }] : [];
                  }),
                );
                setAiOpen(true);
              },
            },
          ],
          [
            {
              icon: 'Trash',
              label: 'Delete',
              tone: 'danger',
              iconOnly: aiOpen,
              onClick: () => undefined,
            },
          ],
        ]}
      />

      {resetUser && (
        <ResetPasswordModal
          open
          onClose={() => setResetUser(null)}
          user={{
            name: resetUser.name,
            username: resetUser.details.login,
            displayName: resetUser.details.displayName,
            location: resetUser.location,
          }}
          mode={isActiveDirectoryLocation(resetUser.location) ? 'ad' : 'entra'}
        />
      )}
      {deleteUser && (
        <DeleteUserModal open onClose={() => setDeleteUser(null)} user={deleteUser} />
      )}
      <NewUserModal
        open={newUserOpen}
        objectKind={newUserKind}
        directories={newUserKind === 'ad'
          ? ['AD-1', 'AD-2'].filter((directory) => selectedDirectories.has(directory === 'AD-1' ? 'ad-1' : 'ad-2'))
          : ['Entra 1', 'Entra 2'].filter((directory) => selectedDirectories.has(directory === 'Entra 1' ? 'entra-1' : 'entra-2'))}
        onClose={() => setNewUserOpen(false)}
        onCreate={(draft: Parameters<NewUserModalProps['onCreate']>[0]) => {
          const fullName = `${draft.firstName} ${draft.lastName}`.trim();
          const createdUser: User = {
            id: `${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
            name: fullName,
            status: draft.inactive ? 'Inactive' : 'Active',
            description: `Newly created ${newUserKind === 'ad' ? 'AD' : 'Entra'} user.`,
            email: `${draft.userLogonName.toLowerCase()}@example.com`,
            objectId: `new-${Date.now()}`,
            location: draft.directory,
            tags: ['New'],
            details: {
              firstName: draft.firstName,
              lastName: draft.lastName,
              fullName,
              displayName: draft.displayName,
              userPrincipalName: `${draft.userLogonName}@${draft.directory.replace(/[^a-zA-Z0-9]/g, '')}`,
              authorizationInfo: '',
              directory: draft.directory.replace(/[^a-zA-Z0-9]/g, ''),
              initials: draft.initials,
              longDescription: 'Newly created Entra user.',
              city: '', state: '', postalCode: '', country: '', businessPhone: '', mobilePhone: '',
              email: `${draft.userLogonName.toLowerCase()}@example.com`, otherEmails: '', faxPhone: '',
              mailNickname: draft.name, jobTitle: '', companyName: '', department: '', employeeId: '',
              employeeType: '', hireDate: '', login: draft.userLogonName, type: 'User', managementUnit: 'Management',
            },
          };
          addUser(createdUser);
          showToast(
            `${fullName} successfully created`,
            () => navigate(`#/users/${createdUser.id}?tab=overview`),
            `User created in ${draft.directory}. To open it, click View.`,
          );
        }}
      />
    </AppShell>
  );
}
