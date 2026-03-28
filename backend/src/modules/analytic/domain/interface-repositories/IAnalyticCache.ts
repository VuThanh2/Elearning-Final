
// Design decisions:
//   - get<T> trả về T | null, không throw khi cache miss
//   - set/invalidate/invalidatePattern không throw khi Redis lỗi
//     → Cache failure KHÔNG được làm crash query (degrade gracefully)
//   - invalidatePattern chỉ dùng cho HierarchicalReport vì nó có nhiều
//     key permutation. Các view khác dùng invalidate(exactKeys[]).
export interface IAnalyticCache {
  // Lấy cached value theo key.
  // Trả về null nếu cache miss hoặc Redis lỗi.
  get<T>(key: string): Promise<T | null>;

  // Lưu value vào cache với TTL tính bằng giây.
  // Silent fail nếu Redis lỗi — không throw.
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;

  // Xóa một danh sách key cụ thể.
  // Dùng cho invalidation sau khi Projector write xong.
  // Silent fail nếu Redis lỗi — không throw.
  invalidate(keys: string[]): Promise<void>;

  // Xóa tất cả key khớp pattern (dùng Redis SCAN + DEL).
  // KHÔNG dùng KEYS * — blocking trên production Redis.
  // Silent fail nếu Redis lỗi — không throw.
  invalidatePattern(pattern: string): Promise<void>;
}

// Cache Key Constants
export const AnalyticCacheKey = {
  // QuizPerformanceView
  // Teacher xem 1 quiz cụ thể trong 1 section
  quizPerformance: (quizId: string, sectionId: string) =>
    `analytics:quiz_perf:${quizId}:${sectionId}`,

  // QuizPerformanceView (list)
  // Teacher xem tất cả quiz trong 1 section
  sectionPerformance: (sectionId: string) =>
    `analytics:sect_perf:${sectionId}`,

  // StudentQuizResultView (by section)
  // Student xem lịch sử làm bài trong 1 section
  studentResultsBySection: (studentId: string, sectionId: string) =>
    `analytics:stu_result_sect:${studentId}:${sectionId}`,

  // StudentQuizResultView (by quiz)
  // Student xem lịch sử các lần làm 1 quiz
  studentResultsByQuiz: (studentId: string, quizId: string) =>
    `analytics:stu_result_quiz:${studentId}:${quizId}`,

  // StudentQuizAnswerView
  // Student review chi tiết 1 attempt
  answerReview: (attemptId: string) =>
    `analytics:answer_review:${attemptId}`,

  // StudentQuizAnswerView (list by quiz)
  // Student xem lịch sử đáp án nhiều lần làm
  answerHistoryByQuiz: (studentId: string, quizId: string) =>
    `analytics:answer_hist:${studentId}:${quizId}`,

  // QuestionFailureRateView
  // Teacher xem failure rate từng câu trong 1 quiz × section
  questionFailureRate: (quizId: string, sectionId: string) =>
    `analytics:fail_rate:${quizId}:${sectionId}`,

  // AtRiskStudentView
  // Teacher xem danh sách student at-risk trong 1 section
  atRiskStudents: (sectionId: string) =>
    `analytics:at_risk:${sectionId}`,

  // StudentClassRankingView (single student)
  // Student xem rank của mình trong 1 section
  studentRanking: (studentId: string, sectionId: string) =>
    `analytics:rank_stu:${studentId}:${sectionId}`,

  // StudentClassRankingView (full section)
  // Teacher xem toàn bộ bảng xếp hạng section
  sectionRanking: (sectionId: string) =>
    `analytics:rank_sect:${sectionId}`,

  // ScoreDistributionView
  // Teacher/Admin xem histogram điểm
  scoreDistribution: (quizId: string, sectionId: string) =>
    `analytics:score_dist:${quizId}:${sectionId}`,

  // HierarchicalQuizReportView — dùng invalidatePattern("analytics:hier:*")
  // vì có nhiều permutation (ALL, by faculty, by course, tree, summary)
  hierarchicalAll:        () => `analytics:hier:all`,
  hierarchicalTree:       () => `analytics:hier:tree`,
  hierarchicalByFaculty:  (facultyId: string) => `analytics:hier:fac:${facultyId}`,
  hierarchicalByCourse:   (courseId: string)  => `analytics:hier:crs:${courseId}`,
  hierarchicalSummary:    (level: string, unitId: string) => `analytics:hier:sum:${level}:${unitId}`,

  // Pattern để invalidate tất cả hierarchical keys cùng lúc
  HIER_PATTERN: "analytics:hier:*",
} as const;

// TTL Constants (giây) 
export const AnalyticsCacheTTL = {
  // Views nặng — Oracle window function, recursive CTE, histogram
  HEAVY:   10 * 60,  // 10 phút

  // Views bình thường — simple SELECT với index
  NORMAL:  5  * 60,  // 5 phút

  // StudentQuizAnswerView — finalized, không bao giờ thay đổi sau khi ghi
  // Dùng TTL dài, không cần invalidate chủ động trong Projector
  IMMUTABLE: 60 * 60, // 1 giờ
} as const;