import { PermissionType } from "../value-objects/PermissionType";

// Đây là read-only data — được seed sẵn trong DB, không thay đổi
// ở runtime. Entity này không có behavior, chỉ là data holder.

export class Permission {
  readonly permissionId: number;
  readonly permissionType: PermissionType;

  constructor(permissionId: number, permissionType: PermissionType) {
    this.permissionId = permissionId;
    this.permissionType = permissionType;
  }
}