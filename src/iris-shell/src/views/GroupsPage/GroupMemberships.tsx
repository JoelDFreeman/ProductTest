import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '../../components/DataTable/DataTable.js';
import { Button } from '../../components/Button/Button.js';
import { IconButton } from '../../components/IconButton/IconButton.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Icon } from '../../components/Icon/Icon.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { showToast } from '../../lib/toastStore.js';
import type { Group } from './mockGroups.js';
import styles from './GroupMemberships.module.css';
import { AddMembersModal } from './AddMembersModal.js';

interface Member { id: string; name: string; type: 'User' | 'Group'; location: string; }

const MEMBERS: Member[] = [
  { id: 'member-1', name: 'Isabella Clark', type: 'User', location: 'Entra 1' },
  { id: 'member-2', name: 'Liam Bennett', type: 'User', location: 'Entra 1' },
  { id: 'member-3', name: 'Security Readers', type: 'Group', location: 'AD-1\\Users' },
];

const PARENT_GROUPS: Member[] = [
  { id: 'parent-1', name: 'Platform Access', type: 'Group', location: 'Entra 1' },
  { id: 'parent-2', name: 'All Administrators', type: 'Group', location: 'Entra 1' },
];

export function GroupMemberships({ group }: { group: Group }) {
  const [memberRows, setMemberRows] = useState<Member[]>(MEMBERS);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'all' | 'members' | 'membersOf'>('members');
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const members = useMemo(() => memberRows.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [memberRows, query]);
  const memberColumns: DataTableColumn<Member>[] = [
    { key: 'name', header: 'Name', icon: 'IdentificationCard', minWidth: '180px', grow: 1, cell: (item) => item.name },
    { key: 'type', header: 'Type', icon: 'Tag', width: '100px', cell: (item) => item.type },
    { key: 'location', header: 'Location', icon: 'BuildingOffice', width: '150px', cell: (item) => item.location },
  ];
  const parentColumns: DataTableColumn<Member>[] = [
    { key: 'name', header: 'Name', icon: 'UsersThree', minWidth: '180px', grow: 1, cell: (item) => item.name },
    { key: 'type', header: 'Object type', icon: 'Tag', width: '120px', cell: (item) => item.type },
    { key: 'location', header: 'Location', icon: 'BuildingOffice', width: '150px', cell: (item) => item.location },
  ];
  const removeMember = (member: Member) => {
    setMemberRows((current) => current.filter((item) => item.id !== member.id));
    showToast(`${member.name} removed from ${group.name}.`);
  };

  const allRows = [...members, ...PARENT_GROUPS];
  const activeRows = view === 'all' ? allRows : view === 'members' ? members : PARENT_GROUPS;
  const activeColumns = view === 'membersOf' ? parentColumns : memberColumns;
  const searchPlaceholder = view === 'all' ? 'Search all memberships' : view === 'members' ? 'Search all members' : 'Search all members of';
  return (
    <section className={styles.container} aria-label="Group memberships">
      <div className={styles.toolbar}>
        <div className={styles.switcher} role="tablist" aria-label="Membership view">
          <button type="button" className={view === 'all' ? styles.activeTab : styles.allTab} role="tab" aria-selected={view === 'all'} onClick={() => { setView('all'); setQuery(''); }}><Icon name="UsersFour" size="16px" />All</button>
          <button type="button" className={view === 'members' ? styles.activeTab : styles.tab} role="tab" aria-selected={view === 'members'} onClick={() => { setView('members'); setQuery(''); }}><Icon name="Users" size="16px" />Members</button>
          <button type="button" className={view === 'membersOf' ? styles.activeTab : styles.tab} role="tab" aria-selected={view === 'membersOf'} onClick={() => { setView('membersOf'); setQuery(''); }}><Icon name="UserGear" size="16px" />Members Of</button>
        </div>
        <span className={styles.toolbarDivider} aria-hidden="true" />
        <TextInput iconLead="MagnifyingGlass" placeholder={searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} aria-label={searchPlaceholder} />
        <Button variant="primary" size="s" iconLead="Plus" onClick={() => setAddMembersOpen(true)}>Add Member</Button>
      </div>
      <DataTable rows={activeRows} columns={activeColumns} rowLabel={(member) => member.name} density="compact" appearance="light" headerAction={<IconButton icon="SlidersHorizontal" ariaLabel="Table settings" size="s" />} rowActions={view === 'members' ? (member) => <Tooltip label="Remove member from group"><IconButton icon="XCircle" ariaLabel={`Remove ${member.name} from group`} size="s" onClick={() => removeMember(member)} /></Tooltip> : undefined} />
      <AddMembersModal
        open={addMembersOpen}
        onClose={() => setAddMembersOpen(false)}
        onAdd={(newMembers) => {
          const additions: Member[] = newMembers
            .filter((item) => !memberRows.some((existing) => existing.id === item.id))
            .map((item) => ({ id: item.id, name: item.name, type: item.type === 'User' ? 'User' : 'Group', location: '' }));
          setMemberRows((current) => [...current, ...additions]);
          if (additions.length > 0) showToast(`${additions.length} member${additions.length === 1 ? '' : 's'} added to ${group.name}.`);
        }}
      />
    </section>
  );
}
