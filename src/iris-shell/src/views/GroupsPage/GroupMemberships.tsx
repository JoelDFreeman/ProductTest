import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '../../components/DataTable/DataTable.js';
import { Button } from '../../components/Button/Button.js';
import { IconButton } from '../../components/IconButton/IconButton.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Icon } from '../../components/Icon/Icon.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { showToast } from '../../lib/toastStore.js';
import { useUsers } from '../../lib/usersStore.js';
import { useGroups } from '../../lib/groupsStore.js';
import type { Group, GroupNonUserMember } from './mockGroups.js';
import styles from './GroupMemberships.module.css';
import { AddUsersToGroupModal } from './AddUsersToGroupModal.js';
import type { DirectoryMemberCandidate } from './AddUsersToGroupModal.js';

interface Member {
  id: string;
  name: string;
  type: 'User' | 'Computer' | 'Group' | 'Service Account' | 'Contact';
  location: string;
  userId?: string;
}

const PARENT_GROUPS: Member[] = [
  { id: 'parent-1', name: 'Platform Access', type: 'Group', location: 'Entra 1' },
  { id: 'parent-2', name: 'All Administrators', type: 'Group', location: 'Entra 1' },
];

export function GroupMemberships({ group }: { group: Group }) {
  const { users, updateUser } = useUsers();
  const { updateGroup } = useGroups();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'all' | 'members' | 'membersOf'>('members');
  const [addMembersOpen, setAddMembersOpen] = useState(false);

  const nonUserMembers = group.nonUserMembers ?? [];

  const userMembers = useMemo<Member[]>(() => users
    .filter((user) => (user.groupMembershipIds ?? []).includes(group.id))
    .map((user) => ({
      id: `user-${user.id}`,
      userId: user.id,
      name: user.name,
      type: 'User',
      location: user.location ?? '',
    })), [group.id, users]);

  const members = useMemo(
    () => [...userMembers, ...nonUserMembers].filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [nonUserMembers, query, userMembers],
  );
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
    if (member.type === 'User' && member.userId) {
      const user = users.find((item) => item.id === member.userId);
      if (!user) return;
      updateUser(user.id, { groupMembershipIds: (user.groupMembershipIds ?? []).filter((id) => id !== group.id) });
    } else {
      updateGroup(group.id, { nonUserMembers: nonUserMembers.filter((item) => item.id !== member.id) });
    }
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
      <AddUsersToGroupModal
        open={addMembersOpen}
        excludedMemberIds={new Set([
          ...userMembers.map((member) => member.userId).filter((id): id is string => !!id),
          ...nonUserMembers.map((member) => member.id),
        ])}
        onClose={() => setAddMembersOpen(false)}
        onAdd={(selectedMembers) => {
          let addedUsers = 0;
          const nonUserAdditions: GroupNonUserMember[] = [];
          for (const member of selectedMembers) {
            if (member.type === 'User' && member.user) {
              const current = member.user.groupMembershipIds ?? [];
              if (current.includes(group.id)) continue;
              updateUser(member.user.id, { groupMembershipIds: [...current, group.id] });
              addedUsers += 1;
              continue;
            }
            if (isNonUserCandidate(member)) {
              nonUserAdditions.push(asNonUserMember(member));
            }
          }

          if (nonUserAdditions.length > 0) {
            updateGroup(group.id, { nonUserMembers: [...nonUserMembers, ...nonUserAdditions] });
          }

          const added = addedUsers + nonUserAdditions.length;
          if (added > 0) showToast(`${added} member${added === 1 ? '' : 's'} added to ${group.name}.`);
        }}
      />
    </section>
  );
}

function asNonUserMember(member: NonUserDirectoryMemberCandidate): GroupNonUserMember {
  return {
    id: member.id,
    name: member.name,
    type: member.type,
    location: member.location ?? '',
  };
}

type NonUserDirectoryMemberCandidate = DirectoryMemberCandidate & { type: GroupNonUserMember['type'] };

function isNonUserCandidate(member: DirectoryMemberCandidate): member is NonUserDirectoryMemberCandidate {
  return member.type !== 'User';
}
