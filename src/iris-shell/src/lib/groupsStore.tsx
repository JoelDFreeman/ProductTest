import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { MOCK_GROUPS, type Group } from '../views/GroupsPage/mockGroups.js';

export type GroupPatch = Partial<Omit<Group, 'id'>>;

export interface GroupsContextValue {
  groups: Group[];
  getGroup: (id: string) => Group | null;
  updateGroup: (id: string, patch: GroupPatch) => void;
  addGroup: (group: Group) => void;
  removeGroup: (id: string) => void;
}

const GroupsContext = createContext<GroupsContextValue | null>(null);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const updateGroup = useCallback((id: string, patch: GroupPatch) => {
    setGroups((current) => current.map((group) => group.id === id ? { ...group, ...patch } : group));
  }, []);
  const addGroup = useCallback((group: Group) => setGroups((current) => [group, ...current]), []);
  const removeGroup = useCallback((id: string) => setGroups((current) => current.filter((group) => group.id !== id)), []);
  const value = useMemo<GroupsContextValue>(() => ({
    groups,
    getGroup: (id) => groups.find((group) => group.id === id) ?? null,
    updateGroup,
    addGroup,
    removeGroup,
  }), [groups, updateGroup, addGroup, removeGroup]);
  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups(): GroupsContextValue {
  const context = useContext(GroupsContext);
  if (!context) throw new Error('useGroups must be used inside <GroupsProvider>');
  return context;
}
