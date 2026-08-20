import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AppShell } from '../AppShell/AppShell.js';
import { navigate, useRoute } from '../../lib/router.js';
import { Tabs } from '../../components/Tabs/Tabs.js';
import { ContentHeader } from '../../components/ContentHeader/ContentHeader.js';
import { Card } from '../../components/Card/Card.js';
import { Button } from '../../components/Button/Button.js';
import { FormField } from '../../components/FormField/FormField.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Textarea } from '../../components/Textarea/Textarea.js';
import { showToast } from '../../lib/toastStore.js';
import { useGroups } from '../../lib/groupsStore.js';
import { Avatar } from '../../components/Avatar/Avatar.js';
import styles from './GroupDetailPage.module.css';
import { GroupMemberships } from './GroupMemberships.js';
import { GroupOwnership } from './GroupOwnership.js';
import { GroupManagedUnits } from './GroupManagedUnits.js';
import { GroupRoles } from './GroupRoles.js';
import { GroupHistory } from './GroupHistory.js';
import { isActiveDirectoryLocation } from '../../lib/directoryData.js';
import type { Group } from './mockGroups.js';
import { MoveGroupsModal } from './MoveGroupsModal.js';
import { DeleteUserModal } from '../UserDetailPage/DeleteUserModal/DeleteUserModal.js';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'general', label: 'General' },
  { value: 'ownership', label: 'Ownership' },
  { value: 'memberships', label: 'Memberships' },
  { value: 'managed-units', label: 'Managed units' },
  { value: 'roles', label: 'Roles' },
  { value: 'object', label: 'Object' },
  { value: 'history', label: 'History' },
];

export function GroupDetailPage({ groupId }: { groupId: string }) {
  const route = useRoute();
  const { getGroup, updateGroup, addGroup, removeGroup } = useGroups();
  const group = getGroup(groupId);
  const isAdGroup = isActiveDirectoryLocation(group?.location);
  const [tab, setTab] = useState(route.name === 'groupDetail' ? route.params.tab ?? 'overview' : 'overview');
  const [editing, setEditing] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [focusField, setFocusField] = useState<'name' | 'description' | 'scope' | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const scopeRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => group ? {
    name: group.name,
    preWindowsName: group.name,
    description: group.description,
    resourceUrl: 'https://',
    keywords: 'security, users, AD',
    email: `${group.name.toLowerCase().replace(/\s+/g, '.')}@contoso.com`,
    type: 'Security',
    tags: 'Security, Compliance',
    scope: group.scope,
  } : { name: '', preWindowsName: '', description: '', resourceUrl: '', keywords: '', email: '', scope: 'Domain local' as const, type: 'Security', tags: '' });

  useEffect(() => {
    if (!editing || !focusField) return;
    const target = focusField === 'name' ? nameRef.current : focusField === 'description' ? descriptionRef.current : scopeRef.current;
    target?.focus();
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) target.select();
    setFocusField(null);
  }, [editing, focusField]);

  if (!group) {
    return (
      <AppShell breadcrumb={[{ label: 'Directory Management' }, { label: 'Groups' }, { label: 'Not found' }]}>
        <div className={styles.empty}><h1>Group not found</h1><Button variant="secondary" onClick={() => navigate('#/groups')}>Back to Groups</Button></div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumb={[{ label: 'Directory Management' }, { label: 'Groups', onClick: () => navigate('#/groups') }, { label: group.name }]}>
      <ContentHeader
        variant="detail"
        icon="UsersThree"
        iconLabel={`${group.name} group`}
        title={group.name}
        subtitle={group.location}
        onBack={() => navigate('#/groups')}
        backLabel="Back to Groups"
        tabs={<Tabs items={TABS} value={tab} onChange={setTab} ariaLabel="Group detail sections" />}
      />
      <div className={styles.content}>
        {tab === 'overview' ? (
          <GroupOverview group={group} />
        ) : tab === 'general' ? (
          <div className={styles.generalLayout}>
            <Card
              className={styles.generalCard}
              title="General"
              helper="To manage the group name, type, and general properties."
              actions={editing ? <div className={styles.actions}><Button variant="secondary" size="s" onClick={() => { setEditing(false); }}>Cancel</Button><Button variant="primary" size="s" disabled={!draft.name.trim()} onClick={() => { updateGroup(group.id, { name: draft.name.trim(), description: draft.description.trim(), scope: draft.scope }); setEditing(false); showToast(`${draft.name} properties saved.`); }}>Save</Button></div> : <Button variant="secondary" size="s" onClick={() => setEditing(true)}>Edit</Button>}
            >
              {editing ? (
                <div className={styles.editForm}>
                  <FormField label="Display name" required><TextInput ref={nameRef} value={draft.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, name: event.target.value }))} /></FormField>
                  {isAdGroup && <FormField label="Group name (pre-win2k)" required><TextInput value={draft.preWindowsName} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, preWindowsName: event.target.value }))} /></FormField>}
                  <FormField label="Description"><Textarea ref={descriptionRef} rows={4} value={draft.description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDraft((current) => ({ ...current, description: event.target.value }))} /></FormField>
                                    <fieldset className={styles.scopeField}>
                                      <legend>Group scope</legend>
                                      {(['Domain local', 'Global', 'Universal'] as const).map((scope) => <label key={scope}><input ref={scope === draft.scope ? scopeRef : undefined} type="radio" name="group-scope" checked={draft.scope === scope} onChange={() => setDraft((current) => ({ ...current, scope }))} />{scope}</label>)}
                                    </fieldset>
                  <FormField label="Resource URL"><TextInput value={draft.resourceUrl} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, resourceUrl: event.target.value }))} /></FormField>
                  <FormField label="Keywords"><TextInput value={draft.keywords} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, keywords: event.target.value }))} /></FormField>
                  <FormField label="Email"><TextInput value={draft.email} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, email: event.target.value }))} /></FormField>
                  <FormField label="Group type"><TextInput value={draft.type} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, type: event.target.value }))} /></FormField>
                  <FormField label="Tags"><TextInput value={draft.tags} onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, tags: event.target.value }))} /></FormField>
                </div>
              ) : (
                <dl className={styles.properties}>
                  <div><dt>Display name</dt><dd><button className={styles.editValue} type="button" onClick={() => { setFocusField('name'); setEditing(true); }}>{group.name}</button></dd></div>
                  {isAdGroup && <div><dt>Group name (pre-win2k)</dt><dd>{group.name}</dd></div>}
                  <div><dt>Description</dt><dd><button className={styles.editValue} type="button" onClick={() => { setFocusField('description'); setEditing(true); }}>{group.description}</button></dd></div>
                                    <div><dt>Group scope</dt><dd><button className={styles.editValue} type="button" onClick={() => { setFocusField('scope'); setEditing(true); }}>{group.scope}</button></dd></div>
                  <div><dt>Resource URL</dt><dd>https://</dd></div>
                  <div><dt>Keywords</dt><dd>security, users, AD</dd></div>
                  <div><dt>Email</dt><dd>{group.name.toLowerCase().replace(/\s+/g, '.')}@contoso.com</dd></div>
                  <div><dt>Group type</dt><dd>Security</dd></div>
                  <div><dt>Tags</dt><dd>Security, Compliance</dd></div>
                </dl>
              )}
            </Card>
            <Card className={styles.managementCard} title="Object management" helper="To manage this object's access, location, and restriction to the domain.">
              <div className={styles.managementGroups}>
                <div className={styles.actionContainer}>
                     {isAdGroup && <button type="button" className={styles.ghostAction} onClick={() => setMoveOpen(true)}>Move</button>}
                     <button type="button" className={styles.ghostAction} onClick={() => { addGroup({ ...group, id: `group-copy-${Date.now()}`, name: `Copy of ${group.name}` }); showToast(`${group.name} copied.`); }}>Copy</button>
                </div>
                <div className={`${styles.actionContainer} ${styles.dangerActions}`}>
                     <button type="button" className={styles.ghostDangerAction} onClick={() => { updateGroup(group.id, { status: 'Inactive' }); showToast(`${group.name} deprovisioned.`); }}>Deprovision</button>
                     <button type="button" className={styles.ghostDangerAction} onClick={() => setDeleteOpen(true)}>Delete</button>
                </div>
              </div>
            </Card>
          </div>
        ) : tab === 'ownership' ? (
          <GroupOwnership group={group} />
        ) : tab === 'memberships' ? (
          <GroupMemberships group={group} />
        ) : tab === 'managed-units' ? (
          <GroupManagedUnits group={group} />
        ) : tab === 'roles' ? (
          <GroupRoles group={group} />
        ) : tab === 'object' ? (
          <Card title="Object details" helper="View immutable directory object information.">
            <dl className={styles.properties}>
              <div><dt>Object ID</dt><dd>b8a5d3e9-7f2c-4b1a-9e6d-3c8f20a1b4c7</dd></div>
              <div><dt>Object type</dt><dd>Group</dd></div>
              <div><dt>Directory</dt><dd>{group.location.split('\\')[0]}</dd></div>
              <div><dt>Location</dt><dd>{group.location}</dd></div>
              <div><dt>Scope</dt><dd>{group.scope}</dd></div>
              <div><dt>Status</dt><dd>{group.status}</dd></div>
              <div><dt>Created on</dt><dd>Jan 12, 2024</dd></div>
            </dl>
          </Card>
        ) : tab === 'history' ? (
          <GroupHistory group={group} />
        ) : (
          <Card title={TABS.find((item) => item.value === tab)?.label}><p className={styles.placeholder}>Coming soon.</p></Card>
        )}
      </div>
      {isAdGroup && <MoveGroupsModal open={moveOpen} count={1} onClose={() => setMoveOpen(false)} onMove={(directory) => { const previousLocation = group.location; updateGroup(group.id, { location: directory }); showToast(`${group.name} moved successfully`, () => { updateGroup(group.id, { location: previousLocation }); showToast('Move undone.'); }, undefined, 'Undo', () => navigate(`#/groups/${group.id}?tab=overview`), 'View object'); }} />}
      <DeleteUserModal open={deleteOpen} user={group} objectLabel="group" onClose={() => setDeleteOpen(false)} onDeleted={() => { removeGroup(group.id); setDeleteOpen(false); navigate('#/groups'); showToast(`${group.name} deleted.`); }} />
    </AppShell>
  );
}

function GroupOverview({ group }: { group: Group }) {
  const metrics = [
    ['Total Members', group.members],
    ['Users', 32],
    ['Groups', 8],
    ['Other objects', 5],
  ];
  return (
    <div className={styles.overview}>
      <section className={styles.identityBlock} aria-label="Group summary">
        <div className={styles.identityPanel}>
          <Avatar name={group.name} size="l" className={styles.groupAvatar} />
          <h2>{group.name}</h2>
          <p>{group.name.toLowerCase().replace(/\s+/g, '.')}@saasii.io</p>
          <span className={styles.cloudBadge}>Cloud</span>
        </div>
        <div className={styles.metadata}>
          <div><span>Membership type</span><strong>Security Group</strong></div>
          <div className={styles.divider} />
          <div><span>Object ID</span><strong>b8a5d3e9-7f2c-4b1a-9e6d-3c8f20a1b4c7</strong></div>
          <div className={styles.divider} />
          <div><span>Created on</span><strong>Jan 12, 2024</strong></div>
        </div>
      </section>
      <section className={styles.metrics} aria-label="Group metrics">
        {metrics.map(([label, value]) => <article key={label} className={styles.metric}><span>{label}</span><strong>{value}</strong></article>)}
      </section>
    </div>
  );
}
