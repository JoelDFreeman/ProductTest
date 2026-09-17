import { AppShell } from '../AppShell/AppShell.js';
import { ContentHeader } from '../../components/ContentHeader/ContentHeader.js';
import { PageMenu } from '../../components/PageMenu/PageMenu.js';
import styles from './WipPage.module.css';

/** Page-level actions shown in the heading's overflow menu. Mirrors UsersPage. */
export interface WipPageProps {
  /** Heading text + breadcrumb leaf. */
  title: string;
  /** Glyph shown in the leading ResourceIcon tile. */
  icon: string;
}

/**
 * WipPage — placeholder for directory sections that don't have a real view
 * yet. Reuses the UsersPage header treatment (icon + title + page-actions
 * menu) and shows a "WIP" marker in the content area.
 */
export function WipPage({ title, icon }: WipPageProps) {
  return (
    <AppShell breadcrumb={[{ label: 'Directory Management' }, { label: title }]}>
      <ContentHeader
        icon={icon}
        title={title}
        actions={<PageMenu favoriteLabel="Add page to Favorites" />}
      />

      <div className={styles.wip}>
        <code className={styles.wipCode}>[WIP]</code>
      </div>
    </AppShell>
  );
}
