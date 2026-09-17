import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AppShell } from '../AppShell/AppShell.js';
import { navigate } from '../../lib/router.js';
import { useAppShell } from '../../lib/appShellContext.js';
import { useDirectory } from '../../lib/directoryStore.js';
import { OBJECT_TYPE_META, type DirectoryObject } from '../../lib/directoryData.js';
import { useFavorites } from '../../lib/useFavorites.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { IconButton } from '../../components/IconButton/IconButton.js';
import { Icon } from '../../components/Icon/Icon.js';
import { Button } from '../../components/Button/Button.js';
import { Link } from '../../components/Link/Link.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { ContentHeader } from '../../components/ContentHeader/ContentHeader.js';
import { Menu, type MenuEntry } from '../../components/Menu/Menu.js';
import { DataTable, type DataTableColumn, type RowKey } from '../../components/DataTable/DataTable.js';
import { Checkbox } from '../../components/Checkbox/Checkbox.js';
import { Pagination } from '../../components/Pagination/Pagination.js';
import { ActionBar } from '../../components/ActionBar/ActionBar.js';
import type { Crumb } from '../../components/AppHeader/AppHeader.js';
import { ResetPasswordModal } from '../UserDetailPage/ResetPasswordModal/ResetPasswordModal.js';
import { DeleteUserModal } from '../UserDetailPage/DeleteUserModal/DeleteUserModal.js';
import { MoveGroupsModal } from '../GroupsPage/MoveGroupsModal.js';
import { NewUserModal, type NewUserModalProps } from '../UsersPage/NewUserModal.js';
import { NewGroupModal, type NewGroupDraft } from '../GroupsPage/NewGroupModal.js';
import { showToast } from '../../lib/toastStore.js';
import styles from './TreeView.module.css';
import { useAdvancedSearch, type AdvancedFilter } from '../../lib/advancedSearchStore.js';
import { AdvancedSearchButton } from '../../components/AdvancedSearch/AdvancedSearchButton.js';
import { AppliedFiltersEmptyState } from '../../components/AdvancedSearch/AppliedFiltersEmptyState.js';
import { PageMenu } from '../../components/PageMenu/PageMenu.js';

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100];
type SortDirection = 'asc' | 'desc';

function ColumnFilterMenu({ fieldId, options, filters, onChange, onSort }: { fieldId: string; options?: string[]; filters: AdvancedFilter[]; onChange: (filters: AdvancedFilter[]) => void; onSort: (direction: SortDirection) => void }) {
  const selected = new Set(filters.filter((filter) => filter.fieldId === fieldId && filter.value).map((filter) => filter.value!));
  const items: MenuEntry[] = [
    { kind: 'item', label: 'Sort ascending', icon: 'CaretUp', onSelect: () => onSort('asc') },
    { kind: 'item', label: 'Sort descending', icon: 'CaretDown', onSelect: () => onSort('desc') },
    ...(options ? [{ kind: 'divider' as const }, ...options.map((option): MenuEntry => ({ kind: 'item', label: option, visual: <Checkbox checked={selected.has(option)} tabIndex={-1} ariaLabel={`${option} filter`} />, onSelect: () => {
      const next = new Set(selected);
      next.has(option) ? next.delete(option) : next.add(option);
      onChange([...filters.filter((filter) => filter.fieldId !== fieldId), ...Array.from(next, (value) => ({ id: `${fieldId}-${value}-${Date.now()}-${Math.random()}`, fieldId, value, operator: 'is' }))]);
    } }))] : []),
  ];
  return <Menu ariaLabel={`${fieldId} filters`} align="start" closeOnSelect={false} items={items} trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={styles.columnFilterButton} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded} aria-label={`Filter ${fieldId}`}><Icon name="CaretUpDown" size="16px" /></button>} />;
}

/** Href for a row: containers drill in; leaves open detail. */
function hrefFor(obj: DirectoryObject, nodeId: string): string {
  return obj.isContainer ? `#/tree/${obj.id}` : `#/tree/${nodeId}/${obj.id}`;
}

export interface TreeListPageProps {
  nodeId: string;
}

/**
 * TreeListPage — contents of a directory node, rendered with the same table +
 * toolbar + ActionBar design as the Users listing (different columns + data).
 */
export function TreeListPage({ nodeId }: TreeListPageProps) {
  const { appliedFilters, draftFilters, syncFilters } = useAdvancedSearch();
  const { isContainer, getChildren, getPath, getNodeName, getNodeIcon, moveObject, addObject } = useDirectory();
  const { aiOpen } = useAppShell();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [selected, setSelected] = useState<Set<RowKey>>(() => new Set());
  const [resetTarget, setResetTarget] = useState<DirectoryObject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DirectoryObject | null>(null);
  const [moveTargets, setMoveTargets] = useState<DirectoryObject[]>([]);
  const [createKind, setCreateKind] = useState<'user' | 'group' | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ fieldId: string; direction: SortDirection } | null>(null);

  // Reset transient view state when the selected node changes.
  useEffect(() => {
    setQuery('');
    setPage(1);
    setSelected(new Set());
  }, [nodeId]);

  const nodeName = getNodeName(nodeId);
  const known = isContainer(nodeId);
  const isAdNode = getPath(nodeId).some((crumb) => /active director|o1d|o2d|ad-\d/i.test(crumb.name));

  const allRows = useMemo<DirectoryObject[]>(
    () => (known ? getChildren(nodeId) : []),
    [known, getChildren, nodeId],
  );

  const createMenuItems = useMemo<MenuEntry[]>(() => {
    const pathNames = getPath(nodeId).map((crumb) => crumb.name).join(' ');
    const context = `${pathNames} ${nodeName ?? ''} ${allRows.map((row) => row.type).join(' ')}`.toLowerCase();
    const isAdDirectory = /active director|o1d|o2d|ad-\d/.test(context);
    const isEntraDirectory = /entra/.test(context);

    if (isAdDirectory) {
      return [
        { kind: 'item', label: 'New AD user', icon: 'WindowsLogo', onSelect: () => setCreateKind('user') },
        { kind: 'item', label: 'Add user', icon: 'Plus', onSelect: () => setCreateKind('user') },
        { kind: 'divider' },
        { kind: 'item', label: 'New group', icon: 'UsersThree', onSelect: () => setCreateKind('group') },
        { kind: 'divider' },
        { kind: 'item', label: 'New organizational unit', icon: 'FolderSimplePlus' },
        { kind: 'item', label: 'New group managed service account', icon: 'UserCircle' },
        { kind: 'item', label: 'New shared folder', icon: 'Folders' },
        { kind: 'item', label: 'New asset', icon: 'Desktop' },
        { kind: 'divider' },
        { kind: 'item', label: 'Bulk create', icon: 'Plus' },
        { kind: 'item', label: 'Bulk invite', icon: 'Plus' },
        { kind: 'item', label: 'Bulk delete', icon: 'Plus' },
      ];
    }

    if (isEntraDirectory && /group/.test(context)) {
      return [{ kind: 'item', label: 'New group', icon: 'UsersThree' }];
    }
    if (isEntraDirectory && /device|computer/.test(context)) {
      return [{ kind: 'item', label: 'Add device', icon: 'Devices' }];
    }
    return [
      { kind: 'item', label: 'New Entra user', icon: 'WindowsLogo' },
      { kind: 'item', label: 'Add user', icon: 'Plus' },
    ];
  }, [allRows, getPath, nodeId, nodeName]);

  const createUser = (draft: Parameters<NewUserModalProps['onCreate']>[0]) => {
    const fullName = `${draft.firstName} ${draft.lastName}`.trim();
    addObject({
      id: `tree-user-${Date.now()}`,
      name: fullName || draft.name,
      type: 'user',
      description: `Newly created AD user.`,
      parentId: nodeId,
      isContainer: false,
      details: { firstName: draft.firstName, lastName: draft.lastName, displayName: draft.displayName, description: 'Newly created AD user.', location: nodeName ?? nodeId },
    });
    showToast(`${fullName || draft.name} successfully created`);
    setCreateKind(null);
  };

  const createGroup = (draft: NewGroupDraft) => {
    addObject({
      id: `tree-group-${Date.now()}`,
      name: draft.displayName || draft.name,
      type: 'group',
      description: draft.description,
      parentId: nodeId,
      isContainer: false,
      details: { displayName: draft.displayName, description: draft.description, memberCount: 0, location: nodeName ?? nodeId },
    });
    showToast(`${draft.displayName || draft.name} successfully created`);
    setCreateKind(null);
  };

  const rows = useMemo<DirectoryObject[]>(() => {
    const q = query.trim().toLowerCase();
    const searchedRows = !q ? allRows : allRows.filter((o) =>
      [o.name, OBJECT_TYPE_META[o.type].label, o.description].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
    const filtersByField = new Map<string, AdvancedFilter[]>();
    appliedFilters.filter((filter) => filter.value).forEach((filter) => filtersByField.set(filter.fieldId, [...(filtersByField.get(filter.fieldId) ?? []), filter]));
    const filteredRows = searchedRows.filter((object) => Array.from(filtersByField.values()).every((filtersForField) => filtersForField.some((filter) => {
      if (filter.fieldId === 'objectType') return OBJECT_TYPE_META[object.type].label.toLowerCase().includes(filter.value!.toLowerCase());
      if (filter.fieldId === 'location') return (object.details.location ?? '').toLowerCase().includes(filter.value!.toLowerCase());
      if (filter.fieldId === 'displayName') return object.name.toLowerCase().includes(filter.value!.toLowerCase());
      if (filter.fieldId === 'dateCreated') return matchesDateFilter(object.details.created, filter.operator, filter.value!);
      if (filter.fieldId === 'computerType') return object.details.computerType === filter.value;
      if (filter.fieldId === 'membershipType') return object.details.membershipType === filter.value;
      return true;
    })));
    if (!sort) return filteredRows;
    return [...filteredRows].sort((left, right) => {
      const leftValue = sort.fieldId === 'name' ? left.name : sort.fieldId === 'type' ? OBJECT_TYPE_META[left.type].label : left.description;
      const rightValue = sort.fieldId === 'name' ? right.name : sort.fieldId === 'type' ? OBJECT_TYPE_META[right.type].label : right.description;
      const comparison = leftValue.localeCompare(rightValue, undefined, { sensitivity: 'base' });
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [allRows, query, appliedFilters, sort]);

  const columns = useMemo<DataTableColumn<DirectoryObject>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        icon: 'IdentificationCard',
        headerFilter: <ColumnFilterMenu fieldId="name" filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'name', direction })} />,
        width: '180px',
        cell: (o) => (
          <Link
            href={hrefFor(o, nodeId)}
            className={styles.nameCell}
            draggable={isAdNode && !o.isContainer}
            onDragStart={(event) => {
              if (!isAdNode || o.isContainer) return;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('application/x-ars-ad-object', JSON.stringify(o));
              event.dataTransfer.setData('text/plain', JSON.stringify(o));
            }}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              navigate(hrefFor(o, nodeId));
            }}
          >
            <span className={styles.nameIcon} aria-hidden="true">
              <Icon name={OBJECT_TYPE_META[o.type].icon} size="16px" />
            </span>
            <span className={styles.nameText}>{o.name}</span>
          </Link>
        ),
      },
      {
        key: 'type',
        header: 'Object type',
        icon: 'Tag',
        headerFilter: <ColumnFilterMenu fieldId="objectType" options={Array.from(new Set(allRows.map((row) => OBJECT_TYPE_META[row.type].label)))} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'type', direction })} />,
        width: '180px',
        cell: (o) => OBJECT_TYPE_META[o.type].label,
      },
      {
        key: 'description',
        header: 'Description',
        icon: 'ArticleNyTimes',
        headerFilter: <ColumnFilterMenu fieldId="description" filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'description', direction })} />,
        minWidth: '240px',
        grow: 2,
        cell: (o) => <span title={o.description}>{o.description}</span>,
      },
    ],
    [allRows, draftFilters, isAdNode, nodeId, syncFilters],
  );
  const columnOptions = useMemo<DataTableColumn<DirectoryObject>[]>(() => [
    { key: 'location', header: 'Location', icon: 'BuildingOffice', width: '240px', headerFilter: <ColumnFilterMenu fieldId="location" options={Array.from(new Set(allRows.map((object) => object.details.location ?? '-')))} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'location', direction })} />, cell: (object) => object.details.location ?? '-' },
    { key: 'created', header: 'Date created', icon: 'CalendarDots', width: '168px', headerFilter: <ColumnFilterMenu fieldId="dateCreated" options={Array.from(new Set(allRows.map((object) => object.details.created ?? '-')))} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'dateCreated', direction })} />, cell: (object) => object.details.created ?? '-' },
    { key: 'memberCount', header: 'Members', icon: 'Users', width: '120px', headerFilter: <ColumnFilterMenu fieldId="memberCount" filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'memberCount', direction })} />, cell: (object) => object.details.memberCount == null ? '-' : String(object.details.memberCount) },
    { key: 'computerType', header: 'Computer type', icon: 'Devices', width: '190px', headerFilter: <ColumnFilterMenu fieldId="computerType" options={['Computer', 'Device', 'Operator computer', 'Workstation']} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'computerType', direction })} />, cell: (object) => object.details.computerType ?? '-' },
    { key: 'membershipType', header: 'Membership type', icon: 'UsersThree', width: '190px', headerFilter: <ColumnFilterMenu fieldId="membershipType" options={['Security Group', 'Distribution Group']} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'membershipType', direction })} />, cell: (object) => object.details.membershipType ?? '-' },
  ], [allRows, draftFilters, syncFilters]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const selectedObjects = allRows.filter((object) => selected.has(object.id) && !object.isContainer);
  const canMoveSelected = isAdNode && selectedObjects.length > 0 && selectedObjects.length === selected.size;
  const pageRows = useMemo<DirectoryObject[]>(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  const handlePageSizeChange = (nextSize: number) => {
    const firstVisibleIndex = (safePage - 1) * pageSize;
    setPageSize(nextSize);
    setPage(Math.floor(firstVisibleIndex / nextSize) + 1);
  };

  const rowMenuItems = (o: DirectoryObject): MenuEntry[] => {
    const canReset = o.type === 'user' || o.type === 'contact';
    const fav = isFavorite(o.id);
    return [
      ...(canReset
                  ? ([{ kind: 'item', label: 'Reset password', icon: 'Password', onSelect: () => setResetTarget(o) }] as MenuEntry[])
        : []),
      { kind: 'item', label: 'Copy', icon: 'Copy' },
      ...(isAdNode && !o.isContainer ? [{ kind: 'item' as const, label: 'Move', icon: 'Folder', onSelect: () => setMoveTargets([o]) }] : []),
      { kind: 'item', label: 'Properties', icon: 'UserList' },
      {
        kind: 'item',
        label: fav ? 'Remove from favourites' : 'Add to favourites',
        icon: 'Heart',
        onSelect: () =>
          toggleFavorite({
            id: o.id,
            name: o.name,
            type: OBJECT_TYPE_META[o.type].label,
            description: o.description,
            href: hrefFor(o, nodeId),
          }),
      },
      { kind: 'divider' },
      { kind: 'item', label: 'Deprovision', icon: 'Prohibit', danger: true },
      { kind: 'item', label: 'Deactivate', icon: 'XCircle', danger: true },
      { kind: 'item', label: 'Delete', icon: 'Trash', danger: true, onSelect: () => setDeleteTarget(o) },
    ];
  };

  const breadcrumb = useMemo<Crumb[]>(() => {
    const path = getPath(nodeId);
    const crumbs: Crumb[] = [{ label: 'Directory Management' }];
    if (path.length > 1) crumbs.push({ label: '…' });
    const current = path[path.length - 1];
    crumbs.push({ label: current?.name ?? nodeName ?? 'Unknown' });
    return crumbs;
  }, [getPath, nodeId, nodeName]);

  if (!known) {
    return (
      <AppShell breadcrumb={[{ label: 'Directory Management' }, { label: 'Not found' }]}>
        <div className={styles.missing}>
          <h1 className={styles.missingTitle}>Directory not found</h1>
          <p className={styles.missingBody}>
            We couldn’t find a directory or folder with id <code>{nodeId}</code>.
          </p>
          <Button variant="secondary" onClick={() => navigate('#/tree')}>
            Back to Directory
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumb={breadcrumb}>
      <ContentHeader
        icon={getNodeIcon(nodeId)}
        title={nodeName}
        actions={<PageMenu ariaLabel="Node actions" favoriteLabel={isFavorite(nodeId) ? 'Remove from Favorites' : 'Add to Favorites'} onFavorite={() => toggleFavorite({ id: nodeId, name: nodeName ?? 'Directory', type: 'Folder', href: `#/tree/${nodeId}` })} />}
        search={
          <TextInput
            iconLead="MagnifyingGlass"
            placeholder="Search by name, email, or object ID"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            aria-label="Search directory objects"
          />
        }
        toolbarActions={
          <>
            <span className={styles.toolbarSeparator} aria-hidden="true" />
            <AdvancedSearchButton shortcut={['⌘', '⇧', 'F']} />
            <Menu
              ariaLabel="Create options"
              align="end"
              items={createMenuItems}
              trigger={({ ref, onClick, expanded }) => (
                <Button
                  ref={ref as React.Ref<HTMLButtonElement>}
                  variant="primary"
                  iconLead="Plus"
                  iconTrail="CaretDown"
                  className={styles.addBtn}
                  aria-haspopup="menu"
                  aria-expanded={expanded}
                  onClick={onClick}
                >
                  Create
                </Button>
              )}
            />
          </>
        }
      />

      <div className={styles.tableWrap}>
        <DataTable
          rows={pageRows}
          columns={columns}
          columnOptions={columnOptions}
          ariaLabel={`${nodeName} contents`}
          selected={selected}
          onSelectionChange={setSelected}
          rowLabel={(o) => o.name}
          rowProps={(o) => {
            if (!isAdNode || !o.isContainer) return {};
            return {
              className: dropTargetId === o.id ? styles.rowDropTarget : undefined,
              onDragOver: (event) => {
                if (event.dataTransfer.types.includes('application/x-ars-ad-object') || event.dataTransfer.types.includes('text/plain')) {
                  event.preventDefault();
                  setDropTargetId(o.id);
                }
              },
              onDragLeave: () => setDropTargetId(null),
              onDrop: (event) => {
                const raw = event.dataTransfer.getData('application/x-ars-ad-object') || event.dataTransfer.getData('text/plain');
                setDropTargetId(null);
                if (!raw) return;
                event.preventDefault();
                const object = JSON.parse(raw) as DirectoryObject;
                const previousParentId = object.parentId;
                moveObject(object, o.id);
                showToast(
                  `${object.name} moved to ${o.name} successfully.`,
                  () => {
                    moveObject(object, previousParentId);
                    showToast('Move undone.');
                  },
                  undefined,
                  'Undo',
                  () => navigate(`#/tree/${o.id}/${object.id}`),
                  'View object',
                );
              },
            };
          }}
          rowActions={(o) => (
            <Menu
              ariaLabel={`Actions for ${o.name}`}
              align="end"
              items={rowMenuItems(o)}
              trigger={({ ref, onClick, expanded }) => (
                <IconButton
                  ref={ref as React.Ref<HTMLButtonElement>}
                  icon="DotsThree"
                  ariaLabel={`Actions for ${o.name}`}
                  size="s"
                  aria-haspopup="menu"
                  aria-expanded={expanded}
                  onClick={onClick}
                />
              )}
            />
          )}
          emptyContent={appliedFilters.length > 0 && !query ? <AppliedFiltersEmptyState /> : undefined}
          emptyState={
            query
              ? {
                  title: 'No matching objects',
                  description: `No objects match “${query}”.`,
                  actionLabel: 'Clear search',
                  onAction: () => {
                    setQuery('');
                    setPage(1);
                  },
                }
              : { title: 'Empty folder', description: 'This directory has no objects.' }
          }
        />
      </div>

      {pageCount > 1 && (
        <div className={styles.pagination}>
          <Pagination
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            ariaLabel="Directory pages"
          />
        </div>
      )}

      <ActionBar
        open={selected.size > 0}
        selectedCount={selected.size}
        totalCount={allRows.length}
        layout="inline"
        onDismiss={() => setSelected(new Set())}
        groups={[
          [
            {
              icon: 'SelectionAll',
              label: 'Select all',
              iconOnly: aiOpen,
              onClick: () => setSelected(new Set(allRows.map((o) => o.id))),
            },
            { icon: 'Copy', label: 'Copy', iconOnly: aiOpen, onClick: () => undefined },
            ...(canMoveSelected ? [{ icon: 'Folder', label: 'Move', iconOnly: aiOpen, onClick: () => setMoveTargets(selectedObjects) }] : []),
            { icon: 'UserList', label: 'Properties', iconOnly: aiOpen, onClick: () => undefined },
          ],
          [
            {
              icon: 'Trash',
              label: 'Delete',
              tone: 'danger',
              iconOnly: aiOpen,
              onClick: () => undefined,
            },
          ],
        ]}
      />
      {createKind === 'user' && <NewUserModal open objectKind="ad" directories={[nodeName ?? 'AD Folder']} onClose={() => setCreateKind(null)} onCreate={createUser} />}
      {createKind === 'group' && <NewGroupModal open directories={[nodeName ?? 'AD Folder']} onClose={() => setCreateKind(null)} onCreate={createGroup} />}

      {resetTarget && (
        <ResetPasswordModal open onClose={() => setResetTarget(null)} user={{ name: resetTarget.name }} />
      )}
      {deleteTarget && (
        <DeleteUserModal open onClose={() => setDeleteTarget(null)} user={{ name: deleteTarget.name }} />
      )}
      {moveTargets.length > 0 && (
        <MoveGroupsModal
          open
          count={moveTargets.length}
          objectLabel={moveTargets.length === 1 ? OBJECT_TYPE_META[moveTargets[0].type].label : 'Object'}
          onClose={() => setMoveTargets([])}
          onMove={(targetNodeId) => {
            const previousParents = new Map(moveTargets.map((object) => [object.id, object.parentId]));
            moveTargets.forEach((object) => moveObject(object, targetNodeId));
            const firstObject = moveTargets[0];
            showToast(
              `${moveTargets.length} object${moveTargets.length === 1 ? '' : 's'} moved successfully`,
              () => {
                previousParents.forEach((parentId, objectId) => {
                  const object = moveTargets.find((item) => item.id === objectId);
                  if (object) moveObject(object, parentId);
                });
                showToast('Move undone.');
              },
              undefined,
              'Undo',
              firstObject ? () => navigate(`#/tree/${targetNodeId}/${firstObject.id}`) : undefined,
              'View object',
            );
            setMoveTargets([]);
            setSelected(new Set());
          }}
        />
      )}
    </AppShell>
  );
}

function matchesDateFilter(date: string | undefined, operator: string | undefined, value: string): boolean {
  if (!date) return false;
  if (operator === 'is after') return date > value;
  if (operator === 'is before') return date < value;
  return date === value;
}
