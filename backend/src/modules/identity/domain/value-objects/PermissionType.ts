export enum PermissionType {
  // Quiz Context
  CREATE_QUIZ = "CREATE_QUIZ",
  EDIT_QUIZ = "EDIT_QUIZ",
  PUBLISH_QUIZ = "PUBLISH_QUIZ",
  HIDE_QUIZ = "HIDE_QUIZ",

  // Attempt Context
  ATTEMPT_QUIZ = "ATTEMPT_QUIZ",
  VIEW_OWN_RESULT = "VIEW_OWN_RESULT",

  // Analytics Context
  VIEW_ANALYTICS = "VIEW_ANALYTICS",
  VIEW_CLASS_RANKING = "VIEW_CLASS_RANKING",
  VIEW_AT_RISK_STUDENTS = "VIEW_AT_RISK_STUDENTS",
  VIEW_HIERARCHICAL_REPORT = "VIEW_HIERARCHICAL_REPORT",

  // Academic Context
  VIEW_SECTION = "VIEW_SECTION",
}

// Dùng trong PermissionMapper để validate string từ Oracle
// trước khi cast sang enum — tránh runtime error nếu DB có giá trị lạ.
export function isValidPermissionType(value: string): value is PermissionType {
  return Object.values(PermissionType).includes(value as PermissionType);
}