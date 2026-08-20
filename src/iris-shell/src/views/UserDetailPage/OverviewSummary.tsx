import { Avatar } from '../../components/Avatar/Avatar.js';
import type { User } from '../UsersPage/mockUsers.js';
import styles from './OverviewSummary.module.css';

interface OverviewSummaryProps {
  user: User;
}

const METRICS = [
  { label: 'Group memberships', value: '32' },
  { label: 'Applications', value: '32' },
  { label: 'Assigned roles', value: '3' },
  { label: 'Assigned licenses', value: '5' },
];

export function OverviewSummary({ user }: OverviewSummaryProps) {
  const { details } = user;

  return (
    <div className={styles.summary}>
      <section className={styles.identityBlock} aria-label="User summary">
        <div className={styles.identityPanel}>
          <Avatar src={user.avatarUrl} name={user.name} size="l" className={styles.overviewAvatar} />
          <h2 className={styles.identityName}>{user.name}</h2>
          <p className={styles.identityEmail}>{user.email}</p>
          <div className={styles.badges}>
            <span className={styles.badge}>{details.type}</span>
            <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
          </div>
        </div>
        <div className={styles.metadata}>
          <MetaField label="User Principal Name" value={details.userPrincipalName} />
          <div className={styles.divider} />
          <MetaField label="Object ID" value={user.objectId} />
          <div className={styles.divider} />
          <div className={styles.dateRow}>
            <MetaField label="Created on" value="Jan 12, 2024" />
            <MetaField label="Last sign-in" value="Jan 12, 2024" />
          </div>
        </div>
      </section>
      <div className={styles.divider} />
      <section className={styles.metrics} aria-label="User metrics">
        {METRICS.map((metric) => (
          <article key={metric.label} className={styles.metricCard}>
            <p className={styles.metricLabel}>{metric.label}</p>
            <p className={styles.metricValue}>{metric.value}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaField}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}
