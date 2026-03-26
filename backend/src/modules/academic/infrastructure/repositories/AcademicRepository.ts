import oracledb from "oracledb";
import { IAcademicRepository } from "../../domain/interface-repositories/IAcademicRepository";
import { AcademicUnit }        from "../../domain/entities/AcademicUnit";
import { TeachingAssignment }  from "../../domain/read-models/TeachingAssignment";
import { Enrollment }          from "../../domain/read-models/Enrollment";
 
import { AcademicUnitModel }        from "../models/AcademicUnitModel";
import { TeachingAssignmentModel }  from "../models/TeachingAssignmentModel";
import { EnrollmentModel }          from "../models/EnrollmentModel";
 
import { AcademicUnitMapper }       from "../mappers/AcademicUnitMapper";
import { TeachingAssignmentMapper } from "../mappers/TeachingAssignmentMapper";
import { EnrollmentMapper }         from "../mappers/EnrollmentMapper";

// Chỉ file này trong toàn bộ codebase được phép query
// vào các bảng ACADEMIC_UNITS, TEACHING_ASSIGNMENTS, ENROLLMENTS.

// Nhận oracledb.Connection qua constructor (Dependency Injection):
//   - Connection được tạo 1 lần ở server bootstrap, truyền vào qua factory
//   - Không tạo connection mới mỗi request → tránh connection leak
//   - Dễ mock khi unit test
//
// Hai nhóm method:
//
//   1. Scalar (boolean) queries — Guard checks cho Use Cases ở module khác
//      Chỉ cần COUNT(*), không reconstruct object → tối ưu nhất có thể
//      - sectionExists()
//      - isTeacherAssignedToSection()
//      - isStudentEnrolledInSection()
//
//   2. Object queries — Trả về domain object khi cần data đầy đủ
//      Dùng Mapper để convert row → domain object
//      - findUnitById()
//      - findSectionsByTeacher()
//      - findSectionsByStudent()
export class AcademicRepository implements IAcademicRepository {
  constructor(private readonly connection: oracledb.Connection) {}

  // Dùng bởi: Quiz Context — CreateQuizUseCase
  // Mục đích: verify sectionId mà Teacher nhập vào thực sự tồn tại
  //           và là đơn vị cấp SECTION (không phải FACULTY hay COURSE)
  async sectionExists(sectionId: string): Promise<boolean> {
    try {
      const result = await this.connection.execute<{ CNT: number }>(
        `SELECT COUNT(*) AS CNT
         FROM ACADEMIC_UNITS
         WHERE UNIT_ID = :sectionId
           AND TYPE    = 'SECTION'`,
        { sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const count = result.rows?.[0]?.CNT ?? 0;
      return count > 0;
    } catch (err) {
      throw new Error(
        `AcademicRepository: Lỗi khi kiểm tra section. ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // Dùng bởi: Quiz Context — CreateQuizUseCase
  // Mục đích: verify Teacher chỉ tạo quiz cho section mình được phân công
  async isTeacherAssignedToSection(
    teacherId: string,
    sectionId: string
  ): Promise<boolean> {
    try {
      const result = await this.connection.execute<{ CNT: number }>(
        `SELECT COUNT(*) AS CNT
         FROM TEACHING_ASSIGNMENTS
         WHERE TEACHER_ID = :teacherId
           AND SECTION_ID = :sectionId`,
        { teacherId, sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const count = result.rows?.[0]?.CNT ?? 0;
      return count > 0;
    } catch (err) {
      throw new Error(
        `AcademicRepository: Lỗi khi kiểm tra teaching assignment. ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // Dùng bởi: Quiz Attempt Context — StartQuizAttemptUseCase
  // Mục đích: verify Student chỉ làm quiz thuộc section mình đã enroll
  async isStudentEnrolledInSection(
    studentId: string,
    sectionId: string
  ): Promise<boolean> {
    try {
      const result = await this.connection.execute<{ CNT: number }>(
        `SELECT COUNT(*) AS CNT
         FROM ENROLLMENTS
         WHERE STUDENT_ID = :studentId
           AND SECTION_ID = :sectionId`,
        { studentId, sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const count = result.rows?.[0]?.CNT ?? 0;
      return count > 0;
    } catch (err) {
      throw new Error(
        `AcademicRepository: Lỗi khi kiểm tra enrollment. ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // OBJECT QUERIES — trả về domain object đầy đủ

  // Dùng bởi: Admin views, seed validation
  // Trả về null nếu không tìm thấy — caller tự xử lý null case
  async findUnitById(unitId: string): Promise<AcademicUnit | null> {
    try {
      const result = await this.connection.execute<AcademicUnitModel>(
        `SELECT UNIT_ID, UNIT_NAME, UNIT_CODE, TYPE, PARENT_ID
         FROM   ACADEMIC_UNITS
         WHERE  UNIT_ID = :unitId`,
        { unitId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
 
      const row = result.rows?.[0];
      if (!row) return null;
 
      return AcademicUnitMapper.toDomain(row);
    } catch (err) {
      throw new Error(
        `AcademicRepository.findUnitById: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
 
  // Dùng bởi: Teacher dashboard — danh sách section tôi dạy
  //
  // JOIN với ACADEMIC_UNITS để lấy thêm section info nếu cần sau này.
  // Hiện tại chỉ cần TEACHING_ASSIGNMENTS fields vì TeachingAssignment
  // read model chỉ carry (teacherId, sectionId, term, academicYear).
  async findSectionsByTeacher(teacherId: string): Promise<TeachingAssignment[]> {
    try {
      const result = await this.connection.execute<TeachingAssignmentModel>(
        `SELECT TEACHER_ID, SECTION_ID, TERM, ACADEMIC_YEAR
         FROM   TEACHING_ASSIGNMENTS
         WHERE  TEACHER_ID = :teacherId
         ORDER BY ACADEMIC_YEAR DESC, TERM ASC`,
        { teacherId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
 
      return TeachingAssignmentMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AcademicRepository.findSectionsByTeacher: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
 
  // Dùng bởi: Student dashboard — danh sách khóa học của tôi
  async findSectionsByStudent(studentId: string): Promise<Enrollment[]> {
    try {
      const result = await this.connection.execute<EnrollmentModel>(
        `SELECT STUDENT_ID, SECTION_ID, TERM, ACADEMIC_YEAR
         FROM   ENROLLMENTS
         WHERE  STUDENT_ID = :studentId
         ORDER BY ACADEMIC_YEAR DESC, TERM ASC`,
        { studentId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
 
      return EnrollmentMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AcademicRepository.findSectionsByStudent: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}