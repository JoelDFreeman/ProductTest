import { useEffect, useState } from 'react';
import { Tabs, type TabItem } from '../Tabs/Tabs.js';
import { Button } from '../Button/Button.js';
import { TextInput } from '../TextInput/TextInput.js';
import { Icon } from '../Icon/Icon.js';
import { IconButton } from '../IconButton/IconButton.js';
import { Menu, type MenuEntry } from '../Menu/Menu.js';
import { AiPanel } from '../AiPanel/AiPanel.js';
import { useAdvancedSearch, type AdvancedSearchTab, type AdvancedFilter, type FilterGroup, type FilterGroupCondition } from '../../lib/advancedSearchStore.js';
import { useAppShell } from '../../lib/appShellContext.js';
import styles from './AdvancedSearchSideSheet.module.css';

const TABS: TabItem[] = [
  { value: 'basic', label: 'Filter', icon: 'FunnelSimple' },
  { value: 'groups', label: 'Filter groups', icon: 'TreeView' },
  { value: 'queries', label: 'Query', icon: 'BracketsCurly' },
  { value: 'ask-ai', label: 'Ask AI', icon: 'Sparkle' },
];

const MENU_ITEMS = ['Common', 'Account', 'User', 'Contact', 'Device', 'Dates', 'Phonetic properties'];

export function AdvancedSearchSideSheet() {
  const { open, tab, setTab, closeSearch, draftFilters, setDraftFilters, applyFilters, clearFilters, groupConditions, setGroupConditions, filterGroups, setFilterGroups, createFilterGroup, ldapQuery, ldapQueryManual, setLdapQuery } = useAdvancedSearch();
  const { setAiContext } = useAppShell();
  const generatedQuery = buildLdapQuery(draftFilters, groupConditions);
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
          <IconButton icon="X" ariaLabel="Close Advanced Search" onClick={closeSearch} />
        </header>
        <div className={styles.content}>
      <Tabs items={TABS} value={tab} onChange={(value) => handleTabChange(value as AdvancedSearchTab)} ariaLabel="Advanced Search tabs" />
      {tab === 'basic' && <BasicFilterTab filters={draftFilters} onChange={setDraftFilters} onClear={clearFilters} onCreateGroup={createFilterGroup} />}
      {tab === 'groups' && <FilterGroupsTab groups={filterGroups} conditions={groupConditions} onChange={setGroupConditions} onGroupsChange={setFilterGroups} onCreateGroup={createFilterGroup} />}
      {tab === 'queries' && <QueriesTab filters={draftFilters} conditions={groupConditions} query={ldapQuery} manual={ldapQueryManual} onChange={setLdapQuery} />}
      {tab === 'ask-ai' && <AiPanel open onClose={() => setTab('basic')} className={styles.aiPanel} />}
        </div>
        <footer className={styles.footer}><Button variant="secondary" onClick={closeSearch}>Close</Button><Button variant="primary" onClick={applyFilters}>Apply filter</Button></footer>
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

function BasicFilterTab({ filters, onChange, onCreateGroup }: { filters: AdvancedFilter[]; onChange: (filters: AdvancedFilter[]) => void; onClear: () => void; onCreateGroup: () => void }) {
  const addFilter = (fieldId: string) => onChange([...filters, { id: `${fieldId}-${Date.now()}-${Math.random()}`, fieldId }]);
  return (
    <div className={styles.basic}>
      <section className={styles.addCard}><h3>Add filters</h3><p>Select from the filter list any filters you wish to add.</p><div className={styles.menuTriggerRow}><FilterAddMenu onAdd={addFilter} onCreateGroup={onCreateGroup} /></div></section>
      <div className={styles.selectedFilters} aria-label="Added filters">
        {filters.map((filter) => <FilterChip key={filter.id} filter={filter} onChange={(patch) => onChange(filters.map((item) => item.id === filter.id ? { ...item, ...patch } : item))} onRemove={() => onChange(filters.filter((item) => item.id !== filter.id))} />)}
      </div>
    </div>
  );
}

function Placeholder({ title, text }: { title: string; text: string }) {
  return <section className={styles.placeholder}><h3>{title}</h3><p>{text}</p></section>;
}

function buildLdapQuery(filters: AdvancedFilter[], conditions: FilterGroupCondition[]): string {
  if (filters.length === 0 && conditions.length === 0) return '(objectClass=*)';
  const filterPart = filters.map((filter) => `(${filter.fieldId}=${filter.value || '*'})`).join('');
  const groupPart = conditions.map((condition, index) => `${index > 0 ? ` ${condition.connector} ` : ''}(${condition.fieldId}=${condition.value || '*'})`).join('');
  return `(&${filterPart}${groupPart})`;
}

function FilterGroupsTab({ groups, conditions, onChange, onGroupsChange, onCreateGroup }: { groups: FilterGroup[]; conditions: FilterGroupCondition[]; onChange: (conditions: FilterGroupCondition[]) => void; onGroupsChange: (groups: FilterGroup[]) => void; onCreateGroup: (parentGroupId?: string) => string }) {
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
  const renderGroup = (groupId: string, depth = 0): React.ReactNode => {
    const groupConditions = conditions.filter((condition) => (condition.groupId ?? 'default') === groupId);
    return <div className={`${styles.groupContainer} ${depth > 0 ? styles.nestedGroup : ''}`} key={groupId}>
      <button type="button" className={styles.removeGroup} aria-label="Remove filter group" onClick={() => removeGroup(groupId)}><Icon name="X" size="14px" /></button>
      {groupConditions.map((condition, groupIndex) => <FilterChip key={condition.id} filter={condition} onChange={(patch) => update(condition.id, patch)} onRemove={() => onChange(conditions.filter((item) => item.id !== condition.id))} />)}
      <div className={styles.groupActions}><FilterAddMenu onAdd={(fieldId) => addCondition(groupId, fieldId)} /><button type="button" className={styles.groupAction} onClick={() => onCreateGroup(groupId)}><Icon name="Plus" size="16px" />Add sub-group</button></div>
      {childGroups(groupId).map((childGroupId) => renderGroup(childGroupId, depth + 1))}
    </div>;
  };
  return (
    <section className={styles.groupBuilder}>
      <div className={styles.groupHeader}><h3>Add Filter Groups</h3><p className={styles.helper}>Create logic groups for your filters</p><button type="button" className={styles.addFiltersButton} onClick={() => onCreateGroup()}><Icon name="Plus" size="16px" />Add filter group</button></div>
      {groupIds.length === 0 && <p className={styles.helper}>To create a filter group, add a group.</p>}
      {groupIds.filter((groupId) => !groups.some((group) => group.id === groupId && group.parentGroupId)).map((groupId) => renderGroup(groupId))}
    </section>
  );
}

function QueriesTab({ filters, conditions, query, manual, onChange }: { filters: AdvancedFilter[]; conditions: FilterGroupCondition[]; query: string; manual: boolean; onChange: (query: string) => void }) {
  const generated = buildLdapQuery(filters, conditions);
  const value = manual ? query : generated;
  return <section className={styles.queryTab}><h3>LDAP query</h3><p>To view or edit the LDAP query generated by your filters.</p><textarea value={value} onChange={(event) => onChange(event.target.value)} aria-label="LDAP query" spellCheck={false} /></section>;
}
