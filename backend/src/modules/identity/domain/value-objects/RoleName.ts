export enum RoleName {
  STUDENT = "Student",
  TEACHER = "Teacher",
  ADMIN = "Admin",
}

// Dùng trong RoleMapper để validate string từ Oracle
// trước khi cast sang enum — tránh runtime error nếu DB có giá trị lạ.
export function isValidRoleName(value: string): value is RoleName {
  return Object.values(RoleName).includes(value as RoleName);
}