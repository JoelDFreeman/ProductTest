import { useMemo, useState } from 'react';
import { Button } from '../../components/Button/Button.js';
import { SideSheet } from '../../components/SideSheet/SideSheet.js';
import { Icon } from '../../components/Icon/Icon.js';
import { getNodeIcon, NODE_TREE, type DirectoryNodeView } from '../../lib/directoryData.js';
import styles from './MoveGroupsModal.module.css';

interface MoveGroupsModalProps {
  open: boolean;
  count: number;
  objectLabel?: string;
  onClose: () => void;
  onMove: (directory: string) => void;
}

export function MoveGroupsModal({ open, count, objectLabel = 'Group', onClose, onMove }: MoveGroupsModalProps) {
  const adRoots = useMemo(() => NODE_TREE.filter((node) => node.id === 'managed-directories').map((node) => ({
    ...node,
    children: node.children.filter((child) => child.id === 'active-directories'),
  })), []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['managed-directories', 'active-directories', 'o1d-local', 'o1d-test-ou']));

  const toggleExpanded = (nodeId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const renderNode = (node: DirectoryNodeView, depth = 0) => (
    <div key={node.id}>
      <div className={`${styles.treeRow} ${selectedNodeId === node.id ? styles.treeRowSelected : ''}`} style={{ paddingLeft: `${8 + depth * 16}px` }}>
        {node.hasChildren ? <button type="button" className={styles.caret} onClick={() => toggleExpanded(node.id)} aria-label={`${expanded.has(node.id) ? 'Collapse' : 'Expand'} ${node.name}`}><Icon name={expanded.has(node.id) ? 'CaretDown' : 'CaretRight'} size="12px" /></button> : <span className={styles.caretSpacer} />}
        <button type="button" className={styles.treeLabel} onClick={() => setSelectedNodeId(node.id)}><Icon name={getNodeIcon(node.id)} size="16px" /><span>{node.name}</span></button>
      </div>
      {node.hasChildren && expanded.has(node.id) && node.children.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      title={`Move ${count === 1 ? objectLabel : `${objectLabel}s`}`}
      subtitle={`Browse and select a destination folder for ${count === 1 ? `the selected ${objectLabel.toLowerCase()}` : `${count} selected ${objectLabel.toLowerCase()}s`}.`}
      className={styles.modal}
      bodyClassName={styles.body}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!selectedNodeId} onClick={() => { onMove(selectedNodeId ?? ''); onClose(); }}>Move</Button></>}
    >
      <div className={styles.browseLayout}>
        <div className={styles.treePanel} aria-label="AD directories">
          {adRoots.map((node) => renderNode(node))}
        </div>
      </div>
    </SideSheet>
  );
}
