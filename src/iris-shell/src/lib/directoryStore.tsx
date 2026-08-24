import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  NODE_TREE,
  getChildren,
  getLeafObjects,
  getNode,
  getNodeIcon,
  getNodePath,
  getObject,
  updateDirectoryObjectDetails,
  isContainerNode,
  moveDirectoryObject,
  addDirectoryObject,
  type DirectoryNodeView,
  type DirectoryObject,
} from './directoryData.js';

/**
 * Directory store for the Tree view. Thin context over the static+memoized
 * `directoryData` helpers so consumers depend on a hook (mirrors `useUsers`)
 * and the data source can later swap to an API without touching pages.
 *
 * Provided **globally** in `App.tsx`: the sidebar `Tree` is shared chrome that
 * can call `useDirectory()` outside the tree routes, so a route-scoped
 * provider would throw.
 */

export interface DirectoryPathCrumb {
  id: string;
  name: string;
}

export interface DirectoryContextValue {
  nodeTree: DirectoryNodeView[];
  isContainer: (nodeId: string) => boolean;
  getPath: (nodeId: string) => DirectoryPathCrumb[];
  getChildren: (nodeId: string) => DirectoryObject[];
  getObject: (nodeId: string, objectId: string) => DirectoryObject | undefined;
  getNodeName: (nodeId: string) => string | undefined;
  getNodeIcon: (nodeId: string) => string;
  /** Leaf siblings of an object (for the detail prev/next pager). */
  getSiblings: (nodeId: string) => DirectoryObject[];
  updateObjectDetails: (objectId: string, patch: Partial<DirectoryObject['details']>) => void;
  moveObject: (object: DirectoryObject, targetNodeId: string) => void;
  addObject: (object: DirectoryObject) => void;
  selectedDirectories: Set<string>;
  setSelectedDirectories: (directories: Set<string>) => void;
}

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const [dataRevision, setDataRevision] = useState(0);
  const [selectedDirectories, setSelectedDirectories] = useState<Set<string>>(
    () => new Set(['entra-1', 'entra-2', 'ad-1', 'ad-2']),
  );
  // The underlying data is static + memoized, so the value never changes.
  const value = useMemo<DirectoryContextValue>(
    () => ({
      nodeTree: NODE_TREE,
      isContainer: isContainerNode,
      getPath: (nodeId) => getNodePath(nodeId).map((n) => ({ id: n.id, name: n.name })),
      getChildren,
      getObject,
      getNodeName: (nodeId) => getNode(nodeId)?.name,
      getNodeIcon,
      getSiblings: getLeafObjects,
      updateObjectDetails: (objectId, patch) => {
        updateDirectoryObjectDetails(objectId, patch);
        setDataRevision((revision) => revision + 1);
      },
      moveObject: moveDirectoryObject,
      addObject: (object) => {
        addDirectoryObject(object);
        setDataRevision((revision) => revision + 1);
      },
      selectedDirectories,
      setSelectedDirectories,
    }),
    [selectedDirectories, dataRevision],
  );

  return <DirectoryContext.Provider value={value}>{children}</DirectoryContext.Provider>;
}

export function useDirectory(): DirectoryContextValue {
  const ctx = useContext(DirectoryContext);
  if (!ctx) {
    throw new Error('useDirectory must be used inside <DirectoryProvider>');
  }
  return ctx;
}
