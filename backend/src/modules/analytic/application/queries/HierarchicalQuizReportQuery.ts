import { IOracleAnalyticsRepository }  from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { HierarchicalQuizReportView, HierarchicalReportSummary, HierarchicalLevel } from "../../domain/read-models/HierarchicalQuizReportView";
import {
  HierarchicalReportRowDTO,
  HierarchicalReportTreeDTO,
  FacultyReportDTO,
  CourseReportDTO,
  SectionReportDTO,
  HierarchicalSummaryDTO,
  HierarchicalUnitSummaryDTO,
} from "../dtos/HierarchicalQuizReportDTO";

// Actor:   Admin
// Permission: VIEW_HIERARCHICAL_REPORT
//
// 1 Query class = 1 Read Model (HierarchicalQuizReportView).
// 3 method: flat(), tree(), summary() — phân biệt theo format và scope.
export type HierarchicalScope =
  | { type: "ALL" }
  | { type: "FACULTY"; facultyId: string }
  | { type: "COURSE";  courseId:  string };

export class HierarchicalQuizReportQuery {
  constructor(
    private readonly oracleRepo: IOracleAnalyticsRepository,
  ) {}

  // GET /analytics/hierarchical-report[/faculty/:id | /course/:id]
  // → HierarchicalReportRowDTO[]
  async flat(scope: HierarchicalScope): Promise<HierarchicalReportRowDTO[]> {
    let views: HierarchicalQuizReportView[];
    switch (scope.type) {
      case "ALL":     views = await this.oracleRepo.findHierarchicalReport(); break;
      case "FACULTY": views = await this.oracleRepo.findHierarchicalReportByFaculty(scope.facultyId); break;
      case "COURSE":  views = await this.oracleRepo.findHierarchicalReportByCourse(scope.courseId); break;
    }
    return views.map((view) => this.toRowDTO(view));
  }

  // GET /analytics/hierarchical-report/tree
  // → HierarchicalReportTreeDTO
  async tree(): Promise<HierarchicalReportTreeDTO> {
    const views = await this.oracleRepo.findHierarchicalReport();
    const rows  = views.map((view) => this.toRowDTO(view));
    return { generatedAt: new Date().toISOString(), faculties: this.buildFaculties(rows) };
  }

  // GET /analytics/hierarchical-report/summary?level=FACULTY&unitId=...
  // → HierarchicalUnitSummaryDTO | null
  async summary(level: HierarchicalLevel, unitId: string): Promise<HierarchicalUnitSummaryDTO | null> {
    const s = await this.oracleRepo.findHierarchicalSummary(level, unitId);
    return s ? this.toSummaryDTO(s) : null;
  }

  // private helpers 
  // HierarchicalQuizReportView (domain) → HierarchicalReportRowDTO (application)
  private toRowDTO(view: HierarchicalQuizReportView): HierarchicalReportRowDTO {
    return {
      facultyId:         view.facultyId,
      facultyName:       view.facultyName,
      facultyCode:       view.facultyCode,
      courseId:          view.courseId,
      courseName:        view.courseName,
      courseCode:        view.courseCode,
      sectionId:         view.sectionId,
      sectionName:       view.sectionName,
      sectionCode:       view.sectionCode,
      quizId:            view.quizId,
      quizTitle:         view.quizTitle,
      totalAttempts:     view.totalAttempts,
      attemptedStudents: view.attemptedStudents,
      totalStudents:     view.totalStudents,
      completionRate:    view.completionRate,
      averageScore:      view.averageScore,
      lastUpdatedAt:     view.lastUpdatedAt.toISOString(),
    };
  }

  // HierarchicalReportSummary (domain) → HierarchicalUnitSummaryDTO (application)
  private toSummaryDTO(s: HierarchicalReportSummary): HierarchicalUnitSummaryDTO {
    return {
      level:         s.level,
      unitId:        s.unitId,
      unitName:      s.unitName,
      totalQuizzes:  s.totalQuizzes,
      totalAttempts: s.totalAttempts,
      averageScore:  s.averageScore,
      completionRate: s.completionRate,
    };
  }

  // -private: tree builder (transform flat rows → nested tree) 
  private buildFaculties(rows: HierarchicalReportRowDTO[]): FacultyReportDTO[] {
    const map = new Map<string, HierarchicalReportRowDTO[]>();
    for (const row of rows) {
      (map.get(row.facultyId) ?? map.set(row.facultyId, []).get(row.facultyId)!).push(row);
    }
    return Array.from(map.entries()).map(([facultyId, fRows]) => ({
      facultyId,
      facultyName: fRows[0]!.facultyName,
      facultyCode: fRows[0]!.facultyCode,
      summary:     this.summarise(fRows),
      courses:     this.buildCourses(fRows),
    }));
  }

  private buildCourses(rows: HierarchicalReportRowDTO[]): CourseReportDTO[] {
    const map = new Map<string, HierarchicalReportRowDTO[]>();
    for (const row of rows) {
      (map.get(row.courseId) ?? map.set(row.courseId, []).get(row.courseId)!).push(row);
    }
    return Array.from(map.entries()).map(([courseId, cRows]) => ({
      courseId,
      courseName: cRows[0]!.courseName,
      courseCode: cRows[0]!.courseCode,
      summary:    this.summarise(cRows),
      sections:   this.buildSections(cRows),
    }));
  }

  private buildSections(rows: HierarchicalReportRowDTO[]): SectionReportDTO[] {
    const map = new Map<string, HierarchicalReportRowDTO[]>();
    for (const row of rows) {
      (map.get(row.sectionId) ?? map.set(row.sectionId, []).get(row.sectionId)!).push(row);
    }
    return Array.from(map.entries()).map(([sectionId, sRows]) => ({
      sectionId,
      sectionName: sRows[0]!.sectionName,
      sectionCode: sRows[0]!.sectionCode,
      summary:     this.summarise(sRows),
      quizzes:     sRows,
    }));
  }

  private summarise(rows: HierarchicalReportRowDTO[]): HierarchicalSummaryDTO {
    if (!rows.length) return { totalQuizzes: 0, totalAttempts: 0, averageScore: 0, completionRate: 0 };
    const totalAttempts  = rows.reduce((s, r) => s + r.totalAttempts,  0);
    const averageScore   = rows.reduce((s, r) => s + r.averageScore,   0) / rows.length;
    const completionRate = rows.reduce((s, r) => s + r.completionRate, 0) / rows.length;
    return {
      totalQuizzes:   rows.length,
      totalAttempts,
      averageScore:   Math.round(averageScore   * 100)   / 100,
      completionRate: Math.round(completionRate * 10000) / 10000,
    };
  }
}