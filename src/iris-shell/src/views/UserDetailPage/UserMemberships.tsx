import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '../../components/DataTable/DataTable.js';
import { Button } from '../../components/Button/Button.js';
import { IconButton } from '../../components/IconButton/IconButton.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { showToast } from '../../lib/toastStore.js';
import { useGroups } from '../../lib/groupsStore.js';
import type { Group } from '../GroupsPage/mockGroups.js';
import { AddGroupsToUserModal } from './AddGroupsToUserModal.js';
import styles from './UserMemberships.module.css';

interface MembershipRow {
  id: string;
  name: string;
  type: 'Group';
  location: string;
}

interface UserMembershipsProps {
  user: {
    name: string;
    groupMembershipIds?: string[];
  };
  onMembershipChange: (groupIds: string[]) => void;
}

export function UserMemberships({ user, onMembershipChange }: UserMembershipsProps) {
  const { groups } = useGroups();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const groupIds = user.groupMembershipIds ?? [];

  const membershipRows = useMemo<MembershipRow[]>(() => {
    const byId = new Map(groups.map((group) => [group.id, group]));
    return groupIds
      .map((id) => byId.get(id))
      .filter((group): group is Group => !!group)
      .map((group) => ({
        id: group.id,
        name: group.name,
        type: 'Group',
        location: group.location,
      }));
  }, [groupIds, groups]);

  const filteredRows = useMemo(
    () => membershipRows.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [membershipRows, query],
  );

  const columns: DataTableColumn<MembershipRow>[] = [
    { key: 'name', header: 'Name', icon: 'UsersThree', minWidth: '180px', grow: 1, cell: (item) => item.name },
    { key: 'type', header: 'Object type', icon: 'Tag', width: '120px', cell: (item) => item.type },
    { key: 'location', header: 'Location', icon: 'BuildingOffice', width: '150px', cell: (item) => item.location },
  ];

  const removeMembership = (group: MembershipRow) => {
    onMembershipChange(groupIds.filter((id) => id !== group.id));
    showToast(`${user.name} removed from ${group.name}.`);
  };

  return (
    <section className={styles.container} aria-label="User memberships">
      <div className={styles.toolbar}>
        <TextInput
          iconLead="MagnifyingGlass"
          placeholder="Search all groups"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search all groups"
        />
        <Button variant="primary" size="s" iconLead="Plus" onClick={() => setAddOpen(true)}>Add Group</Button>
      </div>
      <DataTable
        rows={filteredRows}
        columns={columns}
        rowLabel={(group) => group.name}
        density="compact"
        appearance="light"
        headerAction={<IconButton icon="SlidersHorizontal" ariaLabel="Table settings" size="s" />}
        rowActions={(group) => (
          <Tooltip label="Remove group membership">
            <IconButton
              icon="XCircle"
              ariaLabel={`Remove ${user.name} from ${group.name}`}
              size="s"
              onClick={() => removeMembership(group)}
            />
          </Tooltip>
        )}
        emptyState={{
          title: 'No group memberships found',
          description: 'Add this user to a group to create a membership.',
          actionLabel: 'Add group',
          onAction: () => setAddOpen(true),
        }}
      />
      <AddGroupsToUserModal
        open={addOpen}
        excludedGroupIds={new Set(groupIds)}
        onClose={() => setAddOpen(false)}
        onAdd={(selectedGroups) => {
          const selectedIds = selectedGroups.map((group) => group.id);
          const newIds = selectedIds.filter((id) => !groupIds.includes(id));
          if (newIds.length === 0) return;
          onMembershipChange([...groupIds, ...newIds]);
          showToast(`${user.name} added to ${newIds.length} group${newIds.length === 1 ? '' : 's'}.`);
        }}
      />
    </section>
  );
}
