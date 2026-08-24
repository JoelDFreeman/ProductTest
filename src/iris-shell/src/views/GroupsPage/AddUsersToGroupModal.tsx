import { useMemo, useState } from 'react';
import { Modal } from '../../components/Modal/Modal.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Button } from '../../components/Button/Button.js';
import { useUsers } from '../../lib/usersStore.js';
import type { User } from '../UsersPage/mockUsers.js';
import styles from './AddUsersToGroupModal.module.css';

type NonUserType = 'Computer' | 'Group' | 'Service Account' | 'Contact';

export interface DirectoryMemberCandidate {
  id: string;
  name: string;
  type: 'User' | NonUserType;
  description: string;
  location?: string;
  user?: User;
}

const NON_USER_CANDIDATES: DirectoryMemberCandidate[] = Array.from({ length: 28 }, (_, index) => {
  const types: NonUserType[] = ['Computer', 'Group', 'Service Account', 'Contact'];
  const type = types[index % types.length];
  const name =
    type === 'Computer'
      ? `VPN-Gateway-${String(index + 1).padStart(2, '0')}`
      : type === 'Group'
        ? `Security-Readers-${index + 1}`
        : type === 'Service Account'
          ? `svc-directory-${index + 1}`
          : `vendor.user${index + 1}@example.com`;

  return {
    id: `non-user-${index + 1}`,
    name,
    type,
    description:
      type === 'Computer'
        ? 'Directory-joined infrastructure host.'
        : type === 'Group'
          ? 'Access-control group used in delegated administration.'
          : type === 'Service Account'
            ? 'Managed identity used by automation jobs.'
            : 'External contact synced to the directory.',
    location: ['Entra 1', 'Entra 2', 'AD-1\\Users', 'AD-2\\OU1'][index % 4],
  };
});

export interface AddUsersToGroupModalProps {
  open: boolean;
  excludedMemberIds: Set<string>;
  onClose: () => void;
  onAdd: (members: DirectoryMemberCandidate[]) => void;
}

export function AddUsersToGroupModal({ open, excludedMemberIds, onClose, onAdd }: AddUsersToGroupModalProps) {
  const { users } = useUsers();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const rows = useMemo(() => {
    const normalized = query.toLowerCase();
    const userRows: DirectoryMemberCandidate[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      type: 'User',
      description: user.description,
      location: user.location,
      user,
    }));
    return [...userRows, ...NON_USER_CANDIDATES].filter((member) => {
      if (excludedMemberIds.has(member.id)) return false;
      return `${member.name} ${member.type} ${member.description} ${member.location ?? ''}`.toLowerCase().includes(normalized);
    });
  }, [excludedMemberIds, query, users]);

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
      title="Add Members"
      subtitle="To select users or groups, use the checkboxes."
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
                onAdd(rows.filter((member) => selected.has(member.id)));
                close();
              }}
            >
              Add members
            </Button>
          </div>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.searchRow}>
          <TextInput
            iconLead="MagnifyingGlass"
            placeholder="Search by name, email, or object ID"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            aria-label="Search all directory objects"
          />
          <Button variant="secondary" size="s" iconOnly iconLead="FunnelSimple" aria-label="Filter objects" />
        </div>
        <div className={styles.list} role="listbox" aria-label="Available members" aria-multiselectable="true">
          <div className={styles.header}><span aria-hidden="true" /><span>Name</span><span>Object type</span><span>Description</span></div>
          {pageRows.map((member) => (
            <label key={member.id} className={styles.row}>
              <input type="checkbox" checked={selected.has(member.id)} onChange={() => toggle(member.id)} />
              <span className={styles.name}>{member.name}</span>
              <span className={styles.type}>{member.type}</span>
              <span className={styles.description}>{member.description}</span>
            </label>
          ))}
          {rows.length === 0 && <p className={styles.empty}>No matching users or groups.</p>}
        </div>
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(1)}>{'<<'}</button>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>{'<'}</button>
          <strong>{page}</strong>
          <span>of {pageCount}</span>
          <button disabled={page === pageCount} onClick={() => setPage(page + 1)}>{'>'}</button>
          <button disabled={page === pageCount} onClick={() => setPage(pageCount)}>{'>>'}</button>
        </div>
        <div className={styles.selectedArea} aria-label="Selected objects">
          <strong>{selected.size} object{selected.size === 1 ? '' : 's'} selected</strong>
          <div className={styles.chips}>
            {rows.filter((member) => selected.has(member.id)).map((member) => (
              <button type="button" key={member.id} className={styles.chip} onClick={() => toggle(member.id)} aria-label={`Remove ${member.name}`}>
                <span aria-hidden="true">x</span>
                {member.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
