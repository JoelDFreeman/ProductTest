import { useEffect, useState, type MouseEvent, type Ref } from 'react';
import { AppShell } from '../AppShell/AppShell.js';
import { navigate, useRoute } from '../../lib/router.js';
import { useUsers, type UserPatch } from '../../lib/usersStore.js';
import { isTypingTarget } from '../../lib/keyboard.js';
import { Tabs } from '../../components/Tabs/Tabs.js';
import { ContentHeader } from '../../components/ContentHeader/ContentHeader.js';
import { IconButton } from '../../components/IconButton/IconButton.js';
import { Button } from '../../components/Button/Button.js';
import { Card } from '../../components/Card/Card.js';
import { Link, type LinkTone } from '../../components/Link/Link.js';
import { Menu } from '../../components/Menu/Menu.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { InlinePropertiesCard } from './InlinePropertiesCard.js';
import { InlineUserDetailsCard } from './InlineUserDetailsCard.js';
import { OverviewSummary } from './OverviewSummary.js';
import { ResetPasswordModal } from './ResetPasswordModal/ResetPasswordModal.js';
import { DeleteUserModal } from './DeleteUserModal/DeleteUserModal.js';
import type { User } from '../UsersPage/mockUsers.js';
import styles from './UserDetailPage.module.css';

const TABS = [
  { value: 'overview', label: 'Overview', icon: 'Briefcase' },
  { value: 'general', label: 'General' },
  { value: 'user-details', label: 'User Details' },
  { value: 'account', label: 'Account' },
  { value: 'connections', label: 'Connections' },
  { value: 'memberships', label: 'Memberships (8)' },
  { value: 'managed-units', label: 'Managed Units' },
  { value: 'roles', label: 'Roles' },
  { value: 'authorization', label: 'Authorization' },
  { value: 'object', label: 'Object' },
  { value: 'history', label: 'History' },
];

export interface UserDetailPageProps {
  userId: string;
}

/**
 * UserDetailPage — single-user view rendered inside the AppShell.
 *
 * Falls back to a "not found" panel if the id can't be resolved.
 */
export function UserDetailPage({ userId }: UserDetailPageProps) {
  const { users, getUser, getUserIndex, updateUser } = useUsers();
  const route = useRoute();
  const user = getUser(userId);
  const [tab, setTab] = useState(() => route.name === 'userDetail' ? route.params.tab ?? 'general' : 'general');
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  /* ---- J / K jump to the next / previous user (Gmail/GitHub style) ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      // Don't hijack the keys while the user is typing in a field.
      if (isTypingTarget(e.target)) return;
      // Don't navigate away while a modal dialog (edit sheet, reset-password
      // modal) or a menu is open — those trap focus and own the interaction.
      if (document.querySelector('[aria-modal="true"], [role="menu"]')) return;
      const key = e.key.toLowerCase();
      if (key !== 'j' && key !== 'k') return;
      const i = getUserIndex(userId);
      if (i < 0) return;
      const target = key === 'j' ? users[i + 1] : users[i - 1];
      if (target) {
        e.preventDefault();
        navigate(`#/users/${target.id}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [users, userId, getUserIndex]);

  if (!user) {
    return (
      <AppShell
        breadcrumb={[
          { label: 'Directory Management' },
          { label: 'Users', onClick: () => navigate('#/users') },
          { label: 'Not found' },
        ]}
      >
        <div className={styles.missing}>
          <h1 className={styles.missingTitle}>User not found</h1>
          <p className={styles.missingBody}>
            We couldn’t find a user with id <code>{userId}</code>.
          </p>
          <Button variant="secondary" onClick={() => navigate('#/users')}>
            Back to Users
          </Button>
        </div>
      </AppShell>
    );
  }

  const idx = getUserIndex(userId);
  const prevUser = users[idx - 1] ?? null;
  const nextUser = users[idx + 1] ?? null;
  const d = user.details;

  return (
    <AppShell
      breadcrumb={[
        { label: 'Directory Management' },
        { label: 'Users', onClick: () => navigate('#/users') },
        { label: user.name },
      ]}
    >
      <ContentHeader
        variant="detail"
        icon="IdentificationCard"
        iconLabel={`${user.name} avatar`}
        title={
          <>
            {user.name} <span className={styles.titleAlias}>({d.displayName})</span>
          </>
        }
        subtitle={d.login}
        onBack={() => navigate('#/users')}
        backLabel="Back to Users"
        actions={
          <>
            <Tooltip label="Previous user" shortcut={['K']}>
              <IconButton
                icon="CaretDown"
                ariaLabel="Previous user"
                onClick={() => prevUser && navigate(`#/users/${prevUser.id}`)}
                disabled={!prevUser}
              />
            </Tooltip>
            <Tooltip label="Next user" shortcut={['J']}>
              <IconButton
                icon="CaretUp"
                ariaLabel="Next user"
                onClick={() => nextUser && navigate(`#/users/${nextUser.id}`)}
                disabled={!nextUser}
              />
            </Tooltip>
            <Menu
              ariaLabel="User actions"
              align="end"
              items={[
                { kind: 'item', label: 'Reset password', icon: 'Password', onSelect: () => setResetOpen(true) },
                { kind: 'item', label: 'Delete', icon: 'Trash', danger: true, onSelect: () => setDeleteOpen(true) },
              ]}
              trigger={({ ref, onClick, expanded }) => (
                <IconButton
                  ref={ref as Ref<HTMLButtonElement>}
                  icon="DotsThree"
                  ariaLabel="User actions"
                  aria-haspopup="menu"
                  aria-expanded={expanded}
                  onClick={onClick}
                />
              )}
            />
          </>
        }
        tabs={<Tabs items={TABS} value={tab} onChange={setTab} ariaLabel="User detail sections" />}
      />

      <div className={styles.content}>
        {tab === 'overview' && <OverviewSummary user={user} />}
        {tab === 'general' && (
          <OverviewTab
            user={user}
            onSave={(patch) => updateUser(user.id, patch)}
            onReset={() => setResetOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        )}
        {tab === 'user-details' && (
          <div className={styles.generalLayout}>
            <InlineUserDetailsCard user={user} onSave={(patch) => updateUser(user.id, patch)} />
            <ObjectManagementCard onReset={() => setResetOpen(true)} onDelete={() => setDeleteOpen(true)} />
          </div>
        )}
        {tab !== 'overview' && tab !== 'general' && tab !== 'user-details' && (
          <Card title={TABS.find((t) => t.value === tab)?.label}>
            <p className={styles.placeholder}>Coming soon.</p>
          </Card>
        )}
      </div>

      <ResetPasswordModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        user={user}
      />

      <DeleteUserModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        user={user}
      />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview tab — properties card + 3-up settings cards              */
/* ------------------------------------------------------------------ */

interface OverviewTabProps {
  user: User;
  onSave: (patch: UserPatch) => void;
  onReset: () => void;
  onDelete: () => void;
}

function OverviewTab({ user, onSave, onReset, onDelete }: OverviewTabProps) {
  return (
    <div className={styles.generalLayout}>
      <InlinePropertiesCard user={user} onSave={onSave} />

      <ObjectManagementCard onReset={onReset} onDelete={onDelete} />
    </div>
  );
}

function ObjectManagementCard({ onReset, onDelete }: { onReset: () => void; onDelete: () => void }) {
  return (
    <Card
      className={styles.managementCard}
      title="Object Management"
      helper="Manage this object's access, location, and restriction to the domain."
    >
      <div className={styles.managementGroups}>
        <div className={styles.managementGroup}>
          <LinkList
            links={[
              { label: 'Reset password', onClick: onReset },
              { label: 'Reset Entra ID MFA', disabled: true },
              { label: 'Revoke sessions', disabled: true },
            ]}
          />
        </div>
        <div className={styles.managementGroup}>
          <LinkList
            links={[
              { label: 'Move', disabled: true },
              { label: 'Copy', disabled: true },
            ]}
          />
        </div>
        <div className={styles.managementGroup}>
          <LinkList
            tone="danger"
            links={[
              { label: 'Deactivate', disabled: true },
              { label: 'Deprovision', disabled: true },
              { label: 'Delete', onClick: onDelete },
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

interface LinkEntry {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface LinkListProps {
  links: LinkEntry[];
  tone?: LinkTone;
}

function LinkList({ links, tone = 'brand' }: LinkListProps) {
  return (
    <ul className={styles.linkList}>
      {links.map((l) => (
        <li key={l.label} className={styles.linkRow}>
          <Link
            href="#"
            tone={tone}
            className={l.disabled ? `${styles.linkDisabled} ${tone === 'danger' ? styles.linkDisabledDanger : styles.linkDisabledBrand}` : undefined}
            aria-disabled={l.disabled || undefined}
            tabIndex={l.disabled ? -1 : undefined}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              if (l.disabled) return;
              l.onClick?.();
            }}
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
