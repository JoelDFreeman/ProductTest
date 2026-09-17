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
import { Checkbox } from '../../components/Checkbox/Checkbox.js';
import { FormField } from '../../components/FormField/FormField.js';
import { Link, type LinkTone } from '../../components/Link/Link.js';
import { Menu } from '../../components/Menu/Menu.js';
import { Modal } from '../../components/Modal/Modal.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { InlinePropertiesCard } from './InlinePropertiesCard.js';
import { InlineUserDetailsCard } from './InlineUserDetailsCard.js';
import { OverviewSummary } from './OverviewSummary.js';
import { UserMemberships } from './UserMemberships.js';
import { ResetPasswordModal } from './ResetPasswordModal/ResetPasswordModal.js';
import { DeleteUserModal } from './DeleteUserModal/DeleteUserModal.js';
import { MoveGroupsModal } from '../GroupsPage/MoveGroupsModal.js';
import { showToast } from '../../lib/toastStore.js';
import type { User } from '../UsersPage/mockUsers.js';
import styles from './UserDetailPage.module.css';
import { isActiveDirectoryLocation } from '../../lib/directoryData.js';

const TABS = [
  { value: 'overview', label: 'Overview', icon: 'Briefcase' },
  { value: 'general', label: 'General' },
  { value: 'user-details', label: 'User details' },
  { value: 'account', label: 'Account' },
  { value: 'connections', label: 'Connections' },
  { value: 'memberships', label: 'Memberships (8)' },
  { value: 'managed-units', label: 'Managed units' },
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
  const [moveOpen, setMoveOpen] = useState(false);

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
  const isAdUser = isActiveDirectoryLocation(user.location);

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
                ...(isAdUser ? [{ kind: 'item' as const, label: 'Move', icon: 'Folder', onSelect: () => setMoveOpen(true) }] : []),
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
            onMove={() => setMoveOpen(true)}
            onDelete={() => setDeleteOpen(true)}
          />
        )}
        {tab === 'user-details' && (
          <div className={styles.generalLayout}>
            <InlineUserDetailsCard user={user} onSave={(patch) => updateUser(user.id, patch)} />
            <ObjectManagementCard isAdUser={isAdUser} onReset={() => setResetOpen(true)} onMove={() => setMoveOpen(true)} onDelete={() => setDeleteOpen(true)} />
          </div>
        )}
        {tab === 'memberships' && <UserMemberships user={user} onMembershipChange={(groupMembershipIds) => updateUser(user.id, { groupMembershipIds })} />}
        {tab === 'account' && <AccountCard user={user} isAdUser={isAdUser} onReset={() => setResetOpen(true)} onMove={() => setMoveOpen(true)} onDelete={() => setDeleteOpen(true)} />}
        {tab !== 'overview' && tab !== 'general' && tab !== 'user-details' && tab !== 'memberships' && tab !== 'account' && (
          <Card title={TABS.find((t) => t.value === tab)?.label}>
            <p className={styles.placeholder}>Coming soon.</p>
          </Card>
        )}
      </div>

      <ResetPasswordModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        user={{
          name: user.name,
          username: user.details.login,
          displayName: user.details.displayName,
          location: user.location,
        }}
        mode={isAdUser ? 'ad' : 'entra'}
      />

      <DeleteUserModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        user={user}
      />
      {isAdUser && <MoveGroupsModal
        open={moveOpen}
        count={1}
        objectLabel="User"
        onClose={() => setMoveOpen(false)}
        onMove={(directory) => {
          const previousLocation = user.location;
          updateUser(user.id, { location: directory });
          showToast(`${user.name} moved successfully`, () => {
            updateUser(user.id, { location: previousLocation });
            showToast('Move undone.');
          }, undefined, 'Undo', () => navigate(`#/users/${user.id}?tab=overview`), 'View object');
        }}
      />}
    </AppShell>
  );
}

function AccountCard({ user, isAdUser, onReset, onMove, onDelete }: { user: User; isAdUser: boolean; onReset: () => void; onMove: () => void; onDelete: () => void }) {
  return (
    <div className={styles.generalLayout}>
      <div className={styles.accountLayout}>{isAdUser ? <AdAccountCard user={user} /> : <EntraAccountCard user={user} />}</div>
      <ObjectManagementCard isAdUser={isAdUser} onReset={onReset} onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

const AD_OPTIONS = [
  'User must change at next logon',
  'Password never expires',
  'Store password using reversible encryption',
  'Account is disabled',
  'Smart card required for interactive login',
  'Account is trusted for delegation',
  'Account is sensitive and cannot be delegated',
  'Use DES encryption types for this account',
  'Do not require Kerberos pre-Authentication',
];

function AdAccountCard({ user }: { user: User }) {
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState<Record<string, boolean>>({});
  const [expires, setExpires] = useState<'never' | 'date'>('never');
  const [expiresDate, setExpiresDate] = useState('');
  const [logonName, setLogonName] = useState(user.details.login);
  const [preWindowsName, setPreWindowsName] = useState(user.details.login);
  const [modal, setModal] = useState<'hours' | 'logon-to' | 'last-logon' | null>(null);
  const updateOption = (label: string) => (checked: boolean) => setOptions((current) => ({ ...current, [label]: checked }));
  const cancelEditing = () => { setLogonName(user.details.login); setPreWindowsName(user.details.login); setEditing(false); };
  return (
    <>
      <Card title="AD account properties" helper="Manage Active Directory logon and account settings." actions={editing ? <div className={styles.actions}><Button variant="secondary" size="s" onClick={cancelEditing}>Cancel</Button><Button variant="primary" size="s" onClick={() => setEditing(false)}>Save</Button></div> : <Button variant="secondary" size="s" onClick={() => setEditing(true)}>Edit</Button>}>
        <div className={styles.accountFormGrid}>
          <FormField label="User logon name">
            <div className={styles.inlineField}><TextInput value={logonName} readOnly={!editing} onChange={(event) => setLogonName(event.target.value)} /><span className={styles.directorySuffix}>@{user.details.directory}</span></div>
          </FormField>
          <FormField label="User logon name (pre-Win2K)"><TextInput value={preWindowsName} readOnly={!editing} onChange={(event) => setPreWindowsName(event.target.value)} /></FormField>
        </div>
        <section className={styles.accountSection} aria-labelledby="ad-options-heading">
          <h3 id="ad-options-heading" className={styles.accountSectionTitle}>Account options</h3>
          <div className={styles.checkboxGrid}>{AD_OPTIONS.map((label) => <label key={label}><Checkbox checked={!!options[label]} disabled={!editing} onChange={updateOption(label)} ariaLabel={label} /><span>{label}</span></label>)}</div>
        </section>
        <div className={styles.accountFormGrid}>
          <FormField label="Account is locked out"><Checkbox checked={!!options.locked} disabled={!editing} onChange={updateOption('locked')} ariaLabel="Account is locked out" /></FormField>
          <FormField label="Account expires"><div className={styles.radioRow}><label><input type="radio" disabled={!editing} checked={expires === 'never'} onChange={() => setExpires('never')} /> Never</label><label><input type="radio" disabled={!editing} checked={expires === 'date'} onChange={() => setExpires('date')} /> End of</label>{expires === 'date' && <input type="date" disabled={!editing} value={expiresDate} onChange={(event) => setExpiresDate(event.target.value)} />}</div></FormField>
          <FormField label="Password expires"><span>Yes</span></FormField>
        </div>
        <div className={styles.accountActionRow}><Button variant="secondary" size="s" onClick={() => setModal('hours')}>Logon Hours</Button><Button variant="secondary" size="s" onClick={() => setModal('logon-to')}>Logon To</Button><Button variant="secondary" size="s" onClick={() => setModal('last-logon')}>Last Logon</Button></div>
      </Card>
      <SecondaryOwnersCard />
      <AccountInfoModal modal={modal} onClose={() => setModal(null)} user={user} />
    </>
  );
}

function EntraAccountCard({ user }: { user: User }) {
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mustSignIn, setMustSignIn] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const generate = () => { const value = `Iris-${Math.random().toString(36).slice(2, 10)}!`; setPassword(value); setConfirmPassword(value); };
  const cancelEditing = () => { setPassword(''); setConfirmPassword(''); setMustSignIn(false); setMustChange(false); setEditing(false); };
  return (
    <>
      <Card title="Entra account properties" helper="Manage cloud account credentials and sign-in settings." actions={editing ? <div className={styles.actions}><Button variant="secondary" size="s" onClick={cancelEditing}>Cancel</Button><Button variant="primary" size="s" onClick={() => setEditing(false)}>Save</Button></div> : <Button variant="secondary" size="s" onClick={() => setEditing(true)}>Edit</Button>}>
        <section className={styles.accountSection}>
          <h3 className={styles.accountSectionTitle}>Account</h3>
          <div className={styles.passwordGrid}><FormField label="Password"><TextInput type="password" value={password} readOnly={!editing} onChange={(event) => setPassword(event.target.value)} /></FormField><FormField label="Confirm password"><TextInput type="password" value={confirmPassword} readOnly={!editing} onChange={(event) => setConfirmPassword(event.target.value)} /></FormField></div>
          <div className={styles.accountActionRow}><Button variant="secondary" size="s" disabled={!editing} onClick={generate}>Generate</Button><Button variant="secondary" size="s" disabled={!editing} onClick={() => { setPassword(''); setConfirmPassword(''); }}>Clear</Button><Button variant="secondary" size="s" disabled={!editing || !password} onClick={() => navigator.clipboard?.writeText(password)}>Spell out</Button></div>
          <div className={styles.checkboxList}><Checkbox checked={mustSignIn} disabled={!editing} onChange={setMustSignIn} ariaLabel="User must sign in" /><span>User must sign in</span><Checkbox checked={mustChange} disabled={!editing} onChange={setMustChange} ariaLabel="User must change password at next sign in with MFA" /><span>User must change password at next sign in with MFA</span></div>
        </section>
        <SecondaryOwnersCard />
        <Card title="Devices" className={styles.nestedAccountCard}><p className={styles.placeholder}>No devices assigned.</p><Button variant="secondary" size="s" iconLead="Plus">Add device</Button></Card>
      </Card>
    </>
  );
}

function SecondaryOwnersCard() {
  return <Card title="Managed by" helper="Secondary owners with access to manage this account." className={styles.nestedAccountCard}><div className={styles.ownerTable}><div className={styles.ownerTableHeader}><span>Name</span><span>Type</span><span>Actions</span></div><div className={styles.ownerEmpty}>No secondary owners</div></div><Button variant="secondary" size="s" iconLead="Plus">Add owner</Button></Card>;
}

function AccountInfoModal({ modal, onClose, user }: { modal: 'hours' | 'logon-to' | 'last-logon' | null; onClose: () => void; user: User }) {
  if (!modal) return null;
  const title = modal === 'hours' ? 'Logon Hours' : modal === 'logon-to' ? 'Logon To' : 'Last Logon';
  return <Modal open onClose={onClose} title={title} size="s" footer={<Button variant="primary" onClick={onClose}>Done</Button>}><div className={styles.modalBody}>{modal === 'hours' && <p>All hours are currently allowed.</p>}{modal === 'logon-to' && <><p>Choose which computers {user.name} can use to sign in.</p><label><input type="radio" name="logon-to" defaultChecked /> All computers</label><label><input type="radio" name="logon-to" /> Following computers</label></>}{modal === 'last-logon' && <dl className={styles.accountProperties}><div><dt>Last Logon</dt><dd>Jan 12, 2024</dd></div><div><dt>Days since last logon</dt><dd>0</dd></div></dl>}</div></Modal>;
}

/* ------------------------------------------------------------------ */
/*  Overview tab — properties card + 3-up settings cards              */
/* ------------------------------------------------------------------ */

interface OverviewTabProps {
  user: User;
  onSave: (patch: UserPatch) => void;
  onReset: () => void;
  onMove: () => void;
  onDelete: () => void;
}

function OverviewTab({ user, onSave, onReset, onMove, onDelete }: OverviewTabProps) {
  return (
    <div className={styles.generalLayout}>
      <InlinePropertiesCard user={user} onSave={onSave} />

      <ObjectManagementCard isAdUser={isActiveDirectoryLocation(user.location)} onReset={onReset} onMove={onMove} onDelete={onDelete} />
    </div>
  );
}

function ObjectManagementCard({ isAdUser, onReset, onMove, onDelete }: { isAdUser: boolean; onReset: () => void; onMove: () => void; onDelete: () => void }) {
  return (
    <Card
      className={styles.managementCard}
      title="Object management"
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
              ...(isAdUser ? [{ label: 'Move', onClick: onMove }] : []),
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
