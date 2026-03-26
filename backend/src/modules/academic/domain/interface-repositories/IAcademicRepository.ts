import { AcademicUnit }       from "../entities/AcademicUnit";
import { TeachingAssignment } from "../read-models/TeachingAssignment";
import { Enrollment }         from "../read-models/Enrollment";


// Return type của 2 method WithContext bên dưới.
//   - SectionWithContextRow KHÔNG phải domain concept:
//     nó là return type sinh ra từ nhu cầu JOIN 3 bảng
//     để tránh N+1, chỉ phục vụ đúng 2 method trong interface này
//     và 2 Query class tương ứng — không có business meaning độc lập
//
//   - Query class ở application layer cần import type này để map sang DTO
//   - Nếu đặt ở infrastructure → application phải import từ infrastructure
//     → vi phạm dependency rule
//
// Tại sao KHÔNG dùng TeachingAssignment hay Enrollment làm return type?
//   - Cả hai chỉ có sectionId, không có sectionName/courseName/facultyName
//   - Query nhận về rồi gọi thêm findUnitById() từng cái → N+1 problem
//   - WithContext JOIN sẵn 3 tầng trong 1 Oracle query duy nhất
export interface SectionWithContextRow {
  // Từ TEACHING_ASSIGNMENTS hoặc ENROLLMENTS
  readonly term:         string;
  readonly academicYear: string;
 
  // Từ ACADEMIC_UNITS (TYPE = 'SECTION')
  readonly sectionId:   string;
  readonly sectionName: string;
  readonly sectionCode: string;
 
  // Từ ACADEMIC_UNITS (TYPE = 'COURSE') — parent của section
  readonly courseId:   string;
  readonly courseName: string;
  readonly courseCode: string;
 
  // Từ ACADEMIC_UNITS (TYPE = 'FACULTY') — parent của course
  readonly facultyId:   string;
  readonly facultyName: string;
  readonly facultyCode: string;
}

// Chỉ Academic Context nội bộ mới được implement và dùng interface này.
// Module khác truy cập Academic Context qua AcademicQueryService, không qua đây.
export interface IAcademicRepository {
  // Dùng bởi: Quiz Context 
  // Kiểm tra unitId có tồn tại và có type = SECTION không
  sectionExists(sectionId: string): Promise<boolean>;

  // Dùng bởi: Quiz Context 
  // Kiểm tra Teacher có TeachingAssignment cho section này không
  isTeacherAssignedToSection(
    teacherId: string,
    sectionId: string
  ): Promise<boolean>;

  // Dùng bởi: Quiz Attempt Context 
  // Kiểm tra Student có Enrollment trong section này không
  isStudentEnrolledInSection(
    studentId: string,
    sectionId: string
  ): Promise<boolean>;

  // Lấy một AcademicUnit theo ID
  // Trả về null nếu không tồn tại
  findUnitById(unitId: string): Promise<AcademicUnit | null>;
 
  // Lấy tất cả Section mà một Teacher được assign
  // Dùng cho: Teacher dashboard — danh sách section của tôi
  findSectionsByTeacher(teacherId: string): Promise<TeachingAssignment[]>;
 
  // Lấy tất cả Section mà một Student đã enroll
  // Dùng cho: Student dashboard — khóa học của tôi
  findSectionsByStudent(studentId: string): Promise<Enrollment[]>;
 
  // Trả về section list kèm đầy đủ context học thuật cho Teacher dashboard.
  // Oracle JOIN 3 tầng trong 1 query — không có N+1.
  findSectionsByTeacherWithContext(
    teacherId: string,
  ): Promise<SectionWithContextRow[]>;
 
  // Trả về section list kèm đầy đủ context học thuật cho Student dashboard.
  // Oracle JOIN 3 tầng trong 1 query — không có N+1.
  findSectionsByStudentWithContext(
    studentId: string,
  ): Promise<SectionWithContextRow[]>;
}