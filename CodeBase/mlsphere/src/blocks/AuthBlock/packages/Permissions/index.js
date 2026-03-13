const rolePermissions = {
  admin: ['users:read', 'users:write', 'roles:write'],
  editor: ['users:read'],
};

export function createPermissionsClient() {
  return {
    can: (role, permission) => rolePermissions[role]?.includes(permission) ?? false,
  };
}
