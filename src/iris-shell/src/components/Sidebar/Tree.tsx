import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { cx } from '../../lib/cx.js';
import { navigate, useRoute } from '../../lib/router.js';
import { useDirectory } from '../../lib/directoryStore.js';
import {
  ALL_NODE_IDS,
  FIRST_NODE_ID,
  type DirectoryNodeView,
} from '../../lib/directoryData.js';
import { Icon } from '../Icon/Icon.js';
import { Menu, type MenuEntry } from '../Menu/Menu.js';
import { showToast } from '../../lib/toastStore.js';
import { NewUserModal, type NewUserModalProps } from '../../views/UsersPage/NewUserModal.js';
import { NewGroupModal, type NewGroupDraft } from '../../views/GroupsPage/NewGroupModal.js';
import styles from './Tree.module.css';

// Object types offered under the context menu's "Create" submenu. Mirrors
// the Users page "Create" button options.
const CREATE_ITEMS: MenuEntry[] = [
  { kind: 'item', label: 'User', icon: 'User' },
  { kind: 'item', label: 'Group', icon: 'UsersThree' },
  { kind: 'divider' },
  { kind: 'item', label: 'Computer', icon: 'Devices' },
  { kind: 'divider' },
  { kind: 'item', label: 'Organizational Unit', icon: 'FolderPlus' },
  { kind: 'item', label: 'Shared Folder', icon: 'Folders' },
  { kind: 'divider' },
  { kind: 'item', label: 'Contact', icon: 'AddressBook' },
  { kind: 'item', label: 'Group Management Service Account', icon: 'UserCircle' },
];

/** The tree node id (if any) selected by the current route. */
function selectedNodeId(routeName: string, params: Record<string, string>): string | null {
  if (routeName === 'treeList' || routeName === 'treeDetail') return params.nodeId ?? null;
  // `#/tree` has no node in the URL but lands on the first node's listing, so
  // reflect that as the selected item.
  if (routeName === 'treeRoot') return FIRST_NODE_ID;
  return null;
}

/**
 * Tree — interactive directory tree for the sidebar's "Tree view" mode.
 *
 * Data-driven from `useDirectory()`. Clicking a node navigates to its listing
 * (`#/tree/:nodeId`); the selected node + expanded ancestors are derived from
 * the route so deep-links and drill-in stay in sync.
 */
export function Tree() {
  const { nodeTree, getPath, getNodeName, moveObject, addObject } = useDirectory();
  const route = useRoute();
  const selectedId = selectedNodeId(route.name, route.params as Record<string, string>);

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextNodeId, setContextNodeId] = useState<string | null>(null);
  const [createKind, setCreateKind] = useState<'user' | 'group' | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  // Fully unfurled by default; users can still collapse individual nodes.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ALL_NODE_IDS));

  // Auto-expand the ancestors of the selected node (deep-link + drill-in).
  useEffect(() => {
    if (!selectedId) return;
    const ancestors = getPath(selectedId).map((n) => n.id);
    setExpanded((prev) => {
      const next = new Set(prev);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedId, getPath]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openContextMenu = (e: MouseEvent, nodeId: string) => {
    e.preventDefault();
    // Keyboard-invoked context menus (ContextMenu key / Shift+F10) dispatch a
    // `contextmenu` event with clientX/clientY = 0. Fall back to anchoring at
    // the bottom-left of the row so it doesn't jump to the viewport corner.
    if (e.clientX === 0 && e.clientY === 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setContextNodeId(nodeId);
      setMenuPos({ x: rect.left, y: rect.bottom });
      return;
    }
    setContextNodeId(nodeId);
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const contextIsAd = contextNodeId ? getPath(contextNodeId).some((crumb) => /active director|o1d|o2d|ad-\d/i.test(crumb.name)) : false;
  const contextItems = useMemo<MenuEntry[]>(() => [
    {
      kind: 'submenu',
      label: 'Create',
      icon: 'Plus',
      items: contextIsAd ? [
        { kind: 'item', label: 'User', icon: 'User', onSelect: () => setCreateKind('user') },
        { kind: 'item', label: 'Group', icon: 'UsersThree', onSelect: () => setCreateKind('group') },
        ...CREATE_ITEMS.slice(3),
      ] : CREATE_ITEMS,
    },
    { kind: 'item', label: 'View properties', icon: 'UserList' },
    { kind: 'item', label: 'Move', icon: 'Folder' },
    { kind: 'item', label: 'Add to favorites', icon: 'Heart' },
    { kind: 'divider' },
    { kind: 'item', label: 'Delete', icon: 'Trash', danger: true },
  ], [contextIsAd]);

  const createUser = (draft: Parameters<NewUserModalProps['onCreate']>[0]) => {
    const fullName = `${draft.firstName} ${draft.lastName}`.trim();
    if (!contextNodeId) return;
    addObject({ id: `tree-user-${Date.now()}`, name: fullName || draft.name, type: 'user', description: 'Newly created AD user.', parentId: contextNodeId, isContainer: false, details: { firstName: draft.firstName, lastName: draft.lastName, displayName: draft.displayName, description: 'Newly created AD user.', location: getNodeName(contextNodeId) ?? contextNodeId } });
    showToast(`${fullName || draft.name} successfully created`);
    setCreateKind(null);
  };

  const createGroup = (draft: NewGroupDraft) => {
    if (!contextNodeId) return;
    addObject({ id: `tree-group-${Date.now()}`, name: draft.displayName || draft.name, type: 'group', description: draft.description, parentId: contextNodeId, isContainer: false, details: { displayName: draft.displayName, description: draft.description, memberCount: 0, location: getNodeName(contextNodeId) ?? contextNodeId } });
    showToast(`${draft.displayName || draft.name} successfully created`);
    setCreateKind(null);
  };

  return (
    <>
      <ul className={styles.tree} aria-label="Directory tree">
        {nodeTree.map((node) => (
          <TreeNodeView
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            expanded={expanded}
            onToggle={toggle}
            onContextMenu={openContextMenu}
            onDropObject={(object, targetNodeId) => {
              const targetName = getPath(targetNodeId).at(-1)?.name ?? targetNodeId;
              if (!getPath(targetNodeId).some((crumb) => /active director|o1d|o2d|ad-\d/i.test(crumb.name))) return;
              const previousParentId = object.parentId;
              moveObject(object, targetNodeId);
              showToast(
                `${object.name} moved to ${targetName} successfully.`,
                () => {
                  moveObject(object, previousParentId);
                  showToast('Move undone.');
                },
                undefined,
                'Undo',
                () => navigate(`#/tree/${targetNodeId}/${object.id}`),
                'View object',
              );
              setDropTargetId(null);
            }}
            dropTargetId={dropTargetId}
            onDropTargetChange={setDropTargetId}
            separatorBefore={node.id === 'managed-directories'}
          />
        ))}
      </ul>
      <Menu
        ariaLabel="Directory item actions"
        items={contextItems}
        open={menuPos !== null}
        onOpenChange={(o) => {
          if (!o) {
            setMenuPos(null);
            setContextNodeId(null);
          }
        }}
        position={menuPos ?? undefined}
      />
      {createKind === 'user' && <NewUserModal open objectKind="ad" directories={[contextNodeId ? getNodeName(contextNodeId) ?? 'AD Folder' : 'AD Folder']} onClose={() => setCreateKind(null)} onCreate={createUser} />}
      {createKind === 'group' && <NewGroupModal open directories={[contextNodeId ? getNodeName(contextNodeId) ?? 'AD Folder' : 'AD Folder']} onClose={() => setCreateKind(null)} onCreate={createGroup} />}
    </>
  );
}

interface TreeNodeViewProps {
  node: DirectoryNodeView;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onContextMenu: (e: MouseEvent, nodeId: string) => void;
  onDropObject: (object: import('../../lib/directoryData.js').DirectoryObject, targetNodeId: string) => void;
  dropTargetId: string | null;
  onDropTargetChange: (id: string | null) => void;
  separatorBefore?: boolean;
}

function TreeNodeView({
  node,
  depth,
  selectedId,
  expanded,
  onToggle,
  onContextMenu,
  onDropObject,
  dropTargetId,
  onDropTargetChange,
  separatorBefore,
}: TreeNodeViewProps) {
  const hasChildren = node.hasChildren;
  const open = expanded.has(node.id);
  const isSelected = node.id === selectedId;
  const rowRef = useRef<HTMLDivElement | null>(null);

  // Reveal the selected node (e.g. on deep-link) once its ancestors expand.
  useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isSelected]);

  return (
    <>
      {separatorBefore && (
        <li className={styles.separator} role="separator" aria-hidden="true" />
      )}
      <li>
        <div
          ref={rowRef}
          className={cx(styles.row, isSelected && styles.rowSelected, dropTargetId === node.id && styles.rowDropTarget)}
          style={{ paddingLeft: `calc(${depth} * var(--oi-spacing-m))` }}
          onContextMenu={(event) => onContextMenu(event, node.id)}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('application/x-ars-ad-object') || event.dataTransfer.types.includes('text/plain')) {
              event.preventDefault();
              onDropTargetChange(node.id);
            }
          }}
          onDragLeave={() => onDropTargetChange(null)}
          onDrop={(event) => {
            const raw = event.dataTransfer.getData('application/x-ars-ad-object') || event.dataTransfer.getData('text/plain');
            if (!raw) return;
            event.preventDefault();
            try {
              onDropObject(JSON.parse(raw), node.id);
            } catch {
              onDropTargetChange(null);
            }
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              className={styles.caret}
              aria-label={open ? 'Collapse' : 'Expand'}
              aria-expanded={open}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(node.id);
              }}
            >
              <Icon name={open ? 'CaretDown' : 'CaretRight'} size="12px" />
            </button>
          ) : (
            <span className={styles.caret} aria-hidden="true" />
          )}

          <button
            type="button"
            className={styles.nodeButton}
            aria-current={isSelected ? 'page' : undefined}
            onClick={() => navigate(`#/tree/${node.id}`)}
          >
            <span className={styles.folderIcon} aria-hidden="true">
              <Icon
                name={node.icon ?? (hasChildren && open ? 'FolderOpen' : 'Folder')}
                size="16px"
              />
            </span>
            <span className={styles.label} title={node.name}>
              {node.name}
            </span>
          </button>
        </div>

        {hasChildren && open && (
          <ul className={styles.children}>
            {node.children.map((child) => (
              <TreeNodeView
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                expanded={expanded}
                onToggle={onToggle}
                onContextMenu={onContextMenu}
                onDropObject={onDropObject}
                dropTargetId={dropTargetId}
                onDropTargetChange={onDropTargetChange}
              />
            ))}
          </ul>
        )}
      </li>
    </>
  );
}
