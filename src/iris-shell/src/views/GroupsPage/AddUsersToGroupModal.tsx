import { useMemo, useState } from 'react';
import { Modal } from '../../components/Modal/Modal.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Button } from '../../components/Button/Button.js';
import { Checkbox } from '../../components/Checkbox/Checkbox.js';
import { Icon } from '../../components/Icon/Icon.js';
import { Menu, type MenuEntry } from '../../components/Menu/Menu.js';
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
  createdAt?: string;
  user?: User;
}

type BasicFilterField = 'displayName' | 'objectType' | 'location' | 'dateCreated';

interface BasicFilter {
  id: string;
  fieldId: BasicFilterField;
  label: string;
  operator: 'contains' | 'is';
  value: string;
}

const BASIC_FILTER_META: Record<BasicFilterField, { label: string; icon: string; operator: 'contains' | 'is' }> = {
  displayName: { label: 'Display name', icon: 'IdentificationCard', operator: 'contains' },
  objectType: { label: 'Object type', icon: 'Lego', operator: 'is' },
  location: { label: 'Location', icon: 'MapPinSimpleArea', operator: 'is' },
  dateCreated: { label: 'Dates', icon: 'CalendarDots', operator: 'is' },
};

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
    createdAt: `2024-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
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
  const [filters, setFilters] = useState<BasicFilter[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const candidates = useMemo(() => {
    const userRows: DirectoryMemberCandidate[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      type: 'User',
      description: user.description,
      location: user.location,
      createdAt: user.createdAt,
      user,
    }));
    return [...userRows, ...NON_USER_CANDIDATES].filter((member) => !excludedMemberIds.has(member.id));
  }, [excludedMemberIds, users]);

  const rows = useMemo(() => {
    const normalized = query.toLowerCase();
    return candidates.filter((member) => {
      if (!`${member.name} ${member.type} ${member.description} ${member.location ?? ''}`.toLowerCase().includes(normalized)) return false;
      return filters.every((filter) => {
        if (filter.fieldId === 'displayName') return member.name.toLowerCase().includes(filter.value.toLowerCase());
        if (filter.fieldId === 'objectType') return member.type === filter.value;
        if (filter.fieldId === 'location') return (member.location ?? '') === filter.value;
        if (filter.fieldId === 'dateCreated') return (member.createdAt ?? '') === filter.value;
        return true;
      });
    });
  }, [candidates, filters, query]);

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

  const allVisibleSelected = rows.length > 0 && rows.every((member) => selected.has(member.id));
  const someVisibleSelected = !allVisibleSelected && rows.some((member) => selected.has(member.id));
  const toggleAllVisible = (checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      rows.forEach((member) => checked ? next.add(member.id) : next.delete(member.id));
      return next;
    });
  };

  const close = () => {
    setQuery('');
    setFilters([]);
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
          <BasicFilterMenu candidates={candidates} onAdd={(filter) => { setFilters((current) => [...current, filter]); setPage(1); }} />
        </div>
        {filters.length > 0 && <div className={styles.filterChips} aria-label="Basic filters">
          {filters.map((filter) => <button key={filter.id} type="button" className={styles.filterChip} onClick={() => { setFilters((current) => current.filter((item) => item.id !== filter.id)); setPage(1); }} aria-label={`Remove ${filter.label} filter`}><Icon name="DiamondsFour" size="14px" /><span>{filter.label}</span><span className={styles.filterOperator}>{filter.operator}</span><span>{filter.value}</span><Icon name="X" size="14px" /></button>)}
        </div>}
        <div className={styles.list} role="listbox" aria-label="Available members" aria-multiselectable="true">
          <div className={styles.header}><Checkbox checked={allVisibleSelected} indeterminate={someVisibleSelected} onChange={toggleAllVisible} ariaLabel="Select all filtered members" /><span>Name</span><span>Object type</span><span>Description</span></div>
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

function BasicFilterMenu({ candidates, onAdd }: { candidates: DirectoryMemberCandidate[]; onAdd: (filter: BasicFilter) => void }) {
  const valuesFor = (fieldId: BasicFilterField) => Array.from(new Set(candidates.map((candidate) => fieldValue(candidate, fieldId)).filter((value): value is string => !!value))).sort((a, b) => a.localeCompare(b));
  const items: MenuEntry[] = (Object.keys(BASIC_FILTER_META) as BasicFilterField[]).map((fieldId): MenuEntry => {
    const meta = BASIC_FILTER_META[fieldId];
    return { kind: 'submenu', label: meta.label, icon: meta.icon, items: valuesFor(fieldId).map((value): MenuEntry => ({ kind: 'item', label: value, onSelect: () => onAdd({ id: `${fieldId}-${value}-${Date.now()}-${Math.random()}`, fieldId, label: meta.label, operator: meta.operator, value }) })) };
  });
  return <Menu ariaLabel="Basic Filter" align="end" items={items} trigger={({ ref, onClick, expanded }) => <Button ref={ref as React.Ref<HTMLButtonElement>} variant="secondary" size="s" iconLead="FunnelSimple" aria-haspopup="menu" aria-expanded={expanded} onClick={onClick}>Filter</Button>} />;
}

function fieldValue(candidate: DirectoryMemberCandidate, fieldId: BasicFilterField): string | undefined {
  if (fieldId === 'displayName') return candidate.name;
  if (fieldId === 'objectType') return candidate.type;
  if (fieldId === 'location') return candidate.location;
  if (fieldId === 'dateCreated') return candidate.createdAt;
  return undefined;
}
