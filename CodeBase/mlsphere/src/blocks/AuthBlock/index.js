import { createPermissionsClient } from './packages/Permissions/index.js';
import { useUsers } from './packages/UserManagement/index.js';

export async function install() {
  const permissions = createPermissionsClient();
  const users = useUsers();

  if (typeof window !== 'undefined') {
    window.__authBlock = { permissions, users };
  }
}

export { useUsers } from './packages/UserManagement/index.js';
export { createPermissionsClient } from './packages/Permissions/index.js';
