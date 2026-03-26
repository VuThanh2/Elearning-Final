// Mapping giữa Student và Section mà Student đã đăng ký học.
//
// Tại sao là Read Model chứ không phải Entity?
//   - Không có surrogate identity key
//   - Composite key: (studentId, sectionId, term, academicYear)
//   - Không có business behavior — chỉ carry data
//   - Academic Context không write → không cần Entity lifecycle
//
// Business Rules liên quan (enforce ở DB, không phải ở đây):
//   - Rule: Enrollment Must Reference a Section
//     → FK + CHECK ở Oracle
//   - Rule: Quiz Access Must Match Enrollment
//     → enforce tại StartQuizAttemptUseCase qua IAcademicQueryService,
//       không phải tại Enrollment object
export interface Enrollment {
  readonly studentId:    string;
  readonly sectionId:    string;
  readonly term:         string; // 'HK1' | 'HK2' | 'Summer'
  readonly academicYear: string; // '2024-2025'
}