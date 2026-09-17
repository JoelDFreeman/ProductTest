import { useMemo, useState, type Ref } from 'react';
import { AppShell } from '../AppShell/AppShell.js';
import { navigate } from '../../lib/router.js';
import { useDirectory } from '../../lib/directoryStore.js';
import { useGroups } from '../../lib/groupsStore.js';
import { ContentHeader } from '../../components/ContentHeader/ContentHeader.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { IconButton } from '../../components/IconButton/IconButton.js';
import { Icon } from '../../components/Icon/Icon.js';
import { Button } from '../../components/Button/Button.js';
import { Badge } from '../../components/Badge/Badge.js';
import { Menu, type MenuEntry } from '../../components/Menu/Menu.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { DataTable, type DataTableColumn, type RowKey } from '../../components/DataTable/DataTable.js';
import { Checkbox } from '../../components/Checkbox/Checkbox.js';
import { Pagination } from '../../components/Pagination/Pagination.js';
import { ActionBar } from '../../components/ActionBar/ActionBar.js';
import type { Group } from './mockGroups.js';
import { NewGroupModal, type NewGroupDraft } from './NewGroupModal.js';
import { showToast } from '../../lib/toastStore.js';
import { isActiveDirectoryLocation } from '../../lib/directoryData.js';
import { DeleteUserModal } from '../UserDetailPage/DeleteUserModal/DeleteUserModal.js';
import { MoveGroupsModal } from './MoveGroupsModal.js';
import styles from './GroupsPage.module.css';
import { useAdvancedSearch, type AdvancedFilter } from '../../lib/advancedSearchStore.js';
import { AdvancedSearchButton } from '../../components/AdvancedSearch/AdvancedSearchButton.js';
import { AppliedFiltersEmptyState } from '../../components/AdvancedSearch/AppliedFiltersEmptyState.js';
import { PageMenu } from '../../components/PageMenu/PageMenu.js';

const TABLE_SETTINGS: MenuEntry[] = [
  { kind: 'item', label: 'Adjust columns', icon: 'Columns' },
  { kind: 'item', label: 'Add columns', icon: 'ColumnsPlusLeft' },
  { kind: 'divider' },
  { kind: 'item', label: 'Export', icon: 'Export' },
  { kind: 'divider' },
  { kind: 'item', label: 'Ask AI', icon: 'Sparkle' },
];

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
  return <Menu ariaLabel={`${fieldId} filters`} align={fieldId === 'location' ? 'end' : 'start'} closeOnSelect={false} items={items} trigger={({ ref, onClick, expanded }) => <button ref={ref as Ref<HTMLButtonElement>} type="button" className={styles.columnFilterButton} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded} aria-label={`Filter ${fieldId}`}><Icon name="CaretUpDown" size="16px" /></button>} />;
}

export function GroupsPage() {
  const { appliedFilters, draftFilters, syncFilters } = useAdvancedSearch();
  const { selectedDirectories } = useDirectory();
  const { groups, addGroup, updateGroup, removeGroup } = useGroups();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selected, setSelected] = useState<Set<RowKey>>(new Set());
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);
  const [moveGroupsOpen, setMoveGroupsOpen] = useState(false);
  const [sort, setSort] = useState<{ fieldId: string; direction: SortDirection } | null>(null);
  const rows = useMemo(() => groups.filter((group) => {
    const directoryKey = group.location.startsWith('AD-1') ? 'ad-1' : group.location.startsWith('AD-2') ? 'ad-2' : group.location === 'Entra 2' ? 'entra-2' : 'entra-1';
    if (!selectedDirectories.has(directoryKey) || ![group.name, group.description, group.location].some((value) => value.toLowerCase().includes(query.trim().toLowerCase()))) return false;
    const filtersByField = new Map<string, AdvancedFilter[]>();
    appliedFilters.filter((filter) => filter.value).forEach((filter) => filtersByField.set(filter.fieldId, [...(filtersByField.get(filter.fieldId) ?? []), filter]));
    return Array.from(filtersByField.values()).every((filtersForField) => filtersForField.some((filter) => {
      if (filter.fieldId === 'status') return group.status === filter.value;
      if (filter.fieldId === 'location') return group.location === filter.value;
      if (filter.fieldId === 'displayName') return group.name.toLowerCase().includes(filter.value!.toLowerCase());
      if (filter.fieldId === 'objectType') return 'group'.includes(filter.value!.toLowerCase());
      if (filter.fieldId === 'dateCreated') return matchesDateFilter(group.createdAt, filter.operator, filter.value!);
      if (filter.fieldId === 'membershipType') return group.membershipType === filter.value;
      return true;
    }));
  }), [groups, query, selectedDirectories, appliedFilters]);
  const sortedRows = useMemo(() => !sort ? rows : [...rows].sort((left, right) => {
    const leftValue = sort.fieldId === 'name' ? left.name : sort.fieldId === 'status' ? left.status : sort.fieldId === 'location' ? left.location : sort.fieldId === 'membershipType' ? left.membershipType : String(left.members);
    const rightValue = sort.fieldId === 'name' ? right.name : sort.fieldId === 'status' ? right.status : sort.fieldId === 'location' ? right.location : sort.fieldId === 'membershipType' ? right.membershipType : String(right.members);
    const comparison = leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' });
    return sort.direction === 'asc' ? comparison : -comparison;
  }), [rows, sort]);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedGroups = groups.filter((group) => selected.has(group.id));
  const canMoveSelected = selectedGroups.length > 0 && selectedGroups.every((group) => isActiveDirectoryLocation(group.location));
  const directoryOptions = ['Entra 1', 'Entra 2', 'AD-1', 'AD-2'];

  const copyGroups = (sourceGroups: Group[]) => {
    const copies = sourceGroups.map((group, index) => ({
      ...group,
      id: `group-copy-${Date.now()}-${index}`,
      name: `Copy of ${group.name}`,
    }));
    copies.forEach(addGroup);
    setSelected(new Set());
    showToast(`${copies.length} group${copies.length === 1 ? '' : 's'} copied.`);
  };

  const deprovisionGroups = (sourceGroups: Group[]) => {
    sourceGroups.forEach((group) => updateGroup(group.id, { status: 'Inactive' }));
    setSelected(new Set());
    showToast(`${sourceGroups.length} group${sourceGroups.length === 1 ? '' : 's'} deprovisioned.`);
  };

  const rowMenuItems = (group: Group): MenuEntry[] => [
    { kind: 'item', label: 'Properties', icon: 'UsersThree', onSelect: () => navigate(`#/groups/${group.id}?tab=general`) },
    { kind: 'item', label: 'Copy', icon: 'Copy', onSelect: () => copyGroups([group]) },
    ...(isActiveDirectoryLocation(group.location) ? [{ kind: 'item' as const, label: 'Move', icon: 'Folder', onSelect: () => { setSelected(new Set([group.id])); setMoveGroupsOpen(true); } }] : []),
    { kind: 'divider' },
    { kind: 'item', label: 'Memberships', icon: 'Users', onSelect: () => navigate(`#/groups/${group.id}?tab=memberships`) },
    { kind: 'item', label: 'Managed units', icon: 'Cube', onSelect: () => navigate(`#/groups/${group.id}?tab=managed-units`) },
    { kind: 'item', label: 'Roles', icon: 'IdentificationBadge', onSelect: () => navigate(`#/groups/${group.id}?tab=roles`) },
    { kind: 'divider' },
    { kind: 'item', label: 'Deprovision', icon: 'Prohibit', danger: true, onSelect: () => deprovisionGroups([group]) },
    { kind: 'item', label: 'Delete', icon: 'Trash', danger: true, onSelect: () => setDeleteGroup(group) },
  ];

  const columns: DataTableColumn<Group>[] = [
    { key: 'name', header: 'Display name', icon: 'UsersThree', headerFilter: <ColumnFilterMenu fieldId="name" filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'name', direction })} />, width: '180px', cell: (group) => <a className={styles.nameCell} href={`#/groups/${group.id}?tab=general`} onClick={(event) => { event.preventDefault(); navigate(`#/groups/${group.id}?tab=general`); }}>{group.name}</a> },
    { key: 'status', header: 'Status', icon: 'UserCircleCheck', headerFilter: <ColumnFilterMenu fieldId="status" options={['Active', 'Inactive']} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'status', direction })} />, width: '128px', cell: (group) => <Badge tone={group.status === 'Active' ? 'success' : 'error'} className={styles.statusBadge}>{group.status}</Badge> },
    { key: 'description', header: 'Description', icon: 'ArticleNyTimes', minWidth: '260px', grow: 2, cell: (group) => <span title={group.description}>{group.description}</span> },
    { key: 'members', header: 'Members', icon: 'Users', headerFilter: <ColumnFilterMenu fieldId="members" filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'members', direction })} />, width: '144px', cell: (group) => <a className={styles.membersLink} href={`#/groups/${group.id}?tab=memberships`} onClick={(event) => { event.preventDefault(); navigate(`#/groups/${group.id}?tab=memberships`); }}>{group.members}</a> },
    { key: 'location', header: 'Location', icon: 'BuildingOffice', headerFilter: <ColumnFilterMenu fieldId="location" options={directoryOptions} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'location', direction })} />, width: '160px', cell: (group) => group.location },
  ];
  const columnOptions: DataTableColumn<Group>[] = [
    { key: 'scope', header: 'Scope', icon: 'Globe', headerFilter: <ColumnFilterMenu fieldId="scope" options={['Domain local', 'Global', 'Universal']} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'scope', direction })} />, width: '150px', cell: (group) => group.scope },
    { key: 'dateCreated', header: 'Date created', icon: 'CalendarDots', headerFilter: <ColumnFilterMenu fieldId="dateCreated" options={Array.from(new Set(groups.map((group) => group.createdAt)))} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'dateCreated', direction })} />, width: '168px', cell: (group) => group.createdAt },
    { key: 'membershipType', header: 'Membership type', icon: 'UsersThree', headerFilter: <ColumnFilterMenu fieldId="membershipType" options={['Security Group', 'Distribution Group']} filters={draftFilters} onChange={syncFilters} onSort={(direction) => setSort({ fieldId: 'membershipType', direction })} />, minWidth: '170px', cell: (group) => group.membershipType },
  ];

  return (
    <AppShell breadcrumb={[{ label: 'Directory Management' }, { label: 'Groups' }]}>
      <ContentHeader
        icon="UsersThree"
        title="Groups"
        actions={<PageMenu />}
        search={<TextInput iconLead="MagnifyingGlass" placeholder="Search groups" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} aria-label="Search groups" />}
        toolbarActions={<><span className={styles.toolbarSeparator} aria-hidden="true" /><AdvancedSearchButton /><Button variant="primary" iconLead="Plus" onClick={() => setNewGroupOpen(true)}>Create</Button></>}
      />
      <div className={styles.tableWrap}>
        <DataTable rows={pageRows} columns={columns} columnOptions={columnOptions} selected={selected} onSelectionChange={setSelected} rowLabel={(group) => group.name} appearance="light" emptyContent={appliedFilters.length > 0 && !query ? <AppliedFiltersEmptyState /> : undefined} emptyState={{ title: 'No groups found', description: 'This directory has no groups.' }} rowActions={(group) => <Menu ariaLabel={`Actions for ${group.name}`} align="end" items={rowMenuItems(group)} trigger={({ ref, onClick, expanded }) => <IconButton ref={ref as Ref<HTMLButtonElement>} icon="DotsThree" ariaLabel={`Actions for ${group.name}`} size="s" aria-haspopup="menu" aria-expanded={expanded} onClick={onClick} />} />} />
      </div>
      {pageCount > 1 && <div className={styles.pagination}><Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} pageSize={pageSize} pageSizeOptions={[15, 30, 50]} onPageSizeChange={setPageSize} pageSizeSuffix="/ Page" showBoundaryControls appearance="compact" ariaLabel="Groups pages" /></div>}
      <ActionBar open={selected.size > 0} selectedCount={selected.size} totalCount={rows.length} onDismiss={() => setSelected(new Set())} groups={[[{ icon: 'Copy', label: 'Copy', onClick: () => copyGroups(selectedGroups) }, ...(canMoveSelected ? [{ icon: 'Folder', label: 'Move', onClick: () => setMoveGroupsOpen(true) }] : []), { icon: 'Trash', label: 'Delete', tone: 'danger', onClick: () => setDeleteGroup({ id: `selection-${Date.now()}`, name: `${selected.size} groups`, status: 'Active', description: '', members: 0, location: '', scope: 'Global', membershipType: 'Security Group', createdAt: new Date().toISOString().slice(0, 10) }) }]]} />
      <NewGroupModal
        open={newGroupOpen}
        directories={[
          ['entra-1', 'Entra 1'],
          ['entra-2', 'Entra 2'],
          ['ad-1', 'AD-1'],
          ['ad-2', 'AD-2'],
        ].filter(([key]) => selectedDirectories.has(key)).map(([, label]) => label)}
        onClose={() => setNewGroupOpen(false)}
        onCreate={(draft: NewGroupDraft) => {
          const createdGroup: Group = {
            id: `group-${Date.now()}`,
            name: draft.name,
            status: 'Active',
            description: draft.description,
            members: 0,
            createdAt: new Date().toISOString().slice(0, 10),
            location: draft.location || draft.directory,
            scope: draft.scope,
            membershipType: 'Security Group',
          };
          addGroup(createdGroup);
          setPage(1);
          showToast(
            `${createdGroup.name} successfully created`,
            () => navigate(`#/groups/${createdGroup.id}?tab=overview`),
            `Group created in ${createdGroup.location}. To open it, click View.`,
          );
        }}
      />
      {deleteGroup && (
        <DeleteUserModal
          open
          user={deleteGroup}
          objectLabel="group"
          onClose={() => setDeleteGroup(null)}
          onDeleted={(target) => {
            const isBulkDelete = deleteGroup.id.startsWith('selection-');
            if (isBulkDelete) selectedGroups.forEach((group) => removeGroup(group.id));
            else removeGroup(deleteGroup.id);
            setSelected((current) => {
              return isBulkDelete ? new Set() : new Set([...current].filter((id) => id !== deleteGroup.id));
            });
            showToast(`${target.name} deleted.`);
          }}
        />
      )}
      <MoveGroupsModal
        open={moveGroupsOpen}
        count={selectedGroups.length}
        onClose={() => setMoveGroupsOpen(false)}
        onMove={(directory) => {
          const previousLocations = new Map(selectedGroups.map((group) => [group.id, group.location]));
          selectedGroups.forEach((group) => updateGroup(group.id, { location: directory }));
          setSelected(new Set());
          showToast(
            `${selectedGroups.length} group${selectedGroups.length === 1 ? '' : 's'} moved successfully`,
            () => {
              previousLocations.forEach((location, id) => updateGroup(id, { location }));
              showToast('Move undone.');
            },
            undefined,
            'Undo',
            selectedGroups[0] ? () => navigate(`#/groups/${selectedGroups[0].id}?tab=overview`) : undefined,
            'View object',
          );
        }}
      />
    </AppShell>
  );
}

function matchesDateFilter(date: string | undefined, operator: string | undefined, value: string): boolean {
  if (!date) return false;
  if (operator === 'is after') return date > value;
  if (operator === 'is before') return date < value;
  return date === value;
}
