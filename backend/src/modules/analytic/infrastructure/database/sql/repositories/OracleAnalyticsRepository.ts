import oracledb from "oracledb";

import { IOracleAnalyticsRepository }   from  "../../../../domain/interface-repositories/IOracleAnalyticsRepository";
import { QuizPerformanceView }           from "../../../../domain/read-models/QuizPerformanceView";
import { StudentQuizResultView }         from "../../../../domain/read-models/StudentQuizResultView";
import { AtRiskStudentView }             from "../../../../domain/read-models/AtRiskStudentView";
import { StudentClassRankingView }       from "../../../../domain/read-models/StudentClassRankingView";
import { ScoreDistributionView }         from "../../../../domain/read-models/ScoreDistributionView";
import {
  HierarchicalQuizReportView,
  HierarchicalReportSummary,
  HierarchicalLevel,
}                                        from "../../../../domain/read-models/HierarchicalQuizReportView";

import { QuizPerformanceModel }          from "../models/QuizPerformanceModel";
import { StudentQuizResultModel }        from "../models/StudentQuizResultModel";
import { AtRiskStudentModel }            from "../models/AtRiskStudentModel";
import { StudentClassRankingModel }      from "../models/StudentClassRankingModel";
import { ScoreDistributionModel, ScoreDistributionBucketModel }  from "../models/ScoreDistributionModel";
import { HierarchicalQuizReportModel }   from "../models/HierarchicalQuizReportModel";

import { QuizPerformanceMapper }         from "../mappers/QuizPerformanceMapper";
import { StudentQuizResultMapper }       from "../mappers/StudentQuizResultMapper";
import { AtRiskStudentMapper }           from "../mappers/AtRiskStudentMapper";
import { StudentClassRankingMapper }     from "../mappers/StudentClassRankingMapper";
import { ScoreDistributionMapper }       from "../mappers/ScoreDistributionMapper";
import { HierarchicalQuizReportMapper }  from "../mappers/HierarchicalQuizReportMapper";

// Chỉ file này trong toàn bộ Analytics Context được phép query
// vào các bảng ANALYTICS_* trong Oracle.
//
//   - Nhận oracledb.Connection qua constructor (DI) — dùng chung, không tạo mới
//   - Mọi query dùng { outFormat: oracledb.OUT_FORMAT_OBJECT }
//   - Wrap mọi query trong try/catch, throw Error có prefix rõ ràng
//   - Gọi Mapper sau khi nhận rows — Repository không tự map
//
// Không có INSERT / UPDATE / DELETE — Analytics Repository là read-only.
//
// ScoreDistributionRepository cần query 2 bảng:
//   ANALYTICS_SCORE_DISTRIBUTION (header) + ANALYTICS_SCORE_DISTRIBUTION_BUCKET (buckets)
//   → Join trong 1 query hoặc query riêng rồi ghép — chọn query riêng để rõ ràng hơn.
export class OracleAnalyticsRepository implements IOracleAnalyticsRepository {
  constructor(private readonly connection: oracledb.Connection) {}

  // QuizPerformanceView 
  async findQuizPerformance(
    quizId:    string,
    sectionId: string,
  ): Promise<QuizPerformanceView | null> {
    try {
      const result = await this.connection.execute<QuizPerformanceModel>(
        `SELECT QUIZ_ID, SECTION_ID, QUIZ_TITLE, SECTION_NAME,
                TOTAL_ATTEMPTS, ATTEMPTED_STUDENTS, TOTAL_STUDENTS,
                AVERAGE_SCORE, HIGHEST_SCORE, LOWEST_SCORE,
                COMPLETION_RATE, LAST_UPDATED_AT
         FROM   ANALYTICS_QUIZ_PERFORMANCE
         WHERE  QUIZ_ID    = :quizId
           AND  SECTION_ID = :sectionId`,
        { quizId, sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const row = result.rows?.[0];
      if (!row) return null;

      return QuizPerformanceMapper.toDomain(row);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findQuizPerformance: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async findQuizPerformanceBySection(
    sectionId: string,
  ): Promise<QuizPerformanceView[]> {
    try {
      const result = await this.connection.execute<QuizPerformanceModel>(
        `SELECT QUIZ_ID, SECTION_ID, QUIZ_TITLE, SECTION_NAME,
                TOTAL_ATTEMPTS, ATTEMPTED_STUDENTS, TOTAL_STUDENTS,
                AVERAGE_SCORE, HIGHEST_SCORE, LOWEST_SCORE,
                COMPLETION_RATE, LAST_UPDATED_AT
         FROM   ANALYTICS_QUIZ_PERFORMANCE
         WHERE  SECTION_ID = :sectionId
         ORDER BY QUIZ_TITLE ASC`,
        { sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return QuizPerformanceMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findQuizPerformanceBySection: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // StudentQuizResultView
  async findStudentResultsBySection(
    studentId: string,
    sectionId: string,
  ): Promise<StudentQuizResultView[]> {
    try {
      const result = await this.connection.execute<StudentQuizResultModel>(
        `SELECT ATTEMPT_ID, QUIZ_ID, STUDENT_ID, SECTION_ID,
                QUIZ_TITLE, SCORE, MAX_SCORE, PERCENTAGE,
                STARTED_AT, SUBMITTED_AT, DURATION_SECONDS,
                ATTEMPT_NUMBER, STATUS
         FROM   ANALYTICS_STUDENT_QUIZ_RESULT
         WHERE  STUDENT_ID = :studentId
           AND  SECTION_ID = :sectionId
         ORDER BY SUBMITTED_AT DESC`,
        { studentId, sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return StudentQuizResultMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findStudentResultsBySection: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async findStudentResultsByQuiz(
    studentId: string,
    quizId:    string,
  ): Promise<StudentQuizResultView[]> {
    try {
      const result = await this.connection.execute<StudentQuizResultModel>(
        `SELECT ATTEMPT_ID, QUIZ_ID, STUDENT_ID, SECTION_ID,
                QUIZ_TITLE, SCORE, MAX_SCORE, PERCENTAGE,
                STARTED_AT, SUBMITTED_AT, DURATION_SECONDS,
                ATTEMPT_NUMBER, STATUS
         FROM   ANALYTICS_STUDENT_QUIZ_RESULT
         WHERE  STUDENT_ID = :studentId
           AND  QUIZ_ID    = :quizId
         ORDER BY ATTEMPT_NUMBER ASC`,
        { studentId, quizId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return StudentQuizResultMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findStudentResultsByQuiz: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // AtRiskStudentView
  async findAtRiskStudentsBySection(
    sectionId: string,
  ): Promise<AtRiskStudentView[]> {
    try {
      const result = await this.connection.execute<AtRiskStudentModel>(
        `SELECT SECTION_ID, STUDENT_ID, STUDENT_FULLNAME, SECTION_NAME,
                TOTAL_QUIZZES, ATTEMPTED_QUIZZES, QUIZ_PARTICIPATION_RATE,
                AVERAGE_SCORE, LOWEST_SCORE,
                PARTICIPATION_RISK_LEVEL, AVG_SCORE_RISK_LEVEL,
                LAST_UPDATED_AT
         FROM   ANALYTICS_AT_RISK_STUDENT
         WHERE  SECTION_ID = :sectionId
         ORDER BY AVERAGE_SCORE ASC`,
        // Sắp xếp ASC — student yếu nhất (điểm thấp nhất) lên đầu danh sách
        { sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return AtRiskStudentMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findAtRiskStudentsBySection: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // StudentClassRankingView
  async findStudentRanking(
    studentId: string,
    sectionId: string,
  ): Promise<StudentClassRankingView | null> {
    try {
      const result = await this.connection.execute<StudentClassRankingModel>(
        `SELECT SECTION_ID, STUDENT_ID, STUDENT_FULLNAME, SECTION_NAME,
                AVERAGE_SCORE, TOTAL_ATTEMPTS,
                RANK_IN_SECTION, TOTAL_RANKED_STUDENTS, PERCENTILE,
                SECTION_AVERAGE_SCORE, SECTION_HIGHEST_SCORE, SECTION_LOWEST_SCORE,
                LAST_UPDATED_AT
         FROM   ANALYTICS_STUDENT_CLASS_RANKING
         WHERE  STUDENT_ID = :studentId
           AND  SECTION_ID = :sectionId`,
        { studentId, sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const row = result.rows?.[0];
      if (!row) return null;

      return StudentClassRankingMapper.toDomain(row);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findStudentRanking: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async findClassRankingBySection(
    sectionId: string,
  ): Promise<StudentClassRankingView[]> {
    try {
      const result = await this.connection.execute<StudentClassRankingModel>(
        `SELECT SECTION_ID, STUDENT_ID, STUDENT_FULLNAME, SECTION_NAME,
                AVERAGE_SCORE, TOTAL_ATTEMPTS,
                RANK_IN_SECTION, TOTAL_RANKED_STUDENTS, PERCENTILE,
                SECTION_AVERAGE_SCORE, SECTION_HIGHEST_SCORE, SECTION_LOWEST_SCORE,
                LAST_UPDATED_AT
         FROM   ANALYTICS_STUDENT_CLASS_RANKING
         WHERE  SECTION_ID = :sectionId
         ORDER BY RANK_IN_SECTION ASC`,
        { sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return StudentClassRankingMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findClassRankingBySection: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // ScoreDistributionView
  async findScoreDistribution(
    quizId:    string,
    sectionId: string,
  ): Promise<ScoreDistributionView | null> {
    try {
      // Query 1: header
      const headerResult = await this.connection.execute<ScoreDistributionModel>(
        `SELECT QUIZ_ID, SECTION_ID, QUIZ_TITLE, SECTION_NAME,
                MAX_SCORE, TOTAL_RANKED_STUDENTS, LAST_UPDATED_AT
         FROM   ANALYTICS_SCORE_DISTRIBUTION
         WHERE  QUIZ_ID    = :quizId
           AND  SECTION_ID = :sectionId`,
        { quizId, sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const header = headerResult.rows?.[0];
      if (!header) return null;

      // Query 2: buckets — sort theo BUCKET_ORDER để Mapper nhận đúng thứ tự
      const bucketResult = await this.connection.execute<ScoreDistributionBucketModel>(
        `SELECT QUIZ_ID, SECTION_ID, BUCKET_ORDER, LABEL,
                RANGE_START_PCT, RANGE_END_PCT,
                RANGE_START, RANGE_END,
                IS_UPPER_BOUND_INCLUSIVE,
                STUDENT_COUNT, PERCENTAGE
         FROM   ANALYTICS_SCORE_DISTRIBUTION_BUCKET
         WHERE  QUIZ_ID    = :quizId
           AND  SECTION_ID = :sectionId
         ORDER BY BUCKET_ORDER ASC`,
        { quizId, sectionId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return ScoreDistributionMapper.toDomain(header, bucketResult.rows ?? []);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findScoreDistribution: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  // HierarchicalQuizReportView 
  async findHierarchicalReport(): Promise<HierarchicalQuizReportView[]> {
    try {
      const result = await this.connection.execute<HierarchicalQuizReportModel>(
        `SELECT FACULTY_ID, FACULTY_NAME, FACULTY_CODE,
                COURSE_ID,  COURSE_NAME,  COURSE_CODE,
                SECTION_ID, SECTION_NAME, SECTION_CODE,
                QUIZ_ID, QUIZ_TITLE,
                TOTAL_ATTEMPTS, ATTEMPTED_STUDENTS, TOTAL_STUDENTS,
                COMPLETION_RATE, AVERAGE_SCORE, LAST_UPDATED_AT
         FROM   ANALYTICS_HIERARCHICAL_REPORT
         ORDER BY FACULTY_ID, COURSE_ID, SECTION_ID, QUIZ_TITLE ASC`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return HierarchicalQuizReportMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findHierarchicalReport: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async findHierarchicalReportByFaculty(
    facultyId: string,
  ): Promise<HierarchicalQuizReportView[]> {
    try {
      const result = await this.connection.execute<HierarchicalQuizReportModel>(
        `SELECT FACULTY_ID, FACULTY_NAME, FACULTY_CODE,
                COURSE_ID,  COURSE_NAME,  COURSE_CODE,
                SECTION_ID, SECTION_NAME, SECTION_CODE,
                QUIZ_ID, QUIZ_TITLE,
                TOTAL_ATTEMPTS, ATTEMPTED_STUDENTS, TOTAL_STUDENTS,
                COMPLETION_RATE, AVERAGE_SCORE, LAST_UPDATED_AT
         FROM   ANALYTICS_HIERARCHICAL_REPORT
         WHERE  FACULTY_ID = :facultyId
         ORDER BY COURSE_ID, SECTION_ID, QUIZ_TITLE ASC`,
        { facultyId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return HierarchicalQuizReportMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findHierarchicalReportByFaculty: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async findHierarchicalReportByCourse(
    courseId: string,
  ): Promise<HierarchicalQuizReportView[]> {
    try {
      const result = await this.connection.execute<HierarchicalQuizReportModel>(
        `SELECT FACULTY_ID, FACULTY_NAME, FACULTY_CODE,
                COURSE_ID,  COURSE_NAME,  COURSE_CODE,
                SECTION_ID, SECTION_NAME, SECTION_CODE,
                QUIZ_ID, QUIZ_TITLE,
                TOTAL_ATTEMPTS, ATTEMPTED_STUDENTS, TOTAL_STUDENTS,
                COMPLETION_RATE, AVERAGE_SCORE, LAST_UPDATED_AT
         FROM   ANALYTICS_HIERARCHICAL_REPORT
         WHERE  COURSE_ID = :courseId
         ORDER BY SECTION_ID, QUIZ_TITLE ASC`,
        { courseId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return HierarchicalQuizReportMapper.toDomainList(result.rows ?? []);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findHierarchicalReportByCourse: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async findHierarchicalSummary(
    level:  HierarchicalLevel,
    unitId: string,
  ): Promise<HierarchicalReportSummary | null> {
    try {
      // Query flat list theo level, rồi build summary in-memory qua Mapper
      // — tránh thêm bảng materialized view lúc này.
      let rows: HierarchicalQuizReportView[];

      switch (level) {
        case "FACULTY":
          rows = await this.findHierarchicalReportByFaculty(unitId);
          break;
        case "COURSE":
          rows = await this.findHierarchicalReportByCourse(unitId);
          break;
        case "SECTION": {
          // Query theo sectionId — không có method riêng trong interface
          // nên query trực tiếp ở đây
          const result = await this.connection.execute<HierarchicalQuizReportModel>(
            `SELECT FACULTY_ID, FACULTY_NAME, FACULTY_CODE,
                    COURSE_ID,  COURSE_NAME,  COURSE_CODE,
                    SECTION_ID, SECTION_NAME, SECTION_CODE,
                    QUIZ_ID, QUIZ_TITLE,
                    TOTAL_ATTEMPTS, ATTEMPTED_STUDENTS, TOTAL_STUDENTS,
                    COMPLETION_RATE, AVERAGE_SCORE, LAST_UPDATED_AT
             FROM   ANALYTICS_HIERARCHICAL_REPORT
             WHERE  SECTION_ID = :sectionId
             ORDER BY QUIZ_TITLE ASC`,
            { sectionId: unitId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
          );
          rows = HierarchicalQuizReportMapper.toDomainList(result.rows ?? []);
          break;
        }
      }

      if (rows.length === 0) return null;

      // Lấy unitName từ row đầu tiên theo level
      const firstRow = rows[0];
      if (!firstRow) return null;

      const unitName = level === "FACULTY" ? firstRow.facultyName
                     : level === "COURSE"  ? firstRow.courseName
                     : firstRow.sectionName;

      return HierarchicalQuizReportMapper.buildSummary(level, unitId, unitName, rows);
    } catch (err) {
      throw new Error(
        `AnalyticsOracleRepository.findHierarchicalSummary: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}