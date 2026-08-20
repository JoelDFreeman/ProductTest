import { useMemo, useState } from 'react';
import { Modal } from '../../components/Modal/Modal.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Button } from '../../components/Button/Button.js';
import styles from './AddMembersModal.module.css';

export interface AddMembersModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (members: typeof AVAILABLE) => void;
}

const OBJECT_TYPES = ['User', 'Computer', 'Group', 'Service Account', 'Contact'] as const;
const AVAILABLE = Array.from({ length: 42 }, (_, index) => ({
  id: `available-${index + 1}`,
  name: index === 0 ? 'jsmith' : index === 1 ? 'VPN-Gateway-01' : `${['IT-Helpdesk', 'agarcia', 'svc-backup', 'DC-PROD-02', 'vendor.jones@example.com', 'Network-Admins', 'svc-monitoring'][index % 7]}${index > 8 ? `-${index}` : ''}`,
  type: OBJECT_TYPES[index % OBJECT_TYPES.length],
  description: ['Senior network administrator in the IT Operations department.', 'Primary VPN gateway server for remote access connections.', 'Security group for helpdesk staff with tier-1 support permissions.'][index % 3],
}));

export function AddMembersModal({ open, onClose, onAdd }: AddMembersModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const rows = useMemo(
    () => AVAILABLE.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
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
      footer={<div className={styles.footer}><span aria-hidden="true" /> <div><Button variant="secondary" onClick={close}>Cancel</Button><Button variant="primary" disabled={selected.size === 0} onClick={() => onAdd(AVAILABLE.filter((item) => selected.has(item.id)))}>Add members</Button></div></div>}
    >
      <div className={styles.body}>
        <div className={styles.searchRow}><TextInput iconLead="MagnifyingGlass" placeholder="Search by name, email, or object ID" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} aria-label="Search all directory objects" /><Button variant="secondary" size="s" iconOnly iconLead="FunnelSimple" aria-label="Filter objects" /></div>
        <div className={styles.list} role="listbox" aria-label="Available members" aria-multiselectable="true">
          <div className={styles.header}><span aria-hidden="true" /><span>Name</span><span>Object type</span><span>Description</span></div>
          {pageRows.map((item) => (
            <label key={item.id} className={styles.row}>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
              <span className={styles.name}>{item.name}</span>
              <span className={styles.type}>{item.type}</span>
              <span className={styles.description}>{item.description}</span>
            </label>
          ))}
          {rows.length === 0 && <p className={styles.empty}>No matching users or groups.</p>}
        </div>
        <div className={styles.pagination}><button disabled={page === 1} onClick={() => setPage(1)}>«</button><button disabled={page === 1} onClick={() => setPage(page - 1)}>‹</button><strong>{page}</strong><span>of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage(page + 1)}>›</button><button disabled={page === pageCount} onClick={() => setPage(pageCount)}>»</button></div>
        <div className={styles.selectedArea} aria-label="Selected objects"><strong>{selected.size} object{selected.size === 1 ? '' : 's'} selected</strong><div className={styles.chips}>{AVAILABLE.filter((item) => selected.has(item.id)).map((item) => <button type="button" key={item.id} className={styles.chip} onClick={() => toggle(item.id)} aria-label={`Remove ${item.name}`}><span aria-hidden="true">×</span>{item.name}</button>)}</div></div>
      </div>
    </Modal>
  );
}
