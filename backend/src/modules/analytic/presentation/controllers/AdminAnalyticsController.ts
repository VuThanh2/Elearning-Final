import { Request, Response } from "express";
import { HierarchicalQuizReportQuery, HierarchicalScope } from "../../application/queries/HierarchicalQuizReportQuery";
import { ScoreDistributionQuery } from "../../application/queries/ScoreDistributionQuery";
import { HierarchicalLevel } from "../../domain/read-models/HierarchicalQuizReportView";

// Actor: Admin
// Permissions used:
//   VIEW_HIERARCHICAL_REPORT — hierarchical report (flat, tree, summary)
//   VIEW_ANALYTICS           — score distribution (shared với Teacher)
//
// Authorization by data:
//   Admin không có authorization by data — xem được tất cả section / faculty / course.
//   Không cần gọi isTeacherAssignedToSection() — GetScoreDistributionQuery
//   nhận actorRole = "ADMIN" để bỏ qua bước đó.
export class AdminAnalyticsController {
  constructor(
    private readonly getHierarchicalReportQuery: HierarchicalQuizReportQuery,
    private readonly getScoreDistributionQuery:  ScoreDistributionQuery,
  ) {}

  // GET /analytics/hierarchical-report
  // Permission: VIEW_HIERARCHICAL_REPORT
  // Response 200: HierarchicalReportRowDTO[]   (flat — toàn trường)
  async getFullReport(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.getHierarchicalReportQuery.flat({ type: "ALL" });
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/hierarchical-report/faculty/:facultyId
  // Permission: VIEW_HIERARCHICAL_REPORT
  // Response 200: HierarchicalReportRowDTO[]   (flat — trong 1 faculty)
  async getReportByFaculty(
    req: Request<{ facultyId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const scope: HierarchicalScope = { type: "FACULTY", facultyId: req.params.facultyId };
      const result = await this.getHierarchicalReportQuery.flat(scope);
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/hierarchical-report/course/:courseId
  // Permission: VIEW_HIERARCHICAL_REPORT
  // Response 200: HierarchicalReportRowDTO[]   (flat — trong 1 course)
  async getReportByCourse(
    req: Request<{ courseId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const scope: HierarchicalScope = { type: "COURSE", courseId: req.params.courseId };
      const result = await this.getHierarchicalReportQuery.flat(scope);
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/hierarchical-report/tree
  // Permission: VIEW_HIERARCHICAL_REPORT
  // Response 200: HierarchicalReportTreeDTO
  async getReportTree(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.getHierarchicalReportQuery.tree();
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/hierarchical-report/summary
  // Query params: level=FACULTY|COURSE|SECTION  &  unitId=<id>
  // Permission: VIEW_HIERARCHICAL_REPORT
  // Response 200: HierarchicalUnitSummaryDTO | null
  // null = đơn vị không có dữ liệu (chưa có attempt nào).
  async getReportSummary(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { level, unitId } = req.query as { level?: string; unitId?: string };

      if (!level || !unitId) {
        res.status(400).json({ message: "ValidationError: Query params 'level' và 'unitId' là bắt buộc." });
        return;
      }

      const VALID_LEVELS: HierarchicalLevel[] = ["FACULTY", "COURSE", "SECTION"];
      if (!VALID_LEVELS.includes(level as HierarchicalLevel)) {
        res.status(400).json({
          message: `ValidationError: 'level' phải là một trong: ${VALID_LEVELS.join(", ")}.`,
        });
        return;
      }

      const result = await this.getHierarchicalReportQuery.summary(
        level as HierarchicalLevel,
        unitId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/sections/:sectionId/quizzes/:quizId/score-distribution
  // Permission: VIEW_ANALYTICS
  // Response 200: ScoreDistributionDTO | null
  // null = chưa có attempt submitted nào.
  async getScoreDistribution(
    req: Request<{ sectionId: string; quizId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.getScoreDistributionQuery.execute(
        req.user!.userId,
        "ADMIN",
        req.params.quizId,
        req.params.sectionId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }
}

// mapErrorToStatus — Analytics Context (Admin)
//
// ValidationError: 400 — level/unitId params không hợp lệ
// (other)          500
function mapErrorToStatus(message: string): number {
  if (message.startsWith("ValidationError:")) return 400;
  return 500;
}