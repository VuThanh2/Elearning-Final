import oracledb from "oracledb";
import { IUserRepository } from "../../domain/interface-repositories/IUserRepository";
import { User } from "../../domain/entities/User";
import { StudentProfile } from "../../domain/entities/StudentProfile";
import { TeacherProfile } from "../../domain/entities/TeacherProfile";
import { RoleName } from "../../domain/value-objects/RoleName";
import { UserMapper } from "../mappers/UserMapper";
import { RoleMapper } from "../mappers/RoleMapper";
import { PermissionMapper } from "../mappers/PermissionMapper";
import { StudentProfileMapper } from "../mappers/StudentProfileMapper";
import { TeacherProfileMapper } from "../mappers/TeacherProfileMapper";
import { UserModel } from "../models/UserModel";
import { RoleModel } from "../models/RoleModel";
import { PermissionModel } from "../models/PermissionModel";
import { StudentProfileModel } from "../models/StudentProfileModel";
import { TeacherProfileModel } from "../models/TeacherProfileModel";

// Nhận oracledb.Connection qua constructor (dependency injection)
// thay vì tự tạo connection bên trong — lý do:
//   - Dùng chung connection với các repository khác trong cùng request
//   - Dễ mock khi viết test
//
// Luồng reconstruct User entity (findByEmail / findById):
//   Bước 1 — Query USERS lấy user row
//   Bước 2 — Query ROLES + ROLE_PERMISSIONS + PERMISSIONS lấy role
//   Bước 3 — Query đúng bảng profile theo roleName
//   Bước 4 — Gọi mapper để ghép thành User entity

export class UserRepository implements IUserRepository {
  constructor(private readonly connection: oracledb.Connection) {}

  // Dùng trong: AuthenticationUseCase (login), ResetPasswordUseCase
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.connection.execute<UserModel>(
      `SELECT USER_ID, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE_ID
       FROM USERS
       WHERE EMAIL = :email`,
      { email },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row = result.rows?.[0];
    if (!row) return null;

    return this.buildUser(row);
  }

  // Dùng trong: requireAuthentication middleware (verify JWT)
  async findById(userId: string): Promise<User | null> {
    const result = await this.connection.execute<UserModel>(
      `SELECT USER_ID, EMAIL, PASSWORD_HASH, FULL_NAME, ROLE_ID
       FROM USERS
       WHERE USER_ID = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const row = result.rows?.[0];
    if (!row) return null;

    return this.buildUser(row);
  }

  // Dùng trong: ResetPasswordUseCase (sau changePassword)
  // Chỉ UPDATE PASSWORD_HASH - field duy nhất có thể thay đổi trong Identity Context.
  async save(user: User): Promise<void> {
    const row = UserMapper.toPersistence(user);

    await this.connection.execute(
      `UPDATE USERS
       SET PASSWORD_HASH = :PASSWORD_HASH
       WHERE USER_ID = :USER_ID`,
      row,
      { autoCommit: true }
    );
  }

  //private helper
  // Dùng chung cho findByEmail và findById để tránh lặp code.
  // Thực hiện 2 query phụ (role + profile) rồi ghép thành User entity.
  private async buildUser(userRow: UserModel): Promise<User> {
    const role = await this.loadRole(userRow.ROLE_ID);
    const profile = await this.loadProfile(userRow.USER_ID, role.roleName);
    return UserMapper.toDomain(userRow, role, profile);
  }

  //query ROLES + ROLE_PERMISSIONS + PERMISSIONS
  // JOIN 3 bảng để lấy đầy đủ permissions của role trong 1 query,
  // tránh N+1 query khi load từng permission riêng lẻ.
  private async loadRole(roleId: number) {
    // Query role row
    const roleResult = await this.connection.execute<RoleModel>(
      `SELECT ROLE_ID, ROLE_NAME
       FROM ROLES
       WHERE ROLE_ID = :roleId`,
      { roleId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const roleRow = roleResult.rows?.[0];
    if (!roleRow) {
      throw new Error(`UserRepository: ROLE_ID "${roleId}" không tồn tại trong DB.`);
    }

    // Query tất cả permissions của role này qua JOIN
    const permResult = await this.connection.execute<PermissionModel>(
      `SELECT P.PERMISSION_ID, P.PERMISSION_TYPE
       FROM PERMISSIONS P
       JOIN ROLE_PERMISSIONS RP ON P.PERMISSION_ID = RP.PERMISSION_ID
       WHERE RP.ROLE_ID = :roleId`,
      { roleId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const permissions = (permResult.rows ?? []).map(
      (row) => PermissionMapper.toDomain(row)
    );

    return RoleMapper.toDomain(roleRow, permissions);
  }

  //query đúng bảng profile theo roleName
  // Mỗi role có bảng profile riêng — dùng roleName để quyết định
  // query bảng nào thay vì query cả 2 bảng rồi lọc.
  private async loadProfile(
    userId: string,
    roleName: RoleName
  ): Promise<StudentProfile | TeacherProfile | undefined> {
    switch (roleName) {
      case RoleName.ADMIN:
        // Admin không có profile — intentional, không phải lỗi
        return undefined;
 
      case RoleName.STUDENT: {
        const result = await this.connection.execute<StudentProfileModel>(
          `SELECT USER_ID, MAJOR, AVERAGE_SCORE, COMPLETED_QUIZ_ATTEMPTS
           FROM STUDENT_PROFILES
           WHERE USER_ID = :userId`,
          { userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
 
        const row = result.rows?.[0];
        if (!row) {
          throw new Error(
            `UserRepository: StudentProfile không tồn tại cho USER_ID "${userId}".`
          );
        }
        return StudentProfileMapper.toDomain(row);
      }
 
      case RoleName.TEACHER: {
        const result = await this.connection.execute<TeacherProfileModel>(
          `SELECT USER_ID, DEPARTMENT, QUIZZES_CREATED
           FROM TEACHER_PROFILES
           WHERE USER_ID = :userId`,
          { userId },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
 
        const row = result.rows?.[0];
        if (!row) {
          throw new Error(
            `UserRepository: TeacherProfile không tồn tại cho USER_ID "${userId}".`
          );
        }
        return TeacherProfileMapper.toDomain(row);
      }
    }
  }
}