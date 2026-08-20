import { DataTable, type DataTableColumn } from '../../components/DataTable/DataTable.js';
import { Button } from '../../components/Button/Button.js';
import type { Group } from './mockGroups.js';
import styles from './GroupManagedUnits.module.css';

const UNITS = [
  { id: 'unit-1', name: 'Global Security', description: 'Enterprise security management unit.', location: 'Entra 1' },
  { id: 'unit-2', name: 'Regional Operations', description: 'Regional operations management unit.', location: 'AD-1\\Users' },
];

export function GroupManagedUnits({ group }: { group: Group }) {
  const columns: DataTableColumn<(typeof UNITS)[number]>[] = [
    { key: 'name', header: 'Name', icon: 'FolderSimpleStar', minWidth: '220px', grow: 1, cell: (unit) => unit.name },
    { key: 'description', header: 'Description', icon: 'ArticleNyTimes', minWidth: '260px', grow: 2, cell: (unit) => unit.description },
    { key: 'location', header: 'Location', icon: 'BuildingOffice', width: '160px', cell: (unit) => unit.location },
  ];
  return (
    <section className={styles.container} aria-label="Managed units">
      <div className={styles.toolbar}>
        <div><h2>Managed units</h2><p>Management units associated with {group.name}.</p></div>
        <Button variant="primary" size="s" iconLead="Plus">Add managed unit</Button>
      </div>
      <DataTable rows={UNITS} columns={columns} rowLabel={(unit) => unit.name} density="compact" appearance="light" />
    </section>
  );
}
