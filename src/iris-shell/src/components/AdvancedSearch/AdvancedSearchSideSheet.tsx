import { Fragment, useEffect, useRef, useState } from 'react';
import { Button } from '../Button/Button.js';
import { TextInput } from '../TextInput/TextInput.js';
import { Icon } from '../Icon/Icon.js';
import { IconButton } from '../IconButton/IconButton.js';
import { Menu, type MenuEntry } from '../Menu/Menu.js';
import { AiPanel } from '../AiPanel/AiPanel.js';
import { Select } from '../Select/Select.js';
import { useAdvancedSearch, type AdvancedSearchTab, type AdvancedFilter, type FilterGroup, type FilterGroupCondition } from '../../lib/advancedSearchStore.js';
import { useAppShell } from '../../lib/appShellContext.js';
import { useGroups } from '../../lib/groupsStore.js';
import styles from './AdvancedSearchSideSheet.module.css';

const MENU_ITEMS = ['Common', 'User', 'Computer', 'Groups', 'Other properties'];

function FilterGroupConnector({ group, groups, onGroupsChange }: { group: FilterGroup; groups: FilterGroup[]; onGroupsChange: (groups: FilterGroup[]) => void }) {
  return (
    <Menu
      ariaLabel="Filter group connector"
      align="start"
      items={(['AND', 'OR'] as const).map((connector): MenuEntry => ({
        kind: 'item',
        label: connector,
        selected: (group.connector ?? 'AND') === connector,
        onSelect: () => onGroupsChange(groups.map((item) => item.id === group.id ? { ...item, connector } : item)),
      }))}
      trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={styles.connectorChip} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>{group.connector ?? 'AND'}<Icon name="CaretDown" size="12px" /></button>}
    />
  );
}

export function AdvancedSearchSideSheet() {
  const { open, tab, setTab, closeSearch, draftFilters, setDraftFilters, applyFilters, clearFilters, groupConditions, setGroupConditions, filterGroups, setFilterGroups, createFilterGroup, ldapQuery, ldapQueryManual, setLdapQuery } = useAdvancedSearch();
  const { setAiContext } = useAppShell();
  const { groups } = useGroups();
  const groupOptions = groups.map((group) => group.name);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [panelWidth, setPanelWidth] = useState(512);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const generatedQuery = buildLdapQuery(draftFilters, groupConditions);
  const hasFilledCondition = draftFilters.some((filter) => filter.value) || groupConditions.some((condition) => condition.value);
  const addFilterToGroup = (fieldId: string, value?: string) => {
    const groupId = createFilterGroup();
    setGroupConditions([...groupConditions, {
      id: `condition-${fieldId}-${Date.now()}`,
      groupId,
      fieldId,
      value,
      connector: 'AND',
    }]);
  };
  const handleResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.documentElement.style.cursor = 'col-resize';
    const move = (moveEvent: PointerEvent) => {
      setPanelWidth(Math.min(512, Math.max(338, startWidth + startX - moveEvent.clientX)));
    };
    const finish = () => {
      document.body.style.cursor = '';
      document.documentElement.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      resizeCleanupRef.current = null;
    };
    resizeCleanupRef.current = finish;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  };
  useEffect(() => () => resizeCleanupRef.current?.(), []);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(false);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 280);
    return () => clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (tab !== 'ask-ai') return;
    const filterSummary = [
      ...draftFilters.map((filter) => `${filter.fieldId} ${filter.operator ?? 'is'} ${filter.value || '*'}`),
      ...groupConditions.map((condition) => `${condition.connector} ${condition.fieldId} ${condition.operator ?? 'is'} ${condition.value || '*'}`),
    ].join('; ');
    setAiContext([
      { kind: 'group', id: 'advanced-search-filters', label: filterSummary || 'No visual filters selected' },
      { kind: 'group', id: 'advanced-search-groups', label: filterGroups.length ? `${filterGroups.length} filter group${filterGroups.length === 1 ? '' : 's'}` : 'No filter groups created' },
      { kind: 'group', id: 'advanced-search-query', label: ldapQueryManual ? (ldapQuery || 'Manual LDAP query is empty') : generatedQuery },
    ]);
  }, [tab, draftFilters, groupConditions, filterGroups, ldapQuery, ldapQueryManual, generatedQuery, setAiContext]);
  const handleTabChange = (value: AdvancedSearchTab) => setTab(value);
  if (!mounted) return null;
  return (
    <aside className={styles.panel} role="complementary" aria-label="Advanced Search" style={{ flexBasis: `${panelWidth}px` }}>
      <button type="button" className={styles.resizeHandle} aria-label="Resize Advanced Search" onPointerDown={handleResizePointerDown}>
        <span className={styles.resizeGrip} aria-hidden="true" />
      </button>
      <div className={`${styles.surface} ${visible ? styles.surfaceOpen : ''}`}>
        <header className={styles.header}>
          <div className={styles.modeTabs} role="tablist" aria-label="Advanced Search modes">
            <button type="button" role="tab" aria-selected={tab === 'basic'} className={`${styles.modeTab} ${tab === 'basic' ? styles.modeTabSelected : ''}`} onClick={() => handleTabChange('basic')} aria-label="Filter mode">
              <Icon name="FunnelSimple" size="20px" />
            </button>
            <button type="button" role="tab" aria-selected={tab === 'queries'} className={`${styles.modeTab} ${tab === 'queries' ? styles.modeTabSelected : ''}`} onClick={() => handleTabChange('queries')} aria-label="Query mode">
              <Icon name="BracketsCurly" size="20px" />
            </button>
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>{tab === 'queries' ? 'Query syntax' : 'Advanced filter'}</h2>
          </div>
          <IconButton icon="X" size="s" ariaLabel="Close Advanced Search" onClick={closeSearch} />
        </header>
        <div className={styles.content}>
      <div className={styles.tabContent}>
      {tab === 'basic' && (
        <>
          {filterGroups.length > 0 || groupConditions.length > 0
            ? <div className={styles.advancedGroupsStack}>
              <FilterGroupsTab groups={filterGroups} conditions={groupConditions} draftFilters={draftFilters} onChange={setGroupConditions} onDraftFiltersChange={setDraftFilters} onGroupsChange={setFilterGroups} onCreateGroup={createFilterGroup} groupOptions={groupOptions} />
            </div>
            : <BasicFilterTab filters={draftFilters} onChange={setDraftFilters} onClear={clearFilters} onAddFilter={addFilterToGroup} onCreateGroup={createFilterGroup} groupOptions={groupOptions} />}
        </>
      )}
      {tab === 'queries' && <QueriesTab filters={draftFilters} conditions={groupConditions} query={ldapQuery} manual={ldapQueryManual} onChange={setLdapQuery} />}
      {tab === 'ask-ai' && <AiPanel open onClose={() => setTab('basic')} className={styles.aiPanel} />}
      </div>
        </div>
        {hasFilledCondition && <footer className={styles.footer}>
          <button type="button" className={styles.clearAllButton} onClick={clearFilters}>Clear all</button>
          <div className={styles.footerActions}>
            <Button variant="secondary" size="s" onClick={closeSearch}>Cancel</Button>
            <Button variant="primary" size="s" onClick={applyFilters}>Apply filter</Button>
          </div>
        </footer>}
      </div>
    </aside>
  );
}

const BASIC_FIELDS: { id: string; label: string; options?: string[] }[] = [
  { id: 'displayName', label: 'Display name' },
  { id: 'objectType', label: 'Object type', options: ['User', 'Group', 'Computer', 'Contact', 'Organizational unit', 'Service account'] },
  { id: 'tags', label: 'Tags', options: ['Security', 'Compliance', 'Privileged', 'Managed', 'New'] },
  { id: 'location', label: 'Location', options: ['Entra 1', 'Entra 2', 'AD-1', 'AD-2'] },
  { id: 'dateActive', label: 'Date active' },
  { id: 'dateCreated', label: 'Date created' },
];

const TEXT_OPERATORS = ['is', 'starts with', 'ends with', 'contains', 'equals', 'does not equal', 'is empty', 'is not empty'];
const DATE_OPERATORS = ['is', 'is before', 'is after', 'is between', 'is in the last...', 'is in the next...'];
const USER_FIELDS = [{ id: 'memberOf', label: 'Member of' }, { id: 'ownerOf', label: 'Owner of' }, { id: 'userType', label: 'User type', options: ['User', 'Admin', 'Service account'] }];
const COMPUTER_FIELDS = [{ id: 'computerType', label: 'Computer type', options: ['Computer', 'Device', 'Operator computer', 'Workstation'] }];
const GROUP_FIELDS = [{ id: 'membershipType', label: 'Membership type', options: ['Security Group', 'Distribution Group'] }];
function FilterAddMenu({ onAdd, onCreateGroup, groupOptions = [] }: { onAdd: (fieldId: string, value?: string) => void; onCreateGroup?: () => void; groupOptions?: string[] }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const propertyItems: MenuEntry[] = BASIC_FIELDS.map((field) => ({ kind: 'item', label: field.label, onSelect: () => { onAdd(field.id); setCategory(null); } }));
  const placeholderItems: MenuEntry[] = [{ kind: 'item', label: 'No properties available', disabled: true }];
  const userItems: MenuEntry[] = USER_FIELDS.map((field): MenuEntry => ({ kind: 'item', label: field.label, onSelect: () => { onAdd(field.id); setCategory(null); } }));
  const computerItems: MenuEntry[] = COMPUTER_FIELDS.map((field): MenuEntry => ({ kind: 'item', label: field.label, onSelect: () => { onAdd(field.id); setCategory(null); } }));
  const groupItems: MenuEntry[] = GROUP_FIELDS.map((field): MenuEntry => ({ kind: 'submenu', label: field.label, selected: category === field.id, onOpen: () => setCategory(field.id), items: field.options.map((option): MenuEntry => ({ kind: 'item', label: option, onSelect: () => { onAdd(field.id, option); setCategory(null); } })) }));
  const categoryIcons: Record<string, string> = { Common: 'IdentificationCard', User: 'DiamondsFour', Computer: 'MapPinSimpleArea', Groups: 'CalendarDots' };
  const categoryItems: MenuEntry[] = [
    ...(onCreateGroup ? [{ kind: 'item' as const, label: 'Add filter group', icon: 'FunnelSimple', onSelect: onCreateGroup }, { kind: 'divider' as const }] : []),
    ...MENU_ITEMS.map((item): MenuEntry => ({ kind: 'submenu', label: item, icon: categoryIcons[item], selected: category === item, onOpen: () => setCategory(item), items: item === 'Common' ? propertyItems : item === 'User' ? userItems : item === 'Computer' ? computerItems : item === 'Groups' ? groupItems : placeholderItems })),
  ];
  return <Menu ariaLabel="Filter categories" align="center" open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setCategory(null); }} items={categoryItems} trigger={({ ref, onClick, expanded }) => <Button ref={ref as React.Ref<HTMLButtonElement>} variant="secondary" iconLead="Plus" className={styles.addFiltersButton} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>Add filter</Button>} />;
}

function FilterChip({ filter, onChange, onRemove, groupOptions = [] }: { filter: AdvancedFilter; onChange: (patch: Partial<AdvancedFilter>) => void; onRemove: () => void; groupOptions?: string[] }) {
  const fields = [...BASIC_FIELDS, ...USER_FIELDS, ...COMPUTER_FIELDS, ...GROUP_FIELDS];
  const field = fields.find((item) => item.id === filter.fieldId);
  const operators = filter.fieldId.startsWith('date') ? DATE_OPERATORS : TEXT_OPERATORS;
  const options = filter.fieldId === 'memberOf' || filter.fieldId === 'ownerOf' ? groupOptions : field?.options;
  return <div className={styles.filterRuleRow}>
    <Menu ariaLabel="Filter parameter" align="start" items={fields.map((item): MenuEntry => ({ kind: 'item', label: item.label, selected: filter.fieldId === item.id, onSelect: () => onChange({ fieldId: item.id, operator: undefined, value: '' }) }))} trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={styles.ruleControl} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>{field?.label ?? 'Select a parameter...'}<Icon name="CaretUpDown" size="16px" /></button>} />
    <Menu ariaLabel={`${filter.fieldId} operator`} align="start" items={operators.map((operator): MenuEntry => ({ kind: 'item', label: operator, selected: (filter.operator ?? '') === operator, onSelect: () => onChange({ operator, value: operator.includes('empty') ? '' : filter.value }) }))} trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={styles.ruleControl} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>{filter.operator ?? 'Select an operator...'}<Icon name="CaretUpDown" size="16px" /></button>} />
    {options ? <Menu ariaLabel={`${filter.fieldId} value`} align="start" items={options.map((option): MenuEntry => ({ kind: 'item', label: option, selected: filter.value === option, onSelect: () => onChange({ value: option }) }))} trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={styles.ruleControl} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>{filter.value || 'Enter a value'}<Icon name="CaretUpDown" size="16px" /></button>} /> : <input className={styles.ruleValue} type={filter.fieldId.startsWith('date') ? 'date' : 'text'} value={filter.value ?? ''} placeholder="Enter a value" aria-label={`${filter.fieldId} value`} onChange={(event) => onChange({ value: event.target.value })} />}
    <IconButton icon="Trash" size="s" ariaLabel={`Remove ${filter.fieldId} filter`} className={styles.filterRemove} onClick={onRemove} />
  </div>;
}

function EmptyRule({ onAdd }: { onAdd: (fieldId: string) => void }) {
  const fields = [...BASIC_FIELDS, ...USER_FIELDS, ...COMPUTER_FIELDS, ...GROUP_FIELDS];
  return <div className={styles.filterRuleRow}>
    <Menu ariaLabel="Filter parameter" align="start" items={fields.map((item): MenuEntry => ({ kind: 'item', label: item.label, onSelect: () => onAdd(item.id) }))} trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={`${styles.ruleControl} ${styles.ruleControlFocused}`} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>Select a parameter...<Icon name="CaretUpDown" size="16px" /></button>} />
    <button type="button" className={styles.ruleControl} disabled>Select an operator...<Icon name="CaretUpDown" size="16px" /></button>
    <button type="button" className={styles.ruleControl} disabled>Enter a value<Icon name="CaretUpDown" size="16px" /></button>
  </div>;
}

function BasicFilterTab({ filters, onChange, onAddFilter, onCreateGroup, groupOptions, showAddCard = true }: { filters: AdvancedFilter[]; onChange: (filters: AdvancedFilter[]) => void; onClear: () => void; onAddFilter: (fieldId: string, value?: string) => void; onCreateGroup: () => void; groupOptions: string[]; showAddCard?: boolean }) {
  return (
    <div className={styles.basic}>
      {showAddCard && <section className={styles.addCard}>
        {filters.length === 0
          ? <div className={styles.emptyFilterState}>
            <img className={styles.emptyFilterIllustration} src="/filter-empty-illustration.svg" alt="" />
            <FilterAddMenu onAdd={onAddFilter} onCreateGroup={onCreateGroup} />
            <span className={styles.filtersGuide}>Read the filters guide</span>
          </div>
          : <div className={styles.menuTriggerRow}><FilterAddMenu onAdd={onAddFilter} onCreateGroup={onCreateGroup} /></div>}
      </section>}
      <div className={styles.selectedFilters} aria-label="Added filters">
        {filters.map((filter) => <FilterChip key={filter.id} filter={filter} groupOptions={groupOptions} onChange={(patch) => onChange(filters.map((item) => item.id === filter.id ? { ...item, ...patch } : item))} onRemove={() => onChange(filters.filter((item) => item.id !== filter.id))} />)}
      </div>
    </div>
  );
}

function BasicFilterGroup({ filters, onChange, groups, conditions, onConditionsChange, onGroupsChange, onCreateGroup, groupOptions }: { filters: AdvancedFilter[]; onChange: (filters: AdvancedFilter[]) => void; groups: FilterGroup[]; conditions: FilterGroupCondition[]; onConditionsChange: (conditions: FilterGroupCondition[]) => void; onGroupsChange: (groups: FilterGroup[]) => void; onCreateGroup: (parentGroupId?: string) => string; groupOptions: string[] }) {
  const addFilter = (fieldId: string) => onChange([...filters, { id: `${fieldId}-${Date.now()}-${Math.random()}`, fieldId }]);
  const childGroups = (parentGroupId: string) => groups.filter((group) => group.parentGroupId === parentGroupId);
  const removeGroup = (groupId: string) => {
    onGroupsChange(groups.filter((group) => group.id !== groupId && group.parentGroupId !== groupId));
    onConditionsChange(conditions.filter((condition) => condition.groupId !== groupId));
  };
  const renderNestedGroup = (group: FilterGroup): React.ReactNode => {
    const groupConditions = conditions.filter((condition) => condition.groupId === group.id);
    return <div className={styles.nestedGroup} key={group.id}>
      <button type="button" className={styles.removeGroup} aria-label="Remove sub-group" onClick={() => removeGroup(group.id)}><Icon name="X" size="16px" /></button>
      <div className={styles.selectedFilters} aria-label="Sub-group filters">
        {groupConditions.map((condition) => <FilterChip key={condition.id} filter={condition} groupOptions={groupOptions} onChange={(patch) => onConditionsChange(conditions.map((item) => item.id === condition.id ? { ...item, ...patch } : item))} onRemove={() => onConditionsChange(conditions.filter((item) => item.id !== condition.id))} />)}
      </div>
      <div className={styles.groupActions}>
        <FilterAddMenu onAdd={(fieldId) => onConditionsChange([...conditions, { id: `condition-${fieldId}-${Date.now()}`, groupId: group.id, fieldId, connector: 'AND', operator: 'is' }])} />
      </div>
      {childGroups(group.id).map(renderNestedGroup)}
    </div>;
  };
  return (
    <section className={styles.groupContainer} aria-label="Basic filter group">
      <button type="button" className={styles.dragHandle} draggable aria-label="Reorder basic filter group"><Icon name="DotsSixVertical" size="16px" /></button>
      <button type="button" className={styles.removeGroup} aria-label="Remove basic filter group" onClick={() => onChange([])}><Icon name="X" size="16px" /></button>
      <div className={styles.selectedFilters} aria-label="Basic filters">
        {filters.map((filter) => <FilterChip key={filter.id} filter={filter} groupOptions={groupOptions} onChange={(patch) => onChange(filters.map((item) => item.id === filter.id ? { ...item, ...patch } : item))} onRemove={() => onChange(filters.filter((item) => item.id !== filter.id))} />)}
      </div>
      <div className={styles.groupActions}>
        <FilterAddMenu onAdd={addFilter} />
      </div>
      {childGroups('basic-filters').map(renderNestedGroup)}
    </section>
  );
}

function buildLdapQuery(filters: AdvancedFilter[], conditions: FilterGroupCondition[]): string {
  if (filters.length === 0 && conditions.length === 0) return '(objectClass=*)';
  const filterPart = filters.map((filter) => `(${filter.fieldId}=${filter.value || '*'})`).join('');
  const groupPart = conditions.map((condition, index) => `${index > 0 ? ` ${condition.connector} ` : ''}(${condition.fieldId}=${condition.value || '*'})`).join('');
  return `(&${filterPart}${groupPart})`;
}

function FilterGroupsTab({ groups, conditions, draftFilters, onChange, onDraftFiltersChange, onGroupsChange, onCreateGroup, groupOptions }: { groups: FilterGroup[]; conditions: FilterGroupCondition[]; draftFilters: AdvancedFilter[]; onChange: (conditions: FilterGroupCondition[]) => void; onDraftFiltersChange: (filters: AdvancedFilter[]) => void; onGroupsChange: (groups: FilterGroup[]) => void; onCreateGroup: (parentGroupId?: string) => string; groupOptions: string[] }) {
  const [dragGroupId, setDragGroupId] = useState<string | null>(null);
  const addCondition = (groupId: string, fieldId = 'displayName') => onChange([...conditions, { id: `condition-${fieldId}-${Date.now()}`, groupId, fieldId, connector: 'AND', operator: 'is' }]);
  const update = (id: string, patch: Partial<FilterGroupCondition>) => onChange(conditions.map((condition) => condition.id === id ? { ...condition, ...patch } : condition));
  const groupIds = Array.from(new Set([...groups.map((group) => group.id), ...conditions.map((condition) => condition.groupId ?? 'default')]));
  const childGroups = (parentGroupId: string) => groups.filter((group) => group.parentGroupId === parentGroupId).map((group) => group.id);
  const removeGroup = (groupId: string) => {
    const removed = new Set<string>([groupId]);
    let changed = true;
    while (changed) {
      changed = false;
      groups.forEach((group) => {
        if (group.parentGroupId && removed.has(group.parentGroupId) && !removed.has(group.id)) {
          removed.add(group.id);
          changed = true;
        }
      });
    }
    const removedConditionIds = new Set(conditions.filter((condition) => condition.groupId && removed.has(condition.groupId)).map((condition) => condition.id.replace('condition-', '')));
    onGroupsChange(groups.filter((group) => !removed.has(group.id)));
    onChange(conditions.filter((condition) => !condition.groupId || !removed.has(condition.groupId)));
    onDraftFiltersChange(draftFilters.filter((filter) => !removedConditionIds.has(filter.id)));
  };
  const reorderGroup = (groupId: string, targetGroupId: string) => {
    const source = groups.find((group) => group.id === groupId);
    const target = groups.find((group) => group.id === targetGroupId);
    if (!source || !target || source.parentGroupId !== target.parentGroupId || source.id === target.id) return;
    const siblings = groups.filter((group) => group.parentGroupId === source.parentGroupId);
    const reordered = [...siblings];
    const fromIndex = reordered.findIndex((group) => group.id === source.id);
    const toIndex = reordered.findIndex((group) => group.id === target.id);
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const siblingIds = new Set(siblings.map((group) => group.id));
    let siblingIndex = 0;
    onGroupsChange(groups.map((group) => siblingIds.has(group.id) ? reordered[siblingIndex++] : group));
  };
  const connectorMenu = (group: FilterGroup) => (
    <Menu
      ariaLabel="Filter group connector"
      align="start"
      items={(['AND', 'OR'] as const).map((connector): MenuEntry => ({
        kind: 'item',
        label: connector,
        selected: (group.connector ?? 'AND') === connector,
        onSelect: () => onGroupsChange(groups.map((item) => item.id === group.id ? { ...item, connector } : item)),
      }))}
      trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={styles.connectorChip} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>{group.connector ?? 'AND'}<Icon name="CaretDown" size="12px" /></button>}
    />
  );
  const conditionConnector = (condition: FilterGroupCondition) => (
    <div className={styles.conditionSeparator}>
      <span className={styles.conditionSeparatorLine} />
      <button type="button" className={styles.conditionConnector} onClick={() => update(condition.id, { connector: condition.connector === 'OR' ? 'AND' : 'OR' })} aria-label={`Change ${condition.connector} to ${condition.connector === 'OR' ? 'AND' : 'OR'}`}>
        <span key={condition.connector} className={styles.conditionConnectorLabel}>{condition.connector}</span>
      </button>
    </div>
  );
  const renderGroup = (groupId: string, depth = 0): React.ReactNode => {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return null;
    const groupConditions = conditions.filter((condition) => (condition.groupId ?? 'default') === groupId);
    return <section className={`${styles.groupBlock} ${depth > 0 ? styles.nestedGroup : ''}`} key={groupId} onDragOver={(event) => { if (dragGroupId && dragGroupId !== groupId) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (dragGroupId) reorderGroup(dragGroupId, groupId); setDragGroupId(null); }}>
      {depth === 0 && <p className={styles.groupConditionLabel}>Where all conditions are met</p>}
      <div className={`${styles.groupContainer} ${groupConditions.length > 0 ? styles.groupContainerFilled : ''}`}>
      <div className={styles.groupCardHeader}>
        {depth === 0 ? <button type="button" className={styles.dragHandle} draggable aria-label="Reorder filter group" onDragStart={() => setDragGroupId(groupId)} onDragEnd={() => setDragGroupId(null)}><Icon name="DotsSixVertical" size="16px" /></button> : <span />}
        {depth === 0 && <button type="button" className={styles.removeGroup} aria-label="Remove filter group" onClick={() => removeGroup(groupId)}><Icon name="X" size="16px" /></button>}
      </div>
      {groupConditions.length === 0 && <EmptyRule onAdd={(fieldId) => addCondition(groupId, fieldId)} />}
      {groupConditions.map((condition, index) => <Fragment key={condition.id}>{index > 0 && conditionConnector(condition)}<FilterChip filter={condition} groupOptions={groupOptions} onChange={(patch) => update(condition.id, patch)} onRemove={() => {
        onChange(conditions.filter((item) => item.id !== condition.id));
        onDraftFiltersChange(draftFilters.filter((filter) => filter.id !== condition.id.replace('condition-', '')));
      }} /></Fragment>)}
      <div className={styles.groupActions}><button type="button" className={styles.groupAction} onClick={() => addCondition(groupId)}><Icon name="Plus" size="16px" />Add a new condition</button></div>
      {childGroups(groupId).map((childGroupId) => <Fragment key={childGroupId}>{connectorMenu(groups.find((item) => item.id === childGroupId) ?? group)}{renderGroup(childGroupId, depth + 1)}</Fragment>)}
      </div>
    </section>;
  };
  const rootGroupIds = groupIds.filter((groupId) => !groups.some((group) => group.id === groupId && group.parentGroupId));
  return (
    <section className={styles.groupBuilder}>
      {rootGroupIds.map((groupId, index) => <Fragment key={groupId}>{index > 0 && connectorMenu(groups.find((group) => group.id === groupId) ?? groups[0])}{renderGroup(groupId)}</Fragment>)}
      <button type="button" className={styles.addAndButton} onClick={() => onCreateGroup()}>+AND</button>
    </section>
  );
}

const QUERY_LANGUAGES = ['LDAP', 'Graph', 'PowerShell', 'SCIM'];

function QueriesTab({ filters, conditions, query, manual, onChange }: { filters: AdvancedFilter[]; conditions: FilterGroupCondition[]; query: string; manual: boolean; onChange: (query: string) => void }) {
  const [language, setLanguage] = useState(QUERY_LANGUAGES[0]);
  const [queries, setQueries] = useState<Record<string, string>>({});
  const generated = buildLdapQuery(filters, conditions);
  const value = language === 'LDAP' && !manual ? generated : queries[language] ?? (language === 'LDAP' ? query : '');
  const updateQuery = (nextQuery: string) => {
    setQueries((current) => ({ ...current, [language]: nextQuery }));
    if (language === 'LDAP') onChange(nextQuery);
  };
  return (
    <section className={styles.queryTab}>
      <h3>Query</h3>
      <p>Select a query language to view or edit your query.</p>
      <Menu
        ariaLabel="Query language"
        align="start"
        items={QUERY_LANGUAGES.map((item): MenuEntry => ({ kind: 'item', label: item, selected: language === item, onSelect: () => setLanguage(item) }))}
        trigger={({ ref, onClick, expanded }) => (
          <Select ref={ref as React.Ref<HTMLButtonElement>} label={language} size="s" className={styles.queryLanguageSelect} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded} aria-label="Query language" />
        )}
      />
      <textarea value={value} onChange={(event) => updateQuery(event.target.value)} aria-label={`${language} query`} spellCheck={false} />
    </section>
  );
}
