import { useMemo, useState, type Ref } from 'react';
import { AppShell } from '../AppShell/AppShell.js';
import { navigate } from '../../lib/router.js';
import { useDirectory } from '../../lib/directoryStore.js';
import { useGroups } from '../../lib/groupsStore.js';
import { ContentHeader } from '../../components/ContentHeader/ContentHeader.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { IconButton } from '../../components/IconButton/IconButton.js';
import { Button } from '../../components/Button/Button.js';
import { Badge } from '../../components/Badge/Badge.js';
import { Menu, type MenuEntry } from '../../components/Menu/Menu.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { DataTable, type DataTableColumn, type RowKey } from '../../components/DataTable/DataTable.js';
import { Pagination } from '../../components/Pagination/Pagination.js';
import { ActionBar } from '../../components/ActionBar/ActionBar.js';
import type { Group } from './mockGroups.js';
import { NewGroupModal, type NewGroupDraft } from './NewGroupModal.js';
import { showToast } from '../../lib/toastStore.js';
import { isActiveDirectoryLocation } from '../../lib/directoryData.js';
import { DeleteUserModal } from '../UserDetailPage/DeleteUserModal/DeleteUserModal.js';
import { MoveGroupsModal } from './MoveGroupsModal.js';
import styles from './GroupsPage.module.css';
import { useAdvancedSearch } from '../../lib/advancedSearchStore.js';
import { AdvancedSearchButton } from '../../components/AdvancedSearch/AdvancedSearchButton.js';
import { AppliedFiltersEmptyState } from '../../components/AdvancedSearch/AppliedFiltersEmptyState.js';

const PAGE_ACTIONS: MenuEntry[] = [
  { kind: 'item', label: 'Customize', icon: 'Pencil' },
  { kind: 'divider' },
  { kind: 'item', label: 'Add to favorites', icon: 'Star' },
  { kind: 'divider' },
  { kind: 'item', label: 'Ask AI', icon: 'Sparkle' },
];

const TABLE_SETTINGS: MenuEntry[] = [
  { kind: 'item', label: 'Adjust columns', icon: 'Columns' },
  { kind: 'item', label: 'Add columns', icon: 'ColumnsPlusLeft' },
  { kind: 'divider' },
  { kind: 'item', label: 'Export', icon: 'Export' },
  { kind: 'divider' },
  { kind: 'item', label: 'Ask AI', icon: 'Sparkle' },
];

export function GroupsPage() {
  const { appliedFilters } = useAdvancedSearch();
  const { selectedDirectories } = useDirectory();
  const { groups, addGroup, updateGroup, removeGroup } = useGroups();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selected, setSelected] = useState<Set<RowKey>>(new Set());
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);
  const [moveGroupsOpen, setMoveGroupsOpen] = useState(false);
  const rows = useMemo(() => groups.filter((group) => {
    const directoryKey = group.location.startsWith('AD-1') ? 'ad-1' : group.location.startsWith('AD-2') ? 'ad-2' : group.location === 'Entra 2' ? 'entra-2' : 'entra-1';
    return selectedDirectories.has(directoryKey) && [group.name, group.description, group.location].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())) && appliedFilters.every((filter) => {
      if (!filter.value) return true;
      if (filter.fieldId === 'displayName') return group.name.toLowerCase().includes(filter.value.toLowerCase());
      if (filter.fieldId === 'location') return group.location.toLowerCase().includes(filter.value.toLowerCase());
      if (filter.fieldId === 'objectType') return 'group'.includes(filter.value.toLowerCase());
      return true;
    });
  }), [groups, query, selectedDirectories, appliedFilters]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
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
    { key: 'name', header: 'Display name', icon: 'UsersThree', minWidth: '220px', grow: 1, cell: (group) => <a className={styles.nameCell} href={`#/groups/${group.id}?tab=general`} onClick={(event) => { event.preventDefault(); navigate(`#/groups/${group.id}?tab=general`); }}>{group.name}</a> },
    { key: 'status', header: 'Status', icon: 'UserCircleCheck', width: '120px', cell: (group) => <Badge tone={group.status === 'Active' ? 'success' : 'error'} className={styles.statusBadge}>{group.status}</Badge> },
    { key: 'description', header: 'Description', icon: 'ArticleNyTimes', minWidth: '260px', grow: 2, cell: (group) => <span title={group.description}>{group.description}</span> },
    { key: 'members', header: 'Members', icon: 'Users', width: '110px', cell: (group) => String(group.members) },
    { key: 'location', header: 'Location', icon: 'BuildingOffice', width: '160px', cell: (group) => group.location },
  ];

  return (
    <AppShell breadcrumb={[{ label: 'Directory Management' }, { label: 'Groups' }]}>
      <ContentHeader
        icon="UsersThree"
        title="Groups"
        actions={<Menu ariaLabel="Page actions" align="end" items={PAGE_ACTIONS} trigger={({ ref, onClick, expanded }) => <Tooltip label="More options"><IconButton ref={ref as Ref<HTMLButtonElement>} icon="DotsThree" ariaLabel="Page actions" aria-haspopup="menu" aria-expanded={expanded} onClick={onClick} /></Tooltip>} />}
        search={<TextInput iconLead="MagnifyingGlass" placeholder="Search groups" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} aria-label="Search groups" />}
        toolbarActions={<><span className={styles.toolbarSeparator} aria-hidden="true" /><AdvancedSearchButton /><Button variant="primary" iconLead="Plus" onClick={() => setNewGroupOpen(true)}>Create</Button></>}
      />
      <div className={styles.tableWrap}>
        <DataTable rows={pageRows} columns={columns} selected={selected} onSelectionChange={setSelected} rowLabel={(group) => group.name} density="compact" appearance="light" emptyContent={appliedFilters.length > 0 && !query ? <AppliedFiltersEmptyState /> : undefined} emptyState={{ title: 'No groups found', description: 'This directory has no groups.' }} rowActions={(group) => <Menu ariaLabel={`Actions for ${group.name}`} align="end" items={rowMenuItems(group)} trigger={({ ref, onClick, expanded }) => <IconButton ref={ref as Ref<HTMLButtonElement>} icon="DotsThree" ariaLabel={`Actions for ${group.name}`} size="s" aria-haspopup="menu" aria-expanded={expanded} onClick={onClick} />} />} headerAction={<Menu ariaLabel="Table settings" align="end" items={TABLE_SETTINGS} trigger={({ ref, onClick, expanded }) => <IconButton ref={ref as Ref<HTMLButtonElement>} icon="SlidersHorizontal" ariaLabel="Table settings" size="s" aria-haspopup="menu" aria-expanded={expanded} onClick={onClick} />} />} />
      </div>
      {pageCount > 1 && <div className={styles.pagination}><Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} pageSize={pageSize} pageSizeOptions={[15, 30, 50]} onPageSizeChange={setPageSize} pageSizeSuffix="/ Page" showBoundaryControls appearance="compact" ariaLabel="Groups pages" /></div>}
      <ActionBar open={selected.size > 0} selectedCount={selected.size} totalCount={rows.length} onDismiss={() => setSelected(new Set())} groups={[[{ icon: 'Copy', label: 'Copy', onClick: () => copyGroups(selectedGroups) }, ...(canMoveSelected ? [{ icon: 'Folder', label: 'Move', onClick: () => setMoveGroupsOpen(true) }] : []), { icon: 'Trash', label: 'Delete', tone: 'danger', onClick: () => setDeleteGroup({ id: `selection-${Date.now()}`, name: `${selected.size} groups`, status: 'Active', description: '', members: 0, location: '', scope: 'Global' }) }]]} />
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
            location: draft.directory,
            scope: draft.scope,
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
