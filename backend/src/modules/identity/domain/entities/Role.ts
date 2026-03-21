import { RoleName } from "../value-objects/RoleName";
import { Permission } from "./Permission";

// Cũng là read-only — seed sẵn, không thay đổi ở runtime.

export class Role {
  readonly roleId: number;
  readonly roleName: RoleName;
  readonly permissions: Permission[];

  constructor(roleId: number, roleName: RoleName, permissions: Permission[]) {
    this.roleId = roleId;
    this.roleName = roleName;
    this.permissions = permissions;
  }

  // Kiểm tra role này có chứa permission đó không.
  // Dùng nội bộ trong User.hasPermission().
  hasPermission(permissionType: string): boolean {
    return this.permissions.some((p) => p.permissionType === permissionType);
  }
}