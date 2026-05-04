import oracledb from "oracledb";

import { QuizAttemptSubmitted, QuizAttemptExpired } from "../../../quiz-attempt";

import { StudentQuizAnswerModel } from "../database/nosql/models/StudentQuizAnswerModel";
import { QuestionFailureRateModel, IQuestionFailureRateDocument, IQuestionFailureStatDocument } from "../database/nosql/models/QuestionFailureRateModel";

import { IAnalyticCache, AnalyticCacheKey } from "../../domain/interface-repositories/IAnalyticCache";
// Xử lý QuizAttemptSubmitted / QuizAttemptExpired
//
// Nhận event đã được enrich từ Use Case → ghi trực tiếp vào Oracle + MongoDB.
//
// Event chỉ chứa sectionId, studentId — không chứa hierarchy labels.
// Projector resolve bằng JOIN trực tiếp vào ACADEMIC_UNITS và USERS
// trong cùng Oracle instance, ngay trong câu MERGE INTO SQL.
type AttemptFinalizedEvent = QuizAttemptSubmitted | QuizAttemptExpired;

export class QuizAttemptSubmittedProjector {
  constructor(
    private readonly oracleConnection:         oracledb.Connection,
    private readonly studentQuizAnswerModel:   typeof StudentQuizAnswerModel,
    private readonly questionFailureRateModel: typeof QuestionFailureRateModel,
    private readonly cache:                    IAnalyticCache,
  ) {}

  async handle(event: AttemptFinalizedEvent, status: "SUBMITTED" | "EXPIRED"): Promise<void> {
    await this.writeToOracle(event, status);
    await Promise.all([
      this.writeStudentQuizAnswer(event, status),
      this.writeQuestionFailureRate(event),
    ]);

    await this.invalidateCacheAfterWrite(event);
  }

  // Cache Invalidation
  private async invalidateCacheAfterWrite(event: AttemptFinalizedEvent): Promise<void> {
    try {
      // Exact key invalidation — 1 DEL command với nhiều key
      await this.cache.invalidate([
        AnalyticCacheKey.quizPerformance(event.quizId, event.sectionId),
        AnalyticCacheKey.sectionPerformance(event.sectionId),
        AnalyticCacheKey.studentResultsBySection(event.studentId, event.sectionId),
        AnalyticCacheKey.studentResultsByQuiz(event.studentId, event.quizId),
        AnalyticCacheKey.answerHistoryByQuiz(event.studentId, event.quizId),
        AnalyticCacheKey.questionFailureRate(event.quizId, event.sectionId),
        AnalyticCacheKey.atRiskStudents(event.sectionId),
        AnalyticCacheKey.studentRanking(event.studentId, event.sectionId),
        AnalyticCacheKey.sectionRanking(event.sectionId),
        AnalyticCacheKey.scoreDistribution(event.quizId, event.sectionId),
      ]);
 
      // Pattern invalidation cho HierarchicalReport (nhiều permutation)
      await this.cache.invalidatePattern(AnalyticCacheKey.HIER_PATTERN);
    } catch (err) {
      // Log nhưng KHÔNG throw — cache invalidation failure không
      // được rollback DB write đã thành công.
      console.warn(
        `[Analytics] Cache invalidation failed for attemptId="${event.attemptId}":`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Oracle writes (1 transaction)
  private async writeToOracle(event: AttemptFinalizedEvent, status: "SUBMITTED" | "EXPIRED"): Promise<void> {
    const flowId = `oracle-flow-${event.attemptId}-${Date.now()}`;
    console.log('[Analytics] writeToOracle:start', { flowId, attemptId: event.attemptId, quizId: event.quizId, sectionId: event.sectionId, status });
    try {
      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertStudentQuizResult:start' });
      await this.upsertStudentQuizResult(event, status);
      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertStudentQuizResult:end' });

      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertQuizPerformance:start' });
      await this.upsertQuizPerformance(event);
      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertQuizPerformance:end' });

      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertAtRiskStudent:start' });
      await this.upsertAtRiskStudent(event);
      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertAtRiskStudent:end' });

      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertScoreDistribution:start' });
      await this.upsertScoreDistribution(event);
      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertScoreDistribution:end' });

      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertHierarchicalReport:start' });
      await this.upsertHierarchicalReport(event);
      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertHierarchicalReport:end' });

      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertClassRankingForSection:start' });
      await this.upsertClassRankingForSection(event);
      console.log('[Analytics] writeToOracle:step', { flowId, step: 'upsertClassRankingForSection:end' });

      console.log('[Analytics] writeToOracle:step', { flowId, step: 'commit:start' });
      await this.oracleConnection.commit();
      console.log('[Analytics] writeToOracle:step', { flowId, step: 'commit:end' });
    } catch (err) {
      console.error('[Analytics] writeToOracle:error', {
        flowId,
        attemptId: event.attemptId,
        quizId: event.quizId,
        sectionId: event.sectionId,
        status,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
      });
      try {
        console.log('[Analytics] writeToOracle:rollback:start', { flowId });
        await this.oracleConnection.rollback();
        console.log('[Analytics] writeToOracle:rollback:end', { flowId });
      } catch (rollbackErr) {
        console.error('[Analytics] writeToOracle:rollback:error', {
          flowId,
          errorMessage: rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
        });
      }
    }
  }

  private async upsertQuizPerformance(e: AttemptFinalizedEvent): Promise<void> {
    // sectionName: JOIN ACADEMIC_UNITS tại đây
    // totalStudents: COUNT(ENROLLMENTS) tại đây
    // Cả hai resolve trong 1 Oracle query — không round-trip thêm
    await this.oracleConnection.execute(
      `MERGE INTO ANALYTICS_QUIZ_PERFORMANCE tgt
       USING (
         WITH finalized AS (
           SELECT *
           FROM ANALYTICS_STUDENT_QUIZ_RESULT
           WHERE QUIZ_ID = :quizId
             AND SECTION_ID = :sectionId
             AND STATUS IN ('SUBMITTED', 'EXPIRED')
         ), attempt_stats AS (
           SELECT
             :quizId AS QUIZ_ID,
             :sectionId AS SECTION_ID,
             (SELECT COUNT(*) FROM finalized) AS TOTAL_ATTEMPTS,
             (SELECT COUNT(DISTINCT STUDENT_ID) FROM finalized) AS ATTEMPTED_STUDENTS,
             ROUND((SELECT AVG(SCORE) FROM finalized), 2) AS AVERAGE_SCORE,
             (SELECT MAX(SCORE) FROM finalized) AS HIGHEST_SCORE,
             (SELECT MIN(SCORE) FROM finalized) AS LOWEST_SCORE
           FROM DUAL
         )
         SELECT
           :quizId                                            AS QUIZ_ID,
           :sectionId                                          AS SECTION_ID,
           :quizTitle                                          AS QUIZ_TITLE,
           au.UNIT_NAME                                        AS SECTION_NAME,
           NVL(enr.TOTAL_STUDENTS, 0)                          AS TOTAL_STUDENTS,
           :maxScore                                           AS MAX_SCORE,
           NVL(ast.TOTAL_ATTEMPTS, 0)                          AS TOTAL_ATTEMPTS,
           NVL(ast.ATTEMPTED_STUDENTS, 0)                      AS ATTEMPTED_STUDENTS,
           NVL(ast.AVERAGE_SCORE, 0)                           AS AVERAGE_SCORE,
           NVL(ast.HIGHEST_SCORE, 0)                           AS HIGHEST_SCORE,
           NVL(ast.LOWEST_SCORE, 0)                            AS LOWEST_SCORE,
           ROUND(NVL(ast.ATTEMPTED_STUDENTS, 0)
             / NULLIF(NVL(enr.TOTAL_STUDENTS, 0), 0), 4)       AS COMPLETION_RATE,
           SYSTIMESTAMP                                        AS LAST_UPDATED_AT
         FROM ACADEMIC_UNITS au
         LEFT JOIN attempt_stats ast
           ON ast.QUIZ_ID = :quizId AND ast.SECTION_ID = :sectionId
         LEFT JOIN (
           SELECT SECTION_ID, COUNT(*) AS TOTAL_STUDENTS
           FROM   ENROLLMENTS
           WHERE  SECTION_ID = :sectionId
           GROUP  BY SECTION_ID
         ) enr ON enr.SECTION_ID = :sectionId
         WHERE au.UNIT_ID = :sectionId AND au.TYPE = 'SECTION'
       ) src ON (tgt.QUIZ_ID = src.QUIZ_ID AND tgt.SECTION_ID = src.SECTION_ID)
       WHEN MATCHED THEN UPDATE SET
         tgt.QUIZ_TITLE         = src.QUIZ_TITLE,
         tgt.SECTION_NAME       = src.SECTION_NAME,
         tgt.TOTAL_STUDENTS     = src.TOTAL_STUDENTS,
         tgt.MAX_SCORE          = src.MAX_SCORE,
         tgt.TOTAL_ATTEMPTS     = src.TOTAL_ATTEMPTS,
         tgt.ATTEMPTED_STUDENTS = src.ATTEMPTED_STUDENTS,
         tgt.AVERAGE_SCORE      = src.AVERAGE_SCORE,
         tgt.HIGHEST_SCORE      = src.HIGHEST_SCORE,
         tgt.LOWEST_SCORE       = src.LOWEST_SCORE,
         tgt.COMPLETION_RATE    = src.COMPLETION_RATE,
         tgt.LAST_UPDATED_AT    = src.LAST_UPDATED_AT
       WHEN NOT MATCHED THEN INSERT (
         QUIZ_ID, SECTION_ID, QUIZ_TITLE, SECTION_NAME,
         TOTAL_STUDENTS, MAX_SCORE, TOTAL_ATTEMPTS, ATTEMPTED_STUDENTS,
         AVERAGE_SCORE, HIGHEST_SCORE, LOWEST_SCORE,
         COMPLETION_RATE, LAST_UPDATED_AT
       ) VALUES (
         src.QUIZ_ID, src.SECTION_ID, src.QUIZ_TITLE, src.SECTION_NAME,
         src.TOTAL_STUDENTS, src.MAX_SCORE, src.TOTAL_ATTEMPTS, src.ATTEMPTED_STUDENTS,
         src.AVERAGE_SCORE, src.HIGHEST_SCORE, src.LOWEST_SCORE,
         src.COMPLETION_RATE, src.LAST_UPDATED_AT
       )`,
      { quizId: e.quizId, sectionId: e.sectionId, quizTitle: e.quizTitle, maxScore: e.maxScore },
    );
  }

  private async upsertStudentQuizResult(e: AttemptFinalizedEvent, status: "SUBMITTED" | "EXPIRED"): Promise<void> {
    const durationSeconds = Math.floor(
      (e.occurredAt.getTime() - e.startedAt.getTime()) / 1000
    );
    const percentage = e.maxScore > 0
      ? Math.round((e.score / e.maxScore) * 10000) / 10000
      : 0;

    await this.oracleConnection.execute(
      `MERGE INTO ANALYTICS_STUDENT_QUIZ_RESULT tgt
       USING DUAL ON (tgt.ATTEMPT_ID = :attemptId)
       WHEN MATCHED THEN UPDATE SET
         tgt.SCORE            = :score,
         tgt.PERCENTAGE       = :percentage,
         tgt.SUBMITTED_AT     = :submittedAt,
         tgt.DURATION_SECONDS = :durationSeconds,
         tgt.STATUS           = :status
       WHEN NOT MATCHED THEN INSERT (
         ATTEMPT_ID, QUIZ_ID, STUDENT_ID, SECTION_ID,
         QUIZ_TITLE, SCORE, MAX_SCORE, PERCENTAGE,
         STARTED_AT, SUBMITTED_AT, DURATION_SECONDS,
         ATTEMPT_NUMBER, STATUS
       ) VALUES (
         :attemptId, :quizId, :studentId, :sectionId,
         :quizTitle, :score, :maxScore, :percentage,
         :startedAt, :submittedAt, :durationSeconds,
         :attemptNumber, :status
       )`,
      {
        attemptId:       e.attemptId,
        quizId:          e.quizId,
        studentId:       e.studentId,
        sectionId:       e.sectionId,
        quizTitle:       e.quizTitle,
        score:           e.score,
        maxScore:        e.maxScore,
        percentage,
        startedAt:       e.startedAt,
        submittedAt:     e.occurredAt,
        durationSeconds,
        attemptNumber:   e.attemptNumber,
        status,
      },
    );
  }

  private async upsertAtRiskStudent(e: AttemptFinalizedEvent): Promise<void> {
    // studentFullname: JOIN USERS
    // sectionName: JOIN ACADEMIC_UNITS
    // totalQuizzes + participationRate: tính từ ANALYTICS_STUDENT_QUIZ_RESULT
    await this.oracleConnection.execute(
      `MERGE INTO ANALYTICS_AT_RISK_STUDENT tgt
       USING (
         SELECT
           :sectionId                                        AS SECTION_ID,
           :studentId                                        AS STUDENT_ID,
           u.FULL_NAME                                       AS STUDENT_FULLNAME,
           au.UNIT_NAME                                      AS SECTION_NAME,
           NVL(quiz_count.TOTAL_QUIZZES, 0)                  AS TOTAL_QUIZZES,
           NVL(best_stats.ATTEMPTED_QUIZZES, 0)              AS ATTEMPTED_QUIZZES,
           NVL(best_stats.AVERAGE_SCORE, 0)                  AS AVERAGE_SCORE,
           NVL(best_stats.LOWEST_SCORE, 0)                   AS LOWEST_SCORE,
           ROUND(
             NVL(best_stats.ATTEMPTED_QUIZZES, 0)
             / NULLIF(NVL(quiz_count.TOTAL_QUIZZES, 0), 0),
             4
           ) AS QUIZ_PARTICIPATION_RATE,
           CASE
             WHEN NVL(best_stats.AVERAGE_SCORE_RATE, 0) < 0.50 THEN 'HIGH'
             WHEN NVL(best_stats.AVERAGE_SCORE_RATE, 0) < 0.70 THEN 'MEDIUM'
             ELSE 'LOW'
           END AS AVG_SCORE_RISK_LEVEL,
           SYSTIMESTAMP                                      AS LAST_UPDATED_AT
         FROM USERS u
         JOIN ACADEMIC_UNITS au ON au.UNIT_ID = :sectionId AND au.TYPE = 'SECTION'
         CROSS JOIN (
           SELECT
             COUNT(DISTINCT QUIZ_ID) AS ATTEMPTED_QUIZZES,
             ROUND(AVG(BEST_SCORE), 2) AS AVERAGE_SCORE,
             MIN(BEST_SCORE) AS LOWEST_SCORE,
             ROUND(AVG(BEST_PERCENTAGE), 4) AS AVERAGE_SCORE_RATE
           FROM (
             SELECT QUIZ_ID, MAX(SCORE) AS BEST_SCORE, MAX(PERCENTAGE) AS BEST_PERCENTAGE
             FROM   ANALYTICS_STUDENT_QUIZ_RESULT
             WHERE  STUDENT_ID = :studentId
               AND  SECTION_ID = :sectionId
             GROUP BY QUIZ_ID
           ) best
         ) best_stats
         LEFT JOIN (
           SELECT COUNT(DISTINCT QUIZ_ID) AS TOTAL_QUIZZES
           FROM   ANALYTICS_STUDENT_QUIZ_RESULT
           WHERE  SECTION_ID = :sectionId
         ) quiz_count ON 1 = 1
         WHERE u.USER_ID = :studentId
       ) src ON (tgt.SECTION_ID = src.SECTION_ID AND tgt.STUDENT_ID = src.STUDENT_ID)
       WHEN MATCHED THEN UPDATE SET
         tgt.STUDENT_FULLNAME       = src.STUDENT_FULLNAME,
         tgt.SECTION_NAME           = src.SECTION_NAME,
         tgt.TOTAL_QUIZZES          = src.TOTAL_QUIZZES,
         tgt.ATTEMPTED_QUIZZES      = src.ATTEMPTED_QUIZZES,
         tgt.AVERAGE_SCORE          = src.AVERAGE_SCORE,
         tgt.LOWEST_SCORE           = src.LOWEST_SCORE,
         tgt.QUIZ_PARTICIPATION_RATE= src.QUIZ_PARTICIPATION_RATE,
         tgt.PARTICIPATION_RISK_LEVEL = CASE
           WHEN src.QUIZ_PARTICIPATION_RATE < 0.50 THEN 'HIGH'
           WHEN src.QUIZ_PARTICIPATION_RATE < 0.80 THEN 'MEDIUM'
           ELSE 'LOW' END,
         tgt.AVG_SCORE_RISK_LEVEL = src.AVG_SCORE_RISK_LEVEL,
         tgt.LAST_UPDATED_AT        = src.LAST_UPDATED_AT
       WHEN NOT MATCHED THEN INSERT (
         SECTION_ID, STUDENT_ID, STUDENT_FULLNAME, SECTION_NAME,
         TOTAL_QUIZZES, ATTEMPTED_QUIZZES, AVERAGE_SCORE, LOWEST_SCORE,
         QUIZ_PARTICIPATION_RATE, PARTICIPATION_RISK_LEVEL, AVG_SCORE_RISK_LEVEL,
         LAST_UPDATED_AT
       ) VALUES (
         src.SECTION_ID, src.STUDENT_ID, src.STUDENT_FULLNAME, src.SECTION_NAME,
         src.TOTAL_QUIZZES, src.ATTEMPTED_QUIZZES, src.AVERAGE_SCORE, src.LOWEST_SCORE,
         src.QUIZ_PARTICIPATION_RATE,
         CASE
           WHEN src.QUIZ_PARTICIPATION_RATE < 0.50 THEN 'HIGH'
           WHEN src.QUIZ_PARTICIPATION_RATE < 0.80 THEN 'MEDIUM'
           ELSE 'LOW'
         END,
         src.AVG_SCORE_RISK_LEVEL,
         src.LAST_UPDATED_AT
       )`,
      { sectionId: e.sectionId, studentId: e.studentId },
    );
  }

  private async upsertScoreDistribution(e: AttemptFinalizedEvent): Promise<void> {
    const maxScore = e.maxScore;

    // Header upsert — sectionName từ JOIN
    await this.oracleConnection.execute(
      `MERGE INTO ANALYTICS_SCORE_DISTRIBUTION tgt
       USING (
         SELECT
           :quizId      AS QUIZ_ID,
           :sectionId   AS SECTION_ID,
           :quizTitle   AS QUIZ_TITLE,
           au.UNIT_NAME AS SECTION_NAME,
           :maxScore    AS MAX_SCORE,
           (SELECT COUNT(DISTINCT STUDENT_ID) FROM ANALYTICS_STUDENT_QUIZ_RESULT
            WHERE QUIZ_ID = :quizId AND SECTION_ID = :sectionId) AS TOTAL_RANKED_STUDENTS,
           SYSTIMESTAMP AS LAST_UPDATED_AT
         FROM ACADEMIC_UNITS au
         WHERE au.UNIT_ID = :sectionId AND au.TYPE = 'SECTION'
       ) src ON (tgt.QUIZ_ID = src.QUIZ_ID AND tgt.SECTION_ID = src.SECTION_ID)
       WHEN MATCHED THEN UPDATE SET
         tgt.TOTAL_RANKED_STUDENTS = src.TOTAL_RANKED_STUDENTS,
         tgt.SECTION_NAME          = src.SECTION_NAME,
         tgt.LAST_UPDATED_AT       = src.LAST_UPDATED_AT
       WHEN NOT MATCHED THEN INSERT (
         QUIZ_ID, SECTION_ID, QUIZ_TITLE, SECTION_NAME,
         MAX_SCORE, TOTAL_RANKED_STUDENTS, LAST_UPDATED_AT
       ) VALUES (
         src.QUIZ_ID, src.SECTION_ID, src.QUIZ_TITLE, src.SECTION_NAME,
         src.MAX_SCORE, src.TOTAL_RANKED_STUDENTS, src.LAST_UPDATED_AT
       )`,
      { quizId: e.quizId, sectionId: e.sectionId, quizTitle: e.quizTitle, maxScore },
    );

    // Bucket upserts
    const buckets = [
      { order: 1, label: 'Dưới trung bình', startPct: 0.00, endPct: 0.50, inclusive: 0 },
      { order: 2, label: 'Trung bình',      startPct: 0.50, endPct: 0.70, inclusive: 0 },
      { order: 3, label: 'Khá',             startPct: 0.70, endPct: 0.85, inclusive: 0 },
      { order: 4, label: 'Giỏi',            startPct: 0.85, endPct: 1.00, inclusive: 1 },
    ];
    for (const b of buckets) {
      const rangeStart = Math.round(b.startPct * maxScore * 100) / 100;
      const rangeEnd   = Math.round(b.endPct   * maxScore * 100) / 100;
      await this.oracleConnection.execute(
        `MERGE INTO ANALYTICS_SCORE_DISTRIBUTION_BUCKET tgt
         USING DUAL ON (
           tgt.QUIZ_ID = :quizId AND tgt.SECTION_ID = :sectionId
           AND tgt.BUCKET_ORDER = :bucketOrder
         )
         WHEN MATCHED THEN UPDATE SET
           tgt.STUDENT_COUNT = (
             SELECT COUNT(DISTINCT STUDENT_ID) FROM (
               SELECT STUDENT_ID, MAX(SCORE) AS BEST_SCORE
               FROM   ANALYTICS_STUDENT_QUIZ_RESULT
               WHERE  QUIZ_ID = :quizId AND SECTION_ID = :sectionId
               GROUP  BY STUDENT_ID
             ) WHERE BEST_SCORE >= :rangeStart
               AND BEST_SCORE ${b.inclusive ? '<=' : '<'} :rangeEnd
           ),
           tgt.PERCENTAGE = (
             SELECT COUNT(DISTINCT STUDENT_ID) FROM (
               SELECT STUDENT_ID, MAX(SCORE) AS BEST_SCORE
               FROM   ANALYTICS_STUDENT_QUIZ_RESULT
               WHERE  QUIZ_ID = :quizId AND SECTION_ID = :sectionId
               GROUP  BY STUDENT_ID
             ) WHERE BEST_SCORE >= :rangeStart
               AND BEST_SCORE ${b.inclusive ? '<=' : '<'} :rangeEnd
           ) / NULLIF(
             (SELECT TOTAL_RANKED_STUDENTS FROM ANALYTICS_SCORE_DISTRIBUTION
              WHERE QUIZ_ID = :quizId AND SECTION_ID = :sectionId), 0
           )
         WHEN NOT MATCHED THEN INSERT (
           QUIZ_ID, SECTION_ID, BUCKET_ORDER, LABEL,
           RANGE_START_PCT, RANGE_END_PCT, RANGE_START, RANGE_END,
           IS_UPPER_BOUND_INCLUSIVE, STUDENT_COUNT, PERCENTAGE
         ) VALUES (
           :quizId, :sectionId, :bucketOrder, :label,
           :startPct, :endPct, :rangeStart, :rangeEnd,
           :inclusive, 0, 0
         )`,
        {
          quizId: e.quizId, sectionId: e.sectionId,
          bucketOrder: b.order, label: b.label,
          startPct: b.startPct, endPct: b.endPct,
          rangeStart, rangeEnd, inclusive: b.inclusive,
        },
      );
    }
  }

  private async upsertHierarchicalReport(e: AttemptFinalizedEvent): Promise<void> {
    // JOIN ACADEMIC_UNITS 3 tầng + COUNT(ENROLLMENTS) — tất cả trong 1 MERGE INTO
    const queryId = `hier-upsert-${e.attemptId}-${Date.now()}`;
    console.log('[QuizAttemptSubmittedProjector.upsertHierarchicalReport] ENTRY', {
      queryId,
      attemptId: e.attemptId,
      quizId: e.quizId,
      sectionId: e.sectionId,
      quizTitle: e.quizTitle,
    });
    const sql = `MERGE INTO ANALYTICS_HIERARCHICAL_REPORT tgt
       USING (
         WITH quiz_stats AS (
           SELECT
             QUIZ_ID,
             SECTION_ID,
             COUNT(*) AS TOTAL_ATTEMPTS,
             COUNT(DISTINCT STUDENT_ID) AS ATTEMPTED_STUDENTS,
             ROUND(AVG(SCORE), 2) AS AVERAGE_SCORE,
             MAX(SUBMITTED_AT) AS LAST_UPDATED_AT
           FROM ANALYTICS_STUDENT_QUIZ_RESULT
           WHERE QUIZ_ID = :quizId AND SECTION_ID = :sectionId
           GROUP BY QUIZ_ID, SECTION_ID
         ), best AS (
           SELECT STUDENT_ID, MAX(SCORE) AS BEST_SCORE
           FROM ANALYTICS_STUDENT_QUIZ_RESULT
           WHERE QUIZ_ID = :quizId AND SECTION_ID = :sectionId
           GROUP BY STUDENT_ID
         )
         SELECT
           f.UNIT_ID   AS FACULTY_ID,   f.UNIT_NAME AS FACULTY_NAME, f.UNIT_CODE AS FACULTY_CODE,
           c.UNIT_ID   AS COURSE_ID,    c.UNIT_NAME AS COURSE_NAME,  c.UNIT_CODE AS COURSE_CODE,
           s.UNIT_ID   AS SECTION_ID,   s.UNIT_NAME AS SECTION_NAME, s.UNIT_CODE AS SECTION_CODE,
           :quizId     AS QUIZ_ID,
           :quizTitle  AS QUIZ_TITLE,
           NVL(enr.TOTAL_STUDENTS, 0)                                AS TOTAL_STUDENTS,
           qs.TOTAL_ATTEMPTS                                          AS TOTAL_ATTEMPTS,
           qs.ATTEMPTED_STUDENTS                                      AS ATTEMPTED_STUDENTS,
           ROUND(qs.ATTEMPTED_STUDENTS / NULLIF(NVL(enr.TOTAL_STUDENTS, 0), 0), 4) AS COMPLETION_RATE,
           qs.AVERAGE_SCORE                                           AS AVERAGE_SCORE,
           qs.LAST_UPDATED_AT                                         AS LAST_UPDATED_AT
         FROM ACADEMIC_UNITS s
         JOIN ACADEMIC_UNITS c ON c.UNIT_ID = s.PARENT_ID AND c.TYPE = 'COURSE'
         JOIN ACADEMIC_UNITS f ON f.UNIT_ID = c.PARENT_ID AND f.TYPE = 'FACULTY'
         JOIN quiz_stats qs ON qs.QUIZ_ID = :quizId AND qs.SECTION_ID = :sectionId
         LEFT JOIN (
           SELECT SECTION_ID, COUNT(*) AS TOTAL_STUDENTS
           FROM ENROLLMENTS WHERE SECTION_ID = :sectionId GROUP BY SECTION_ID
         ) enr ON enr.SECTION_ID = s.UNIT_ID
         WHERE s.UNIT_ID = :sectionId AND s.TYPE = 'SECTION'
       ) src ON (tgt.QUIZ_ID = src.QUIZ_ID AND tgt.SECTION_ID = src.SECTION_ID)
       WHEN MATCHED THEN UPDATE SET
         tgt.FACULTY_ID      = src.FACULTY_ID,   tgt.FACULTY_NAME = src.FACULTY_NAME,
         tgt.FACULTY_CODE    = src.FACULTY_CODE,
         tgt.COURSE_ID       = src.COURSE_ID,    tgt.COURSE_NAME  = src.COURSE_NAME,
         tgt.COURSE_CODE     = src.COURSE_CODE,
         tgt.SECTION_NAME    = src.SECTION_NAME, tgt.SECTION_CODE = src.SECTION_CODE,
         tgt.QUIZ_TITLE      = src.QUIZ_TITLE,
         tgt.TOTAL_STUDENTS  = src.TOTAL_STUDENTS,
         tgt.TOTAL_ATTEMPTS  = src.TOTAL_ATTEMPTS,
         tgt.ATTEMPTED_STUDENTS = src.ATTEMPTED_STUDENTS,
         tgt.COMPLETION_RATE = src.COMPLETION_RATE,
         tgt.AVERAGE_SCORE   = src.AVERAGE_SCORE,
         tgt.LAST_UPDATED_AT = src.LAST_UPDATED_AT
       WHEN NOT MATCHED THEN INSERT (
         FACULTY_ID, FACULTY_NAME, FACULTY_CODE,
         COURSE_ID, COURSE_NAME, COURSE_CODE,
         SECTION_ID, SECTION_NAME, SECTION_CODE,
         QUIZ_ID, QUIZ_TITLE, TOTAL_ATTEMPTS, ATTEMPTED_STUDENTS,
         TOTAL_STUDENTS, COMPLETION_RATE, AVERAGE_SCORE, LAST_UPDATED_AT
       ) VALUES (
         src.FACULTY_ID, src.FACULTY_NAME, src.FACULTY_CODE,
         src.COURSE_ID, src.COURSE_NAME, src.COURSE_CODE,
         src.SECTION_ID, src.SECTION_NAME, src.SECTION_CODE,
         src.QUIZ_ID, src.QUIZ_TITLE, src.TOTAL_ATTEMPTS, src.ATTEMPTED_STUDENTS,
         src.TOTAL_STUDENTS, src.COMPLETION_RATE, src.AVERAGE_SCORE, src.LAST_UPDATED_AT
       )`;
    console.log('[QuizAttemptSubmittedProjector.upsertHierarchicalReport] SQL ready', { queryId, sqlLength: sql.length });
    await this.oracleConnection.execute(
      sql,
      { quizId: e.quizId, sectionId: e.sectionId, quizTitle: e.quizTitle },
    );
    console.log('[QuizAttemptSubmittedProjector.upsertHierarchicalReport] EXECUTE done', { queryId });
  }

  private async upsertClassRankingForSection(e: AttemptFinalizedEvent): Promise<void> {
    // studentFullname và sectionName từ JOIN USERS + ACADEMIC_UNITS
    await this.oracleConnection.execute(
      `MERGE INTO ANALYTICS_STUDENT_CLASS_RANKING tgt
       USING (
         WITH attempts AS (
           SELECT STUDENT_ID, QUIZ_ID, SCORE
           FROM   ANALYTICS_STUDENT_QUIZ_RESULT
           WHERE  SECTION_ID = :sectionId
         ),
         quiz_attempt_avgs AS (
           SELECT
             STUDENT_ID,
             QUIZ_ID,
             ROUND(AVG(SCORE), 2) AS QUIZ_AVERAGE_SCORE,
             COUNT(*)             AS QUIZ_ATTEMPTS,
             MAX(SCORE)           AS QUIZ_HIGH_SCORE,
             MIN(SCORE)           AS QUIZ_LOW_SCORE
           FROM attempts
           GROUP BY STUDENT_ID, QUIZ_ID
         ),
         student_scores AS (
           SELECT
             STUDENT_ID,
             ROUND(AVG(QUIZ_AVERAGE_SCORE), 2)                        AS AVERAGE_SCORE,
             SUM(QUIZ_ATTEMPTS)                                       AS TOTAL_ATTEMPTS,
             MAX(QUIZ_HIGH_SCORE)                                     AS HIGHEST_SCORE,
             MIN(QUIZ_LOW_SCORE)                                      AS LOWEST_SCORE
           FROM quiz_attempt_avgs
           GROUP BY STUDENT_ID
         ),
         ranked AS (
           SELECT
             ss.STUDENT_ID,
             ss.AVERAGE_SCORE,
             ss.TOTAL_ATTEMPTS,
             COUNT(*) OVER ()                                         AS TOTAL_RANKED_STUDENTS,
             ROUND(AVG(ss.AVERAGE_SCORE) OVER (), 2)                  AS SECTION_AVG_SCORE,
             MAX(ss.HIGHEST_SCORE) OVER ()                            AS SECTION_HIGH_SCORE,
             MIN(ss.LOWEST_SCORE) OVER ()                             AS SECTION_LOW_SCORE,
             DENSE_RANK() OVER (ORDER BY ss.AVERAGE_SCORE DESC)       AS RANK_IN_SECTION,
             ROUND(
               (SELECT COUNT(*)
                FROM student_scores lower_scores
                WHERE lower_scores.AVERAGE_SCORE < ss.AVERAGE_SCORE)
               / NULLIF((SELECT COUNT(*) FROM student_scores), 0),
               4
             )                                                        AS PERCENTILE
           FROM student_scores ss
         )
         SELECT
           :sectionId       AS SECTION_ID,
           r.STUDENT_ID,
           u.FULL_NAME      AS STUDENT_FULLNAME,
           au.UNIT_NAME     AS SECTION_NAME,
           r.AVERAGE_SCORE,
           r.TOTAL_ATTEMPTS,
           r.RANK_IN_SECTION,
           r.TOTAL_RANKED_STUDENTS,
           ROUND(r.PERCENTILE, 4)   AS PERCENTILE,
           ROUND(r.SECTION_AVG_SCORE, 2) AS SECTION_AVERAGE_SCORE,
           r.SECTION_HIGH_SCORE     AS SECTION_HIGHEST_SCORE,
           r.SECTION_LOW_SCORE      AS SECTION_LOWEST_SCORE,
           SYSTIMESTAMP             AS LAST_UPDATED_AT
         FROM ranked r
         JOIN USERS u ON u.USER_ID = r.STUDENT_ID
         JOIN ACADEMIC_UNITS au ON au.UNIT_ID = :sectionId AND au.TYPE = 'SECTION'
       ) src ON (tgt.SECTION_ID = src.SECTION_ID AND tgt.STUDENT_ID = src.STUDENT_ID)
       WHEN MATCHED THEN UPDATE SET
         tgt.STUDENT_FULLNAME     = src.STUDENT_FULLNAME,
         tgt.SECTION_NAME         = src.SECTION_NAME,
         tgt.AVERAGE_SCORE        = src.AVERAGE_SCORE,
         tgt.TOTAL_ATTEMPTS       = src.TOTAL_ATTEMPTS,
         tgt.RANK_IN_SECTION      = src.RANK_IN_SECTION,
         tgt.TOTAL_RANKED_STUDENTS= src.TOTAL_RANKED_STUDENTS,
         tgt.PERCENTILE           = src.PERCENTILE,
         tgt.SECTION_AVERAGE_SCORE= src.SECTION_AVERAGE_SCORE,
         tgt.SECTION_HIGHEST_SCORE= src.SECTION_HIGHEST_SCORE,
         tgt.SECTION_LOWEST_SCORE = src.SECTION_LOWEST_SCORE,
         tgt.LAST_UPDATED_AT      = src.LAST_UPDATED_AT
       WHEN NOT MATCHED THEN INSERT (
         SECTION_ID, STUDENT_ID, STUDENT_FULLNAME, SECTION_NAME,
         AVERAGE_SCORE, TOTAL_ATTEMPTS, RANK_IN_SECTION,
         TOTAL_RANKED_STUDENTS, PERCENTILE,
         SECTION_AVERAGE_SCORE, SECTION_HIGHEST_SCORE, SECTION_LOWEST_SCORE,
         LAST_UPDATED_AT
       ) VALUES (
         src.SECTION_ID, src.STUDENT_ID, src.STUDENT_FULLNAME, src.SECTION_NAME,
         src.AVERAGE_SCORE, src.TOTAL_ATTEMPTS, src.RANK_IN_SECTION,
         src.TOTAL_RANKED_STUDENTS, src.PERCENTILE,
         src.SECTION_AVERAGE_SCORE, src.SECTION_HIGHEST_SCORE, src.SECTION_LOWEST_SCORE,
         src.LAST_UPDATED_AT
       )`,
      { sectionId: e.sectionId },
    );
  }

  // MongoDB writes
  private async writeStudentQuizAnswer(e: AttemptFinalizedEvent, status: "SUBMITTED" | "EXPIRED"): Promise<void> {
    console.log('[QuizAttemptSubmittedProjector.writeStudentQuizAnswer] ENTRY');
    console.log('[QuizAttemptSubmittedProjector.writeStudentQuizAnswer] attemptId:', e.attemptId);
    console.log('[QuizAttemptSubmittedProjector.writeStudentQuizAnswer] answers count:', e.answers?.length);
    console.log('[QuizAttemptSubmittedProjector.writeStudentQuizAnswer] First answer:', e.answers?.[0]);

    const percentage = e.maxScore > 0
      ? Math.round((e.score / e.maxScore) * 10000) / 10000
      : 0;

    const data = {
      _id:           e.attemptId,
      quizId:        e.quizId,
      quizTitle:     e.quizTitle,
      studentId:     e.studentId,
      sectionId:     e.sectionId,
      score:         e.score,
      maxScore:      e.maxScore,
      percentage:    percentage,
      startedAt:     e.startedAt,
      submittedAt:   e.occurredAt,
      durationSeconds: Math.floor((e.occurredAt.getTime() - e.startedAt.getTime()) / 1000),
      attemptNumber: e.attemptNumber,
      status,
      answers: e.answers.map((a) => ({
        questionId:             a.questionId,
        questionContent:        a.questionContent,
        selectedOptionIds:      [...a.selectedOptionIds],
        selectedOptionContents: [...a.selectedOptionContents],
        correctOptionIds:       [...a.correctOptionIds],
        correctOptionContents:  [...a.correctOptionContents],
        isCorrect:              a.isCorrect,
        earnedPoints:           a.earnedPoints,
        questionPoints:         e.pointsPerQuestion,
      })),
    };

    console.log('[QuizAttemptSubmittedProjector.writeStudentQuizAnswer] Writing to MongoDB:', {
      attemptId: data._id,
      answersLength: data.answers?.length,
      firstAnswer: data.answers?.[0],
    });

    try {
      const result = await this.studentQuizAnswerModel.replaceOne(
        { _id: e.attemptId },
        data,
        { upsert: true },
      ).exec();
      console.log('[QuizAttemptSubmittedProjector.writeStudentQuizAnswer] SUCCESS:', result);
    } catch (err) {
      console.error('[QuizAttemptSubmittedProjector.writeStudentQuizAnswer] FAILED:', err);
      throw err;
    }
  }

  private async writeQuestionFailureRate(e: AttemptFinalizedEvent): Promise<void> {
    const docId = `${e.quizId}_${e.sectionId}`;

    const existing = await this.questionFailureRateModel
      .findById(docId)
      .lean<IQuestionFailureRateDocument>()
      .exec();

    if (existing?.processedAttemptIds?.includes(e.attemptId)) return;

    const questionMap = new Map<string, IQuestionFailureStatDocument>(
      (existing?.questions ?? []).map((q) => [
        q.questionId,
        { ...q, wrongOptionCounts: { ...(q.wrongOptionCounts ?? {}) } },
      ])
    );

    for (const answer of e.answers) {
      const stat = questionMap.get(answer.questionId) ?? {
        questionId:                     answer.questionId,
        questionContent:                answer.questionContent,
        totalQuestionAttempts:          0,
        correctAnswers:                 0,
        wrongAnswers:                   0,
        unansweredCount:                0,
        failureRate:                    0,
        wrongOptionCounts:              {} as Record<string, number>,
        mostSelectedWrongOptionId:      null,
        mostSelectedWrongOptionContent: null,
      };

      if (answer.selectedOptionIds.length === 0) {
        stat.unansweredCount++;
      } else if (answer.isCorrect) {
        stat.correctAnswers++;
        stat.totalQuestionAttempts++;
      } else {
        stat.wrongAnswers++;
        stat.totalQuestionAttempts++;
        const counts = stat.wrongOptionCounts ?? {};
        for (const optId of answer.selectedOptionIds) {
          counts[optId] = (counts[optId] ?? 0) + 1;
        }
        stat.wrongOptionCounts = counts;
        const topEntry = Object.entries(counts).sort(([, a], [, b]) => (b as number) - (a as number))[0];
        if (topEntry) {
          const idx = answer.selectedOptionIds.indexOf(topEntry[0]);
          stat.mostSelectedWrongOptionId      = topEntry[0];
          stat.mostSelectedWrongOptionContent = idx >= 0
            ? (answer.selectedOptionContents[idx] ?? null)
            : null;
        }
      }

      stat.failureRate = stat.totalQuestionAttempts > 0
        ? Math.round((stat.wrongAnswers / stat.totalQuestionAttempts) * 10000) / 10000
        : 0;

      questionMap.set(answer.questionId, stat);
    }

    // sectionName từ sectionId — không join ở đây vì MongoDB context
    // sectionName sẽ được resolve khi read (AnalyticsMongoRepository JOIN hoặc lookup)
    await this.questionFailureRateModel.replaceOne(
      { _id: docId },
      {
        _id:                    docId,
        quizId:                 e.quizId,
        sectionId:              e.sectionId,
        quizTitle:              e.quizTitle,
        sectionName:            e.sectionId, // placeholder — resolved at read time
        totalSubmittedAttempts: (existing?.totalSubmittedAttempts ?? 0) + 1,
        lastUpdatedAt:          e.occurredAt,
        questions:              [...questionMap.values()],
        processedAttemptIds:    [...(existing?.processedAttemptIds ?? []), e.attemptId],
      },
      { upsert: true },
    ).exec();
  }
}
