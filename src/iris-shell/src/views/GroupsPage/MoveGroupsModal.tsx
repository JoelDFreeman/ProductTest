import { useState } from 'react';
import { Button } from '../../components/Button/Button.js';
import { Modal } from '../../components/Modal/Modal.js';
import styles from './MoveGroupsModal.module.css';

interface MoveGroupsModalProps {
  open: boolean;
  count: number;
  directories: string[];
  onClose: () => void;
  onMove: (directory: string) => void;
}

export function MoveGroupsModal({ open, count, directories, onClose, onMove }: MoveGroupsModalProps) {
  const [directory, setDirectory] = useState(directories[0] ?? '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Move Groups"
      subtitle={`Move ${count} selected group${count === 1 ? '' : 's'} to another directory.`}
      leadingIcon="Folder"
      size="s"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!directory} onClick={() => { onMove(directory); onClose(); }}>Move groups</Button></>}
    >
      <div className={styles.form}>
        <label htmlFor="move-groups-directory">Directory</label>
        <select id="move-groups-directory" value={directory} onChange={(event) => setDirectory(event.target.value)}>
          {directories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
    </Modal>
  );
}
