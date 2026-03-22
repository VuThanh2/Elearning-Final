import { User } from "../../domain/entities/User";
import { Role } from "../../domain/entities/Role";
import { StudentProfile } from "../../domain/entities/StudentProfile";
import { TeacherProfile } from "../../domain/entities/TeacherProfile";
import { FullName } from "../../domain/value-objects/Fullname";
import { Password } from "../../domain/value-objects/Password";
import { RoleName } from "../../domain/value-objects/RoleName";
import { UserModel } from "../models/UserModel";

//   Mapper KHÔNG tự query DB. Repository thực hiện các query cần
//   thiết (JOIN roles, permissions, profile) rồi truyền kết quả
//   đã được map vào đây.
//
// Luồng trong Repository khi gọi findByEmail() / findById():
//   1. Query USERS → UserModel
//   2. Query ROLES + ROLE_PERMISSIONS + PERMISSIONS → Role entity
//      (dùng RoleMapper + PermissionMapper)
//   3. Query đúng bảng profile theo roleName → Profile entity
//      (dùng StudentProfileMapper / TeacherProfileMapper / AdminProfileMapper)
//   4. Gọi UserMapper.toDomain(userRow, role, profile)

export class UserMapper {

  // Oracle row + Role đã map + Profile đã map → User entity
  static toDomain(
    row: UserModel,
    role: Role,
    profile: StudentProfile | TeacherProfile
  ): User {
    return new User({
      userId: row.USER_ID,
      email: row.EMAIL,
      fullName: FullName.fromPersisted(row.FULL_NAME),
      passwordHash: Password.fromHash(row.PASSWORD_HASH),
      role,
      profile,
    });
  }

  // User entity → Oracle row shape dùng để UPDATE bảng USERS
  //
  // Map những field cần thiết cho câu UPDATE trong Repository:
  //   - USER_ID       → bind vào WHERE USER_ID = :USER_ID
  //   - PASSWORD_HASH → SET sau khi user reset password
  //
  // Không map EMAIL, FULL_NAME, ROLE_ID vì những field này
  // là readonly — không bao giờ thay đổi sau khi tạo tài khoản.
  static toPersistence(user: User): {
    USER_ID: string;
    PASSWORD_HASH: string;
  } {
    return {
      USER_ID: user.userId,
      PASSWORD_HASH: user.passwordHash,
    };
  }
}