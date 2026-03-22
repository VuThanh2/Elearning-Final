import { Permission } from "../../domain/entities/Permission";
import { PermissionType, isValidPermissionType } from "../../domain/value-objects/PermissionType";
import { PermissionModel } from "../models/PermissionModel";

// Chỉ có toDomain() vì Permission là read-only seeded data
// không bao giờ cần persist ngược lại từ entity xuống DB.

export class PermissionMapper {

  // Oracle row → Permission entity
  static toDomain(row: PermissionModel): Permission {
    if (!isValidPermissionType(row.PERMISSION_TYPE)) {
      throw new Error(
        `PermissionMapper: unknown PERMISSION_TYPE "${row.PERMISSION_TYPE}"`
      );
    }

    return new Permission(
      row.PERMISSION_ID,
      row.PERMISSION_TYPE as PermissionType
    );
  }
}