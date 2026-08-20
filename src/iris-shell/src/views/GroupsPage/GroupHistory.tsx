import { DataTable, type DataTableColumn } from '../../components/DataTable/DataTable.js';
import type { Group } from './mockGroups.js';
import styles from './GroupHistory.module.css';

const EVENTS = [
  { id: 'event-1', event: 'Created', actor: 'Sara Ito', date: 'Jan 12, 2024', summary: 'Group created in Entra 1.' },
  { id: 'event-2', event: 'Membership updated', actor: 'Joel Freeman', date: 'Feb 04, 2024', summary: '3 members added.' },
  { id: 'event-3', event: 'Properties updated', actor: 'Sara Ito', date: 'Mar 18, 2024', summary: 'Description changed.' },
];

export function GroupHistory({ group }: { group: Group }) {
  const columns: DataTableColumn<(typeof EVENTS)[number]>[] = [
    { key: 'event', header: 'Event', icon: 'ClockCounterClockwise', width: '180px', cell: (item) => item.event },
    { key: 'actor', header: 'Actor', icon: 'User', width: '160px', cell: (item) => item.actor },
    { key: 'date', header: 'Date', icon: 'Calendar', width: '150px', cell: (item) => item.date },
    { key: 'summary', header: 'Summary', icon: 'ArticleNyTimes', minWidth: '260px', grow: 1, cell: (item) => item.summary },
  ];
  return (
    <section className={styles.container} aria-label="Group history">
      <div className={styles.toolbar}><div><h2>History</h2><p>Recent activity for {group.name}.</p></div></div>
      <DataTable rows={EVENTS} columns={columns} rowLabel={(event) => event.event} density="compact" appearance="light" />
    </section>
  );
}
