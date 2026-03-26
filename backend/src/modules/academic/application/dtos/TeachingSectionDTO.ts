// DTO trả về cho Teacher khi query "danh sách section tôi đang dạy".
//
// Kết hợp hai nguồn data:
//   1. TeachingAssignment read model  → term, academicYear
//   2. AcademicUnit hierarchy          → sectionName, courseName, facultyName
//
// Tại sao merge thành 1 DTO thay vì tách riêng?
//   - Teacher luôn cần cả hai nhóm data để render dashboard card
//   - Tách ra → frontend phải join client-side → fragile và dư request
import { SectionDTO } from "./SectionDTO";

export interface TeachingSectionDTO extends SectionDTO {
  readonly term:         string; // 'HK1' | 'HK2' | 'Summer'
  readonly academicYear: string; // '2024-2025'
}