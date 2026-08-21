import { useRoute } from './lib/router.js';
import { UsersProvider } from './lib/usersStore.js';
import { GroupsProvider } from './lib/groupsStore.js';
import { DirectoryProvider } from './lib/directoryStore.js';
import { FIRST_NODE_ID } from './lib/directoryData.js';
import { AppShellProvider } from './lib/appShellContext.js';
import { useToastMessage } from './lib/toastStore.js';
import { CommandPalette } from './components/CommandPalette/CommandPalette.js';
import { Toast } from './components/Toast/Toast.js';
import { UsersPage } from './views/UsersPage/UsersPage.js';
import { UserDetailPage } from './views/UserDetailPage/UserDetailPage.js';
import { TreeListPage } from './views/TreeView/TreeListPage.js';
import { TreeDetailPage } from './views/TreeView/TreeDetailPage.js';
import { FavoritesPage } from './views/FavoritesView/FavoritesPage.js';
import { WipPage } from './views/WipPage/WipPage.js';
import { InsightsPage } from './views/InsightsPage/InsightsPage.js';
import { ServicesPage } from './views/ServicesPage/ServicesPage.js';
import { IdentityManagerPage } from './views/IdentityManagerPage/IdentityManagerPage.js';
import { SafeguardPage } from './views/SafeguardPage/SafeguardPage.js';
import { GroupsPage } from './views/GroupsPage/GroupsPage.js';
import { GroupDetailPage } from './views/GroupsPage/GroupDetailPage.js';
import { AdvancedSearchProvider } from './lib/advancedSearchStore.js';

export default function App() {
  const route = useRoute();
  const toast = useToastMessage();
  return (
    <UsersProvider>
      <GroupsProvider>
        <DirectoryProvider>
        <AdvancedSearchProvider>
        <AppShellProvider>
          {route.name === 'userDetail' && <UserDetailPage userId={route.params.id} />}
          {route.name === 'usersList' && <UsersPage />}
          {(route.name === 'treeRoot' || route.name === 'treeList') && (
            <TreeListPage
              nodeId={route.name === 'treeList' ? route.params.nodeId : FIRST_NODE_ID}
            />
          )}
          {route.name === 'treeDetail' && (
            <TreeDetailPage nodeId={route.params.nodeId} objectId={route.params.objectId} />
          )}
          {route.name === 'favoritesList' && <FavoritesPage />}
          {route.name === 'groups' && <GroupsPage />}
          {route.name === 'groupDetail' && <GroupDetailPage groupId={route.params.id} />}
          {route.name === 'devices' && <WipPage title="Devices" icon="Devices" />}
          {route.name === 'agents' && <WipPage title="Agents" icon="Robot" />}
          {route.name === 'applications' && <WipPage title="Applications" icon="Browsers" />}
          {route.name === 'accessTemplates' && (
            <WipPage title="Access templates" icon="UserCircleCheck" />
          )}
          {route.name === 'managementUnits' && (
            <WipPage title="Management units" icon="FolderSimpleStar" />
          )}
          {route.name === 'insights' && <InsightsPage />}
          {route.name === 'services' && <ServicesPage />}
          {route.name === 'identityHome' && <IdentityManagerPage />}
          {route.name === 'safeguardHome' && <SafeguardPage />}
          <CommandPalette />
          <Toast message={toast.message} supportingText={toast.supportingText} action={toast.action} actionLabel={toast.actionLabel} secondaryAction={toast.secondaryAction} secondaryLabel={toast.secondaryLabel} onDismiss={toast.dismiss} />
        </AppShellProvider>
        </AdvancedSearchProvider>
        </DirectoryProvider>
      </GroupsProvider>
    </UsersProvider>
  );
}
