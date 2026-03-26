import oracledb from "oracledb";
import { IAcademicRepository, SectionWithContextRow } from "../../domain/interface-repositories/IAcademicRepository";
import { AcademicUnit }        from "../../domain/entities/AcademicUnit";
import { TeachingAssignment }  from "../../domain/read-models/TeachingAssignment";
import { Enrollment }          from "../../domain/read-models/Enrollment";
 
import { AcademicUnitModel }        from "../models/AcademicUnitModel";
import { TeachingAssignmentModel }  from "../models/TeachingAssignmentModel";
import { EnrollmentModel }          from "../models/EnrollmentModel";
import { SectionWithContextModel } from "../models/SectionWithContextModel";
 
import { AcademicUnitMapper }       from "../mappers/AcademicUnitMapper";
import { TeachingAssignmentMapper } from "../mappers/TeachingAssignmentMapper";
import { EnrollmentMapper }         from "../mappers/EnrollmentMapper";
import { SectionWithContextMapper } from "../mappers/SectionWithContextMapper";

// Chỉ file này trong toàn bộ codebase được phép query
// vào các bảng ACADEMIC_UNITS, TEACHING_ASSIGNMENTS, ENROLLMENTS.

// Nhận oracledb.Connection qua constructor (Dependency Injection):
//   - Connection được tạo 1 lần ở server bootstrap, truyền vào qua factory
//   - Không tạo connection mới mỗi request → tránh connection leak
//   - Dễ mock khi unit test
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

  // Dùng bởi: GetSectionsByTeacherQuery → Teacher dashboard
  async findSectionsByTeacherWithContext(
    teacherId: string,
  ): Promise<SectionWithContextRow[]> {
    try {
      const result = await this.connection.execute<SectionWithContextModel>(
        `SELECT ta.TERM,
                ta.ACADEMIC_YEAR,
                s.UNIT_ID   AS SECTION_ID,
                s.UNIT_NAME AS SECTION_NAME,
                s.UNIT_CODE AS SECTION_CODE,
                c.UNIT_ID   AS COURSE_ID,
                c.UNIT_NAME AS COURSE_NAME,
                c.UNIT_CODE AS COURSE_CODE,
                f.UNIT_ID   AS FACULTY_ID,
                f.UNIT_NAME AS FACULTY_NAME,
                f.UNIT_CODE AS FACULTY_CODE
         FROM   TEACHING_ASSIGNMENTS ta
         JOIN   ACADEMIC_UNITS s ON s.UNIT_ID = ta.SECTION_ID AND s.TYPE = 'SECTION'
         JOIN   ACADEMIC_UNITS c ON c.UNIT_ID = s.PARENT_ID   AND c.TYPE = 'COURSE'
         JOIN   ACADEMIC_UNITS f ON f.UNIT_ID = c.PARENT_ID   AND f.TYPE = 'FACULTY'
         WHERE  ta.TEACHER_ID = :teacherId
         ORDER BY ta.ACADEMIC_YEAR DESC, ta.TERM ASC`,
        { teacherId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return SectionWithContextMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AcademicRepository.findSectionsByTeacherWithContext: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
 
  // Dùng bởi: GetSectionsByStudentQuery → Student dashboard
  async findSectionsByStudentWithContext(
    studentId: string,
  ): Promise<SectionWithContextRow[]> {
    try {
      const result = await this.connection.execute<SectionWithContextModel>(
        `SELECT e.TERM,
                e.ACADEMIC_YEAR,
                s.UNIT_ID   AS SECTION_ID,
                s.UNIT_NAME AS SECTION_NAME,
                s.UNIT_CODE AS SECTION_CODE,
                c.UNIT_ID   AS COURSE_ID,
                c.UNIT_NAME AS COURSE_NAME,
                c.UNIT_CODE AS COURSE_CODE,
                f.UNIT_ID   AS FACULTY_ID,
                f.UNIT_NAME AS FACULTY_NAME,
                f.UNIT_CODE AS FACULTY_CODE
         FROM   ENROLLMENTS e
         JOIN   ACADEMIC_UNITS s ON s.UNIT_ID = e.SECTION_ID  AND s.TYPE = 'SECTION'
         JOIN   ACADEMIC_UNITS c ON c.UNIT_ID = s.PARENT_ID   AND c.TYPE = 'COURSE'
         JOIN   ACADEMIC_UNITS f ON f.UNIT_ID = c.PARENT_ID   AND f.TYPE = 'FACULTY'
         WHERE  e.STUDENT_ID = :studentId
         ORDER BY e.ACADEMIC_YEAR DESC, e.TERM ASC`,
        { studentId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return SectionWithContextMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AcademicRepository.findSectionsByStudentWithContext: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}