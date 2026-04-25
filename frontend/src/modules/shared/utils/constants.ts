export const USER_ROLES = {
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
} as const;

export const QUIZ_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  HIDDEN: 'HIDDEN',
  EXPIRED: 'EXPIRED',
} as const;

export const ATTEMPT_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  EXPIRED: 'EXPIRED',
} as const;

export const QUESTION_TYPE = {
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
} as const;

export const RISK_LEVEL = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export const ACADEMIC_LEVEL = {
  FACULTY: 'FACULTY',
  COURSE: 'COURSE',
  SECTION: 'SECTION',
} as const;

// Role-based route permissions
export const ROUTE_ACCESS = {
  all: [USER_ROLES.ADMIN, USER_ROLES.TEACHER, USER_ROLES.STUDENT],
  admin: [USER_ROLES.ADMIN],
  teacher: [USER_ROLES.TEACHER],
  student: [USER_ROLES.STUDENT],
  adminTeacher: [USER_ROLES.ADMIN, USER_ROLES.TEACHER],
  teacherStudent: [USER_ROLES.TEACHER, USER_ROLES.STUDENT],
} as const;
