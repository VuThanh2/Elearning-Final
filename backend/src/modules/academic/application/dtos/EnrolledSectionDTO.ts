// DTO trả về cho Student khi query "danh sách khóa học của tôi".
//
// Kết hợp hai nguồn data:
//   1. Enrollment read model  → term, academicYear
//   2. AcademicUnit hierarchy  → sectionName, courseName, facultyName
//
// Tương đồng với TeachingSectionDTO nhưng phục vụ Student —
// tách riêng thay vì dùng chung vì:
//   - Sau này Student có thể cần thêm field riêng (ví dụ: enrollmentStatus,
//     completionPercentage của section đó) mà Teacher không cần
//   - Tách rõ ràng theo Actor → dễ evolve độc lập
//   - TeachingSectionDTO gắn với TeachingAssignment, EnrolledSectionDTO gắn
//     với Enrollment — hai read model khác nhau, không nên merge interface
import { SectionDTO } from "./SectionDTO";

export interface EnrolledSectionDTO extends SectionDTO {
  readonly term:         string; // 'HK1' | 'HK2' | 'Summer'
  readonly academicYear: string; // '2024-2025'
}