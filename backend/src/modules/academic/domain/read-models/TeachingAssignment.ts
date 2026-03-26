// Mapping giữa Teacher và Section mà Teacher được phân công dạy.
//
// Tại sao là Read Model chứ không phải Entity?
//   - Không có identity riêng (không có surrogate key)
//   - Composite key: (teacherId, sectionId, term, academicYear)
//   - Không có behavior — chỉ carry data
//   - Academic Context không write gì cả → không cần Entity lifecycle
//
// Business Rules liên quan (enforce ở DB, không phải ở đây):
//   - Rule: Teaching Assignment Must Reference a Section
//     → FK + CHECK ở Oracle
//   - Rule: Teachers Cannot Be Assigned to the Same Section
//     → PK (TEACHER_ID, SECTION_ID) ở Oracle
export interface TeachingAssignment {
  readonly teacherId:    string;
  readonly sectionId:    string;
  readonly term:         string; // 'HK1' | 'HK2' | 'Summer'
  readonly academicYear: string; // '2024-2025'
}