import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type AdvancedSearchTab = 'basic' | 'groups' | 'queries' | 'ask-ai';

export interface AdvancedFilter {
  id: string;
  fieldId: string;
  value?: string;
  operator?: string;
  secondValue?: string;
}

export interface FilterGroupCondition extends AdvancedFilter {
  connector: 'AND' | 'OR' | 'IF' | 'ELSE';
  groupId?: string;
  parentGroupId?: string;
}

export interface FilterGroup {
  id: string;
  parentGroupId?: string;
}

interface AdvancedSearchContextValue {
  open: boolean;
  tab: AdvancedSearchTab;
  appliedCount: number;
  draftFilters: AdvancedFilter[];
  appliedFilters: AdvancedFilter[];
  groupConditions: FilterGroupCondition[];
  filterGroups: FilterGroup[];
  ldapQuery: string;
  ldapQueryManual: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  setTab: (tab: AdvancedSearchTab) => void;
  setAppliedCount: (count: number) => void;
  setDraftFilters: (filters: AdvancedFilter[]) => void;
  applyFilters: () => void;
  clearFilters: () => void;
  setGroupConditions: (conditions: FilterGroupCondition[]) => void;
  setFilterGroups: (groups: FilterGroup[]) => void;
  createFilterGroup: (parentGroupId?: string) => string;
  setLdapQuery: (query: string) => void;
}

const AdvancedSearchContext = createContext<AdvancedSearchContextValue | null>(null);

export function AdvancedSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AdvancedSearchTab>('basic');
  const [appliedCount, setAppliedCount] = useState(0);
  const [draftFilters, setDraftFilters] = useState<AdvancedFilter[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilter[]>([]);
  const [groupConditions, setGroupConditions] = useState<FilterGroupCondition[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [ldapQuery, setLdapQuery] = useState('');
  const [ldapQueryManual, setLdapQueryManual] = useState(false);
  const updateLdapQuery = (query: string) => {
    setLdapQuery(query);
    setLdapQueryManual(true);
  };
  const value = useMemo(() => ({
    open,
    tab,
    appliedCount,
    openSearch: () => setOpen(true),
    closeSearch: () => setOpen(false),
    setTab,
    setAppliedCount,
    draftFilters,
    appliedFilters,
    groupConditions,
    filterGroups,
    ldapQuery,
    ldapQueryManual,
    setDraftFilters,
    applyFilters: () => {
      setAppliedFilters(draftFilters);
      setAppliedCount(
        draftFilters.filter((filter) => filter.value).length +
        groupConditions.filter((condition) => condition.value).length,
      );
    },
    clearFilters: () => {
      setDraftFilters([]);
      setAppliedFilters([]);
      setGroupConditions([]);
      setFilterGroups([]);
      setLdapQuery('');
      setLdapQueryManual(false);
      setAppliedCount(0);
    },
    setGroupConditions,
    setFilterGroups,
    createFilterGroup: (parentGroupId) => {
      const id = `group-${Date.now()}-${Math.random()}`;
      setFilterGroups((groups) => [...groups, { id, parentGroupId }]);
      setTab('groups');
      return id;
    },
    setLdapQuery: updateLdapQuery,
  }), [open, tab, appliedCount, draftFilters, appliedFilters, groupConditions, filterGroups, ldapQuery, ldapQueryManual]);
  return <AdvancedSearchContext.Provider value={value}>{children}</AdvancedSearchContext.Provider>;
}

export function useAdvancedSearch(): AdvancedSearchContextValue {
  const context = useContext(AdvancedSearchContext);
  if (!context) throw new Error('useAdvancedSearch must be used inside <AdvancedSearchProvider>');
  return context;
}
