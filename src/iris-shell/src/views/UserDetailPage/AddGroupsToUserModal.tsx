import { useMemo, useState } from 'react';
import { Modal } from '../../components/Modal/Modal.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Button } from '../../components/Button/Button.js';
import { useGroups } from '../../lib/groupsStore.js';
import type { Group } from '../GroupsPage/mockGroups.js';
import styles from './AddGroupsToUserModal.module.css';

export interface AddGroupsToUserModalProps {
  open: boolean;
  excludedGroupIds: Set<string>;
  onClose: () => void;
  onAdd: (groups: Group[]) => void;
}

export function AddGroupsToUserModal({ open, excludedGroupIds, onClose, onAdd }: AddGroupsToUserModalProps) {
  const { groups } = useGroups();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const rows = useMemo(() => {
    const normalized = query.toLowerCase();
    return groups.filter((group) => {
      if (excludedGroupIds.has(group.id)) return false;
      return `${group.name} ${group.location} ${group.scope}`.toLowerCase().includes(normalized);
    });
  }, [groups, excludedGroupIds, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const close = () => {
    setQuery('');
    setPage(1);
    setSelected(new Set());
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add Group Memberships"
      subtitle="Select one or more groups to add this user to."
      size="l"
      className={styles.modal}
      bodyClassName={styles.modalBody}
      footer={
        <div className={styles.footer}>
          <span aria-hidden="true" />
          <div>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              disabled={selected.size === 0}
              onClick={() => {
                onAdd(groups.filter((group) => selected.has(group.id)));
                close();
              }}
            >
              Add groups
            </Button>
          </div>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.searchRow}>
          <TextInput
            iconLead="MagnifyingGlass"
            placeholder="Search by group name, scope, or location"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            aria-label="Search groups"
          />
          <Button variant="secondary" size="s" iconOnly iconLead="FunnelSimple" aria-label="Filter groups" />
        </div>
        <div className={styles.list} role="listbox" aria-label="Available groups" aria-multiselectable="true">
          <div className={styles.header}><span aria-hidden="true" /><span>Name</span><span>Scope</span><span>Location</span></div>
          {pageRows.map((group) => (
            <label key={group.id} className={styles.row}>
              <input type="checkbox" checked={selected.has(group.id)} onChange={() => toggle(group.id)} />
              <span className={styles.name}>{group.name}</span>
              <span className={styles.type}>{group.scope}</span>
              <span className={styles.location}>{group.location}</span>
            </label>
          ))}
          {rows.length === 0 && <p className={styles.empty}>No matching groups.</p>}
        </div>
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(1)}>{'<<'}</button>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>{'<'}</button>
          <strong>{page}</strong>
          <span>of {pageCount}</span>
          <button disabled={page === pageCount} onClick={() => setPage(page + 1)}>{'>'}</button>
          <button disabled={page === pageCount} onClick={() => setPage(pageCount)}>{'>>'}</button>
        </div>
        <div className={styles.selectedArea} aria-label="Selected groups">
          <strong>{selected.size} group{selected.size === 1 ? '' : 's'} selected</strong>
          <div className={styles.chips}>
            {groups.filter((group) => selected.has(group.id)).map((group) => (
              <button type="button" key={group.id} className={styles.chip} onClick={() => toggle(group.id)} aria-label={`Remove ${group.name}`}>
                <span aria-hidden="true">x</span>
                {group.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
