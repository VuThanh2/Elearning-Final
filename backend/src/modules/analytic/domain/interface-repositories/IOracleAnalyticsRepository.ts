// Tại sao tách Oracle và Mongo thành 2 interface riêng?
//   - Mỗi interface có 1 lý do thay đổi: Oracle thay đổi khi schema SQL đổi,
//     Mongo thay đổi khi document structure đổi — Interface Segregation Principle.
//   - Query Service inject đúng interface cần dùng, không inject thứ thừa.
//   - Dễ mock riêng từng phần khi test.
//
// Các Read Model Oracle (6 views — dữ liệu tabular, cần aggregation SQL):
//   QuizPerformanceView        → ANALYTICS_QUIZ_PERFORMANCE
//   StudentQuizResultView      → ANALYTICS_STUDENT_QUIZ_RESULT
//   AtRiskStudentView          → ANALYTICS_AT_RISK_STUDENT
//   StudentClassRankingView    → ANALYTICS_STUDENT_CLASS_RANKING
//   ScoreDistributionView      → ANALYTICS_SCORE_DISTRIBUTION
//   HierarchicalQuizReportView → ANALYTICS_HIERARCHICAL_REPORT
//
// Tất cả method đều là query (SELECT) — không có insert/update/delete.
// Projection layer (event handler) write trực tiếp vào Oracle table,
// không đi qua interface này. Interface này chỉ phục vụ read path.
import { QuizPerformanceView }        from "../read-models/QuizPerformanceView";
import { StudentQuizResultView }      from "../read-models/StudentQuizResultView";
import { AtRiskStudentView }          from "../read-models/AtRiskStudentView";
import { StudentClassRankingView }    from "../read-models/StudentClassRankingView";
import { ScoreDistributionView }      from "../read-models/ScoreDistributionView";
import {
  HierarchicalQuizReportView,
  HierarchicalReportSummary,
  HierarchicalLevel,
} from "../read-models/HierarchicalQuizReportView";

export interface IOracleAnalyticsRepository {

  // QuizPerformanceView — Actor: Teacher

  // Lấy performance của 1 quiz cụ thể trong 1 section.
  // Dùng bởi: Teacher xem thống kê 1 quiz vừa chọn.
  // Trả về null nếu chưa có attempt nào được submit cho quiz này.
  findQuizPerformance(
    quizId:    string,
    sectionId: string,
  ): Promise<QuizPerformanceView | null>;

  // Lấy performance của tất cả quiz trong 1 section.
  // Dùng bởi: Teacher xem tổng quan section dashboard.
  // Trả về [] nếu section chưa có quiz nào được attempt.
  findQuizPerformanceBySection(
    sectionId: string,
  ): Promise<QuizPerformanceView[]>;

  // StudentQuizResultView — Actor: Student

  // Lấy tất cả kết quả quiz của 1 student trong 1 section.
  // Dùng bởi: Student xem lịch sử làm bài trong section.
  // Trả về [] nếu student chưa attempt quiz nào trong section.
  findStudentResultsBySection(
    studentId: string,
    sectionId: string,
  ): Promise<StudentQuizResultView[]>;

  // Lấy tất cả kết quả của 1 student cho 1 quiz cụ thể (nhiều attempt).
  // Dùng bởi: Student xem lịch sử các lần làm bài của 1 quiz.
  // Kết quả sắp xếp theo attemptNumber tăng dần.
  findStudentResultsByQuiz(
    studentId: string,
    quizId:    string,
  ): Promise<StudentQuizResultView[]>;

  // AtRiskStudentView — Actor: Teacher

  // Lấy danh sách tất cả student trong 1 section, kèm risk level.
  // Dùng bởi: Teacher xem At-Risk dashboard của section.
  // Sắp xếp mặc định: averageScore tăng dần (student yếu nhất lên đầu).
  // Trả về [] nếu chưa có student nào attempt quiz trong section.
  findAtRiskStudentsBySection(
    sectionId: string,
  ): Promise<AtRiskStudentView[]>;

  // StudentClassRankingView — Actor: Student

  // Lấy rank của 1 student cụ thể trong 1 section.
  // Dùng bởi: Student xem rank của chính mình.
  // Trả về null nếu student chưa attempt quiz nào (chưa được xếp hạng).
  findStudentRanking(
    studentId: string,
    sectionId: string,
  ): Promise<StudentClassRankingView | null>;

  // Lấy toàn bộ bảng xếp hạng của section (dùng cho Teacher xem tổng thể).
  // Sắp xếp theo rankInSection tăng dần.
  findClassRankingBySection(
    sectionId: string,
  ): Promise<StudentClassRankingView[]>;

  // ScoreDistributionView — Actor: Teacher / Admin

  // Lấy phân phối điểm của 1 quiz trong 1 section.
  // Dùng bởi: Teacher / Admin xem histogram điểm.
  // Trả về null nếu chưa có attempt submitted.
  findScoreDistribution(
    quizId:    string,
    sectionId: string,
  ): Promise<ScoreDistributionView | null>;

  // HierarchicalQuizReportView — Actor: Admin

  // Lấy toàn bộ flat list quiz report theo hierarchy.
  // Dùng bởi: Admin xem tổng quan toàn trường.
  // Sắp xếp: facultyId → courseId → sectionId → quizId.
  findHierarchicalReport(): Promise<HierarchicalQuizReportView[]>;

  // Lấy flat list giới hạn trong 1 faculty.
  // Dùng bởi: Admin drill-down vào Faculty.
  findHierarchicalReportByFaculty(
    facultyId: string,
  ): Promise<HierarchicalQuizReportView[]>;

  // Lấy flat list giới hạn trong 1 course.
  // Dùng bởi: Admin drill-down vào Course.
  findHierarchicalReportByCourse(
    courseId: string,
  ): Promise<HierarchicalQuizReportView[]>;

  // Tính summary tổng hợp theo 1 level (Faculty / Course / Section).
  // Dùng bởi: Admin xem aggregate numbers mà không cần xem từng quiz.
  findHierarchicalSummary(
    level:  HierarchicalLevel,
    unitId: string,
  ): Promise<HierarchicalReportSummary | null>;
}