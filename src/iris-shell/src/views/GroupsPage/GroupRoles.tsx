import { DataTable, type DataTableColumn } from '../../components/DataTable/DataTable.js';
import { Button } from '../../components/Button/Button.js';
import type { Group } from './mockGroups.js';
import styles from './GroupRoles.module.css';

const ROLES = [
  { id: 'role-1', name: 'Directory Administrator', description: 'Manage directory objects and settings.', scope: 'Entra 1' },
  { id: 'role-2', name: 'User Administrator', description: 'Manage users and group memberships.', scope: 'Entra 1' },
];

export function GroupRoles({ group }: { group: Group }) {
  const columns: DataTableColumn<(typeof ROLES)[number]>[] = [
    { key: 'name', header: 'Role', icon: 'IdentificationBadge', minWidth: '220px', grow: 1, cell: (role) => role.name },
    { key: 'description', header: 'Description', icon: 'ArticleNyTimes', minWidth: '280px', grow: 2, cell: (role) => role.description },
    { key: 'scope', header: 'Scope', icon: 'BuildingOffice', width: '160px', cell: (role) => role.scope },
  ];
  return (
    <section className={styles.container} aria-label="Group roles">
      <div className={styles.toolbar}>
        <div><h2>Roles</h2><p>Roles assigned to {group.name}.</p></div>
        <Button variant="primary" size="s" iconLead="Plus">Add role</Button>
      </div>
      <DataTable rows={ROLES} columns={columns} rowLabel={(role) => role.name} density="compact" appearance="light" />
    </section>
  );
}
