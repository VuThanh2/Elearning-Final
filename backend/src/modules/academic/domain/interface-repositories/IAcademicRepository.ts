import { AcademicUnit }       from "../entities/AcademicUnit";
import { TeachingAssignment } from "../read-models/TeachingAssignment";
import { Enrollment }         from "../read-models/Enrollment";

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
}