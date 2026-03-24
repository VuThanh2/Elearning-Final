import oracledb from "oracledb";
import { IAcademicRepository } from "../../domain/interface-repositories/IAcademicRepository";

// Chỉ file này trong toàn bộ codebase được phép query
// vào các bảng ACADEMIC_UNITS, TEACHING_ASSIGNMENTS, ENROLLMENTS.
export class AcademicRepository implements IAcademicRepository {
  constructor(private readonly connection: oracledb.Connection) {}

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
}