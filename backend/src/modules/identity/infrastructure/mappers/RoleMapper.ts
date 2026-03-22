import { Role } from "../../domain/entities/Role";
import { Permission } from "../../domain/entities/Permission";
import { RoleName, isValidRoleName } from "../../domain/value-objects/RoleName";
import { RoleModel } from "../models/RoleModel";

// permissions được truyền vào từ bên ngoài (đã được map bởi
// PermissionMapper) vì Mapper không tự query DB — đó là việc của
// Repository khi JOIN bảng ROLES + ROLE_PERMISSIONS + PERMISSIONS.

export class RoleMapper {

  // Oracle row + danh sách Permission đã map → Role entity
  static toDomain(row: RoleModel, permissions: Permission[]): Role {
    if (!isValidRoleName(row.ROLE_NAME)) {
      throw new Error(
        `RoleMapper: unknown ROLE_NAME "${row.ROLE_NAME}"`
      );
    }

    return new Role(
      row.ROLE_ID,
      row.ROLE_NAME as RoleName,
      permissions
    );
  }
}