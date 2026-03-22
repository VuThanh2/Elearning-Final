export interface PermissionModel {
  PERMISSION_ID: number;
  PERMISSION_TYPE: string;
}

export interface RolePermissionModel {
  ROLE_ID: number;
  PERMISSION_ID: number;
}