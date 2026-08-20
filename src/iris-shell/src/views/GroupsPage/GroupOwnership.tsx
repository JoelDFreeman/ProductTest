import { useState } from 'react';
import { Button } from '../../components/Button/Button.js';
import { FormField } from '../../components/FormField/FormField.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { showToast } from '../../lib/toastStore.js';
import { useGroups } from '../../lib/groupsStore.js';
import { navigate } from '../../lib/router.js';
import { DeleteUserModal } from '../UserDetailPage/DeleteUserModal/DeleteUserModal.js';
import { MoveGroupsModal } from './MoveGroupsModal.js';
import type { Group } from './mockGroups.js';
import styles from './GroupOwnership.module.css';
import { isActiveDirectoryLocation } from '../../lib/directoryData.js';

export function GroupOwnership({ group }: { group: Group }) {
  const [editing, setEditing] = useState(false);
  const [membershipUpdates, setMembershipUpdates] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isAdGroup = isActiveDirectoryLocation(group.location);
  const { updateGroup, addGroup, removeGroup } = useGroups();
  const setField = (field: string) => (value: string) => setFields((current) => ({ ...current, [field]: value }));
  const editActions = editing ? <div className={styles.actions}><Button variant="secondary" size="s" onClick={() => setEditing(false)}>Cancel</Button><Button variant="primary" size="s" onClick={() => { setEditing(false); showToast(`${group.name} ownership saved.`); }}>Save</Button></div> : <Button variant="secondary" size="s" onClick={() => setEditing(true)}>Edit</Button>;
  return (
    <div className={styles.layout}>
      <section className={styles.container} aria-label="Managed by">
        <div className={styles.toolbar}>
          <div><h2>Managed by</h2><p>Configure ownership and membership approval settings.</p></div>
          {editActions}
        </div>
        {editing ? <div className={styles.editForm}>
          <strong>Manager</strong>
          <Button variant="secondary" size="s" iconLead="Plus">Add manager</Button>
          <label className={styles.checkbox}><input type="checkbox" checked={membershipUpdates} onChange={(event) => setMembershipUpdates(event.target.checked)} /> Manager can update membership list</label>
          {['Office', 'Street address', 'City', 'State / Province', 'Country / Region', 'Telephone number', 'Fax number'].map((label) => <FormField key={label} label={label}><TextInput placeholder={label} value={fields[label] ?? ''} onChange={(event) => setField(label)(event.target.value)} /></FormField>)}
        </div> : <dl className={styles.properties}>
          <div><dt>Manager</dt><dd>Not set</dd></div>
          <div><dt>Manager can update membership list</dt><dd>Disabled until a manager is set</dd></div>
          <div><dt>Office</dt><dd>Not set</dd></div>
          <div><dt>Street address</dt><dd>Not set</dd></div>
          <div><dt>City</dt><dd>Not set</dd></div>
          <div><dt>State / Province</dt><dd>Not set</dd></div>
          <div><dt>Country / Region</dt><dd>Not set</dd></div>
          <div><dt>Telephone number</dt><dd>Not set</dd></div>
          <div><dt>Fax number</dt><dd>Not set</dd></div>
          <div><dt>Secondary owners</dt><dd>Not set</dd></div>
          <div><dt>Secondary owners can update membership list</dt><dd>Not set</dd></div>
        </dl>}
      </section>
      <section className={styles.management} aria-label="Object management">
        <h2>Object management</h2>
        <p>To manage this object's access, location, and restriction to the domain.</p>
        <div className={styles.actionGroup}>{isAdGroup && <button type="button" onClick={() => setMoveOpen(true)}>Move</button>}<button type="button" onClick={() => { addGroup({ ...group, id: `group-copy-${Date.now()}`, name: `Copy of ${group.name}` }); showToast(`${group.name} copied.`); }}>Copy</button></div>
        <div className={`${styles.actionGroup} ${styles.danger}`}><button type="button" onClick={() => { updateGroup(group.id, { status: 'Inactive' }); showToast(`${group.name} deprovisioned.`); }}>Deprovision</button><button type="button" onClick={() => setDeleteOpen(true)}>Delete</button></div>
      </section>
      {isAdGroup && <MoveGroupsModal open={moveOpen} count={1} onClose={() => setMoveOpen(false)} onMove={(directory) => { const previousLocation = group.location; updateGroup(group.id, { location: directory }); showToast(`${group.name} moved successfully`, () => { updateGroup(group.id, { location: previousLocation }); showToast('Move undone.'); }, undefined, 'Undo', () => navigate(`#/groups/${group.id}?tab=overview`), 'View object'); }} />}
      <DeleteUserModal open={deleteOpen} user={group} objectLabel="group" onClose={() => setDeleteOpen(false)} onDeleted={() => { removeGroup(group.id); navigate('#/groups'); showToast(`${group.name} deleted.`); }} />
    </div>
  );
}