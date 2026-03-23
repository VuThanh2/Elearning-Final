import oracledb from "oracledb";

// Import thẳng từ Quiz module — coupling có chủ đích và minh bạch.
// Academic Context implement contract mà Quiz Context định nghĩa.
//
// NOTE (kiến trúc): Hiện tại dùng vì dễ trace dependency trong Modular Monolith nhỏ.
// Nếu sau này scale lên microservice hoặc team lớn hơn, cân nhắc
// chuyển sang Shared Kernel:
//   → move IAcademicIntegrationProvider vào src/shared/integration/
//   → cả Quiz và Academic đều import từ shared/, không module nào
//     phụ thuộc trực tiếp vào module kia.
import { IAcademicIntegrationProvider } from "../../../quiz/application/interfaces/IAcademicIntegrationProvider";

export class AcademicIntegrationProvider implements IAcademicIntegrationProvider {
  constructor(private readonly connection: oracledb.Connection) {}

  //kiểm tra unitId tồn tại và có type = 'SECTION'
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
      // Wrap Oracle-specific error — không để OracleDB error
      // bubble up qua HTTP response, tránh leak database internals
      throw new Error(
        `InfrastructureError: Không thể kiểm tra section từ Academic Context. ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  //kiểm tra TeachingAssignment tồn tại
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
        `InfrastructureError: Không thể kiểm tra teaching assignment từ Academic Context. ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}