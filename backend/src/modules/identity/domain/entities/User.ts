import { FullName } from "../value-objects/Fullname";
import { Password } from "../value-objects/Password";
import { PermissionType } from "../value-objects/PermissionType";
import { Role } from "./Role";
import { RoleName } from "../value-objects/RoleName";
import { StudentProfile } from "./StudentProfile";
import { TeacherProfile } from "./TeacherProfile";

export class User {
  readonly userId: string;
  readonly email: string;
  readonly fullName: FullName;
  readonly role: Role;
  readonly profile: StudentProfile | TeacherProfile | undefined;

  // passwordHash: luôn là chuỗi đã được bcrypt hash.
  // Dùng Password.fromHash() khi reconstruct từ DB.
  private _passwordHash: Password;
  
  constructor(params: {
    userId: string;
    email: string;
    fullName: FullName;
    role: Role;
    passwordHash: Password;
    profile: StudentProfile | TeacherProfile | undefined;
  }) {
    this.userId = params.userId;
    this.email = params.email;
    this.fullName = params.fullName;
    this.role = params.role;
    this._passwordHash = params.passwordHash;
    this.profile = params.profile;
  }

  // verifyPassword
  //
  // Trả về true/false để use case (AuthenticationUseCase) quyết định
  // có cấp token hay không.
  //
  // Không tự hash ở đây — việc compare plain text với hash do
  // IPasswordHasher.compare() thực hiện bên ngoài và truyền kết quả
  // vào. Lý do: User entity không được phép phụ thuộc vào bcrypt
  // (infrastructure concern).
  get passwordHash(): string {
    return this._passwordHash.value;
  }

  // Kiểm tra user có được phép thực hiện một action không dựa vào
  // danh sách permission của role.
  hasPermission(permissionType: PermissionType): boolean {
    return this.role.hasPermission(permissionType);
  }

  changePassword(newPasswordHash: Password): void {
    this._passwordHash = newPasswordHash;
  }

  // Helper để caller không cần biết RoleName
  isAdmin(): boolean {
    return this.role.roleName === RoleName.ADMIN;
  }
 
  isStudent(): boolean {
    return this.role.roleName === RoleName.STUDENT;
  }
 
  isTeacher(): boolean {
    return this.role.roleName === RoleName.TEACHER;
  }
}