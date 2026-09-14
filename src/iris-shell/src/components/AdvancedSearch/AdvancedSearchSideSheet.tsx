import { Fragment, useEffect, useState } from 'react';
import { Tabs, type TabItem } from '../Tabs/Tabs.js';
import { Button } from '../Button/Button.js';
import { Modal } from '../Modal/Modal.js';
import { TextInput } from '../TextInput/TextInput.js';
import { Icon } from '../Icon/Icon.js';
import { IconButton } from '../IconButton/IconButton.js';
import { Menu, type MenuEntry } from '../Menu/Menu.js';
import { AiPanel } from '../AiPanel/AiPanel.js';
import { Toggle } from '../Toggle/Toggle.js';
import { Select } from '../Select/Select.js';
import { useAdvancedSearch, type AdvancedSearchTab, type AdvancedFilter, type FilterGroup, type FilterGroupCondition } from '../../lib/advancedSearchStore.js';
import { useAppShell } from '../../lib/appShellContext.js';
import styles from './AdvancedSearchSideSheet.module.css';

const TABS: TabItem[] = [
  { value: 'basic', label: 'Filter', icon: 'FunnelSimple' },
  { value: 'queries', label: 'Query', icon: 'BracketsCurly' },
  { value: 'ask-ai', label: 'Ask AI', icon: 'Sparkle' },
];

const MENU_ITEMS = ['Common', 'Account', 'User', 'Contact', 'Device', 'Dates', 'Phonetic properties'];

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
  const { open, tab, setTab, closeSearch, draftFilters, setDraftFilters, applyFilters, clearFilters, groupConditions, setGroupConditions, filterGroups, setFilterGroups, advancedFilterMode, setAdvancedFilterMode, createFilterGroup, ldapQuery, ldapQueryManual, setLdapQuery } = useAdvancedSearch();
  const { setAiContext } = useAppShell();
  const [discardAdvancedOpen, setDiscardAdvancedOpen] = useState(false);
  const generatedQuery = buildLdapQuery(draftFilters, groupConditions);
  const tabs = TABS.map((item) => item.value === 'basic'
    ? { ...item, counter: draftFilters.length + groupConditions.length }
    : item);
  const handleAdvancedModeChange = (enabled: boolean) => {
    if (enabled || (filterGroups.length === 0 && groupConditions.length === 0)) {
      setAdvancedFilterMode(enabled);
      return;
    }
    setDiscardAdvancedOpen(true);
  };
  const discardAdvancedFilters = () => {
    setGroupConditions([]);
    setFilterGroups([]);
    setAdvancedFilterMode(false);
    setDiscardAdvancedOpen(false);
  };
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
  if (!open) return null;
  return (
    <aside className={styles.panel} role="complementary" aria-label="Advanced Search">
      <div className={styles.surface}>
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Filter Options</h2>
            <p className={styles.subtitle}>Add filter options to refine your search and directory views.</p>
          </div>
          <IconButton icon="X" size="s" ariaLabel="Close Advanced Search" onClick={closeSearch} />
        </header>
        <div className={styles.content}>
      <Tabs items={tabs} value={tab} onChange={(value) => handleTabChange(value as AdvancedSearchTab)} ariaLabel="Advanced Search tabs" />
      <div className={styles.tabContent}>
      {tab === 'basic' && (
        <>
          {advancedFilterMode
            ? <div className={styles.advancedGroupsStack}>
              <FilterGroupsTab groups={filterGroups} conditions={groupConditions} onChange={setGroupConditions} onGroupsChange={setFilterGroups} onCreateGroup={createFilterGroup} advancedFilterMode={advancedFilterMode} onAdvancedFilterModeChange={handleAdvancedModeChange} />
              {draftFilters.length > 0 && filterGroups.some((group) => !group.parentGroupId) && <FilterGroupConnector group={filterGroups.find((group) => !group.parentGroupId)!} groups={filterGroups} onGroupsChange={setFilterGroups} />}
              {draftFilters.length > 0 && <BasicFilterGroup filters={draftFilters} onChange={setDraftFilters} groups={filterGroups} conditions={groupConditions} onConditionsChange={setGroupConditions} onGroupsChange={setFilterGroups} onCreateGroup={createFilterGroup} />}
            </div>
            : <BasicFilterTab filters={draftFilters} onChange={setDraftFilters} onClear={clearFilters} onCreateGroup={createFilterGroup} advancedFilterMode={advancedFilterMode} onAdvancedFilterModeChange={handleAdvancedModeChange} />}
        </>
      )}
      {tab === 'queries' && <QueriesTab filters={draftFilters} conditions={groupConditions} query={ldapQuery} manual={ldapQueryManual} onChange={setLdapQuery} />}
      {tab === 'ask-ai' && <AiPanel open onClose={() => setTab('basic')} className={styles.aiPanel} />}
      </div>
        </div>
        <footer className={styles.footer}><Button variant="secondary" onClick={closeSearch}>Close</Button><Button variant="primary" onClick={applyFilters}>Apply filter</Button></footer>
      </div>
      <Modal
        open={discardAdvancedOpen}
        onClose={() => setDiscardAdvancedOpen(false)}
        title="Leave advanced filter mode?"
        leadingIcon="Warning"
        size="s"
        footer={<><Button variant="secondary" onClick={() => setDiscardAdvancedOpen(false)}>Cancel</Button><Button variant="danger" onClick={discardAdvancedFilters}>Discard advanced filters</Button></>}
      >
        <p className={styles.warningText}>Switching to basic filter mode will remove your advanced filter groups and conditions.</p>
      </Modal>
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
function FilterAddMenu({ onAdd, onCreateGroup }: { onAdd: (fieldId: string) => void; onCreateGroup?: () => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const propertyItems: MenuEntry[] = BASIC_FIELDS.map((field) => ({ kind: 'item', label: field.label, onSelect: () => { onAdd(field.id); setCategory(null); } }));
  const placeholderItems: MenuEntry[] = [{ kind: 'item', label: 'No properties available', disabled: true }];
  const categoryItems: MenuEntry[] = [
    ...[...MENU_ITEMS, 'Other properties'].map((item): MenuEntry => ({ kind: 'submenu', label: item, selected: category === item, onOpen: () => setCategory(item), items: item === 'Common' ? propertyItems : placeholderItems })),
    ...(onCreateGroup ? [{ kind: 'divider' as const }, { kind: 'item' as const, label: 'Create filter group', icon: 'TreeView', onSelect: onCreateGroup }] : []),
  ];
  return <Menu ariaLabel="Filter categories" align="start" open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setCategory(null); }} items={categoryItems} trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={styles.addFiltersButton} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}><Icon name="Plus" size="16px" />Add filter</button>} />;
}

function FilterChip({ filter, onChange, onRemove }: { filter: AdvancedFilter; onChange: (patch: Partial<AdvancedFilter>) => void; onRemove: () => void }) {
  const field = BASIC_FIELDS.find((item) => item.id === filter.fieldId);
  const operators = filter.fieldId.startsWith('date') ? DATE_OPERATORS : TEXT_OPERATORS;
  return <div className={styles.filterChip}>
    <div className={styles.filterMain}>
      <span className={styles.filterField}>{field?.label ?? filter.fieldId}</span>
      <Menu ariaLabel={`${filter.fieldId} operator`} align="start" items={operators.map((operator): MenuEntry => ({ kind: 'item', label: operator, selected: (filter.operator ?? 'is') === operator, onSelect: () => onChange({ operator, value: operator.includes('empty') ? '' : filter.value }) }))} trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={styles.filterRule} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>{filter.operator ?? 'is'}</button>} />
      {field?.options ? <Menu ariaLabel={`${filter.fieldId} value`} align="start" items={field.options.map((option): MenuEntry => ({ kind: 'item', label: option, selected: filter.value === option, onSelect: () => onChange({ value: option }) }))} trigger={({ ref, onClick, expanded }) => <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={styles.filterValueButton} onClick={onClick} aria-haspopup="menu" aria-expanded={expanded}>{filter.value || 'Select value'}<Icon name="CaretDown" size="12px" /></button>} /> : <input className={styles.filterValue} value={filter.value ?? ''} placeholder="Select value" aria-label={`${filter.fieldId} value`} onChange={(event) => onChange({ value: event.target.value })} />}
    </div>
    <button type="button" className={styles.filterRemove} aria-label={`Remove ${filter.fieldId} filter`} onClick={onRemove}><Icon name="X" size="16px" /></button>
  </div>;
}

function BasicFilterTab({ filters, onChange, onCreateGroup, advancedFilterMode, onAdvancedFilterModeChange, showAddCard = true }: { filters: AdvancedFilter[]; onChange: (filters: AdvancedFilter[]) => void; onClear: () => void; onCreateGroup: () => void; advancedFilterMode: boolean; onAdvancedFilterModeChange: (enabled: boolean) => void; showAddCard?: boolean }) {
  const addFilter = (fieldId: string) => onChange([...filters, { id: `${fieldId}-${Date.now()}-${Math.random()}`, fieldId }]);
  return (
    <div className={styles.basic}>
      {showAddCard && <section className={styles.addCard}>
        <div className={styles.advancedModeRow}>
          <Toggle checked={advancedFilterMode} onChange={onAdvancedFilterModeChange} ariaLabel="Advanced filter mode" />
          <span className={styles.advancedModeLabel}>Advanced filter mode</span>
        </div>
        <div className={styles.addCardContent}>
          <h3>Add filters</h3>
        </div>
        <div className={styles.menuTriggerRow}><FilterAddMenu onAdd={addFilter} onCreateGroup={onCreateGroup} /></div>
      </section>}
      <div className={styles.selectedFilters} aria-label="Added filters">
        {filters.map((filter) => <FilterChip key={filter.id} filter={filter} onChange={(patch) => onChange(filters.map((item) => item.id === filter.id ? { ...item, ...patch } : item))} onRemove={() => onChange(filters.filter((item) => item.id !== filter.id))} />)}
      </div>
    </div>
  );
}

function BasicFilterGroup({ filters, onChange, groups, conditions, onConditionsChange, onGroupsChange, onCreateGroup }: { filters: AdvancedFilter[]; onChange: (filters: AdvancedFilter[]) => void; groups: FilterGroup[]; conditions: FilterGroupCondition[]; onConditionsChange: (conditions: FilterGroupCondition[]) => void; onGroupsChange: (groups: FilterGroup[]) => void; onCreateGroup: (parentGroupId?: string) => string }) {
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
        {groupConditions.map((condition) => <FilterChip key={condition.id} filter={condition} onChange={(patch) => onConditionsChange(conditions.map((item) => item.id === condition.id ? { ...item, ...patch } : item))} onRemove={() => onConditionsChange(conditions.filter((item) => item.id !== condition.id))} />)}
      </div>
      <div className={styles.groupActions}>
        <FilterAddMenu onAdd={(fieldId) => onConditionsChange([...conditions, { id: `condition-${fieldId}-${Date.now()}`, groupId: group.id, fieldId, connector: 'AND', operator: 'is' }])} />
        <button type="button" className={styles.groupAction} onClick={() => { onCreateGroup(group.id); }}><Icon name="Plus" size="16px" />Add sub-group</button>
      </div>
      {childGroups(group.id).map(renderNestedGroup)}
    </div>;
  };
  return (
    <section className={styles.groupContainer} aria-label="Basic filter group">
      <button type="button" className={styles.dragHandle} draggable aria-label="Reorder basic filter group"><Icon name="DotsSixVertical" size="16px" /></button>
      <button type="button" className={styles.removeGroup} aria-label="Remove basic filter group" onClick={() => onChange([])}><Icon name="X" size="16px" /></button>
      <div className={styles.selectedFilters} aria-label="Basic filters">
        {filters.map((filter) => <FilterChip key={filter.id} filter={filter} onChange={(patch) => onChange(filters.map((item) => item.id === filter.id ? { ...item, ...patch } : item))} onRemove={() => onChange(filters.filter((item) => item.id !== filter.id))} />)}
      </div>
      <div className={styles.groupActions}>
        <FilterAddMenu onAdd={addFilter} />
        <button type="button" className={styles.groupAction} onClick={() => { onCreateGroup('basic-filters'); }}><Icon name="Plus" size="16px" />Add sub-group</button>
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

function FilterGroupsTab({ groups, conditions, onChange, onGroupsChange, onCreateGroup, advancedFilterMode, onAdvancedFilterModeChange }: { groups: FilterGroup[]; conditions: FilterGroupCondition[]; onChange: (conditions: FilterGroupCondition[]) => void; onGroupsChange: (groups: FilterGroup[]) => void; onCreateGroup: (parentGroupId?: string) => string; advancedFilterMode: boolean; onAdvancedFilterModeChange: (enabled: boolean) => void }) {
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
    onGroupsChange(groups.filter((group) => !removed.has(group.id)));
    onChange(conditions.filter((condition) => !condition.groupId || !removed.has(condition.groupId)));
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
  const renderGroup = (groupId: string, depth = 0): React.ReactNode => {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return null;
    const groupConditions = conditions.filter((condition) => (condition.groupId ?? 'default') === groupId);
    return <div className={`${styles.groupContainer} ${depth > 0 ? styles.nestedGroup : ''}`} key={groupId} onDragOver={(event) => { if (dragGroupId && dragGroupId !== groupId) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (dragGroupId) reorderGroup(dragGroupId, groupId); setDragGroupId(null); }}>
      <button type="button" className={styles.dragHandle} draggable aria-label="Reorder filter group" onDragStart={() => setDragGroupId(groupId)} onDragEnd={() => setDragGroupId(null)}><Icon name="DotsSixVertical" size="16px" /></button>
      <button type="button" className={styles.removeGroup} aria-label="Remove filter group" onClick={() => removeGroup(groupId)}><Icon name="X" size="16px" /></button>
      {groupConditions.map((condition, groupIndex) => <FilterChip key={condition.id} filter={condition} onChange={(patch) => update(condition.id, patch)} onRemove={() => onChange(conditions.filter((item) => item.id !== condition.id))} />)}
      <div className={styles.groupActions}><FilterAddMenu onAdd={(fieldId) => addCondition(groupId, fieldId)} /><button type="button" className={styles.groupAction} onClick={() => onCreateGroup(groupId)}><Icon name="Plus" size="16px" />Add sub-group</button></div>
      {childGroups(groupId).map((childGroupId) => <Fragment key={childGroupId}>{connectorMenu(groups.find((item) => item.id === childGroupId) ?? group)}{renderGroup(childGroupId, depth + 1)}</Fragment>)}
    </div>;
  };
  return (
    <section className={styles.groupBuilder}>
      <div className={styles.groupHeader}>
        <div className={styles.advancedModeRow}>
          <Toggle checked={advancedFilterMode} onChange={onAdvancedFilterModeChange} ariaLabel="Advanced filter mode" />
          <span className={styles.advancedModeLabel}>Advanced filter mode</span>
        </div>
        <div className={styles.groupHeaderContent}>
          <h3>Add filters and create filter groups</h3>
        </div>
        <div className={styles.groupHeaderActions}>
          <button type="button" className={styles.addFiltersButton} onClick={() => onCreateGroup()}><Icon name="Plus" size="16px" />Create filter group</button>
        </div>
      </div>
      {groupIds.filter((groupId) => !groups.some((group) => group.id === groupId && group.parentGroupId)).map((groupId, index) => <Fragment key={groupId}>{index > 0 && connectorMenu(groups.find((group) => group.id === groupId) ?? groups[0])}{renderGroup(groupId)}</Fragment>)}
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
