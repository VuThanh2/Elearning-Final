import { api } from '../../shared/services/api';
import {
  QuizPerformance,
  StudentQuizResult,
  AtRiskStudent,
  StudentClassRanking,
  ScoreDistribution,
  QuestionFailureRate,
  HierarchicalReportNode,
} from '../../shared/types';

const toSafeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeRatio = (value: unknown): number => {
  const parsed = toSafeNumber(value);
  if (parsed <= 0) return 0;
  return parsed > 1 ? parsed / 100 : parsed;
};

const normalizeStudentResult = (value: any): StudentQuizResult => ({
  attemptId: String(value?.attemptId ?? value?._id ?? value?.id ?? ''),
  quizId: String(value?.quizId ?? ''),
  sectionId: value?.sectionId ? String(value.sectionId) : undefined,
  studentId: value?.studentId ? String(value.studentId) : undefined,
  studentName: value?.studentName ?? value?.studentFullname ?? undefined,
  quizTitle: value?.quizTitle ?? 'Untitled quiz',
  score: toSafeNumber(value?.score),
  maxScore: toSafeNumber(value?.maxScore),
  percentage: normalizeRatio(value?.percentage),
  completionRate: value?.completionRate == null ? undefined : normalizeRatio(value.completionRate),
  startedAt: value?.startedAt ?? undefined,
  submittedAt: value?.submittedAt ?? '',
  durationSeconds: toSafeNumber(value?.durationSeconds),
  attemptNumber: Math.max(1, toSafeNumber(value?.attemptNumber) || 1),
  status: value?.status === 'EXPIRED' ? 'EXPIRED' : 'SUBMITTED',
});

const normalizeStudentRanking = (value: any): StudentClassRanking | null => {
  if (!value || value === 'null') return null;

  return {
    sectionId: String(value.sectionId ?? ''),
    sectionName: value.sectionName ?? '',
    studentId: value.studentId ? String(value.studentId) : undefined,
    studentName: value.studentName ?? value.studentFullname ?? undefined,
    studentFullname: value.studentFullname ?? value.studentName ?? undefined,
    rankInSection: Math.max(1, toSafeNumber(value.rankInSection ?? value.rank) || 1),
    averageScore: toSafeNumber(value.averageScore ?? value.score),
    totalAttempts: toSafeNumber(value.totalAttempts),
    totalRankedStudents: Math.max(0, toSafeNumber(value.totalRankedStudents)),
    percentile: normalizeRatio(value.percentile),
    sectionAverageScore: toSafeNumber(value.sectionAverageScore),
    sectionHighestScore: toSafeNumber(value.sectionHighestScore),
    sectionLowestScore: toSafeNumber(value.sectionLowestScore),
    lastUpdatedAt: value.lastUpdatedAt ?? '',
  };
};

export const analyticsService = {
  // Teacher Analytics
  async getQuizPerformance(sectionId: string): Promise<QuizPerformance[]> {
    const response = await api.get<QuizPerformance[]>(
      `/analytics/sections/${sectionId}/performance`
    );
    return response.data;
  },

  async getQuizSpecificPerformance(
    sectionId: string,
    quizId: string
  ): Promise<QuizPerformance> {
    const response = await api.get<QuizPerformance>(
      `/analytics/sections/${sectionId}/quizzes/${quizId}/performance`
    );
    return response.data;
  },

  async getAtRiskStudents(sectionId: string): Promise<AtRiskStudent[]> {
    const response = await api.get<AtRiskStudent[]>(
      `/analytics/sections/${sectionId}/at-risk`
    );
    return response.data;
  },

  async getScoreDistribution(sectionId: string, quizId: string): Promise<ScoreDistribution> {
    const response = await api.get<ScoreDistribution>(
      `/analytics/sections/${sectionId}/quizzes/${quizId}/score-distribution`
    );
    return response.data;
  },

  async getQuestionFailureRate(
    sectionId: string,
    quizId: string
  ): Promise<QuestionFailureRate[]> {
    const response = await api.get<QuestionFailureRate[]>(
      `/analytics/sections/${sectionId}/quizzes/${quizId}/question-failure-rate`
    );
    return response.data;
  },

  // Student Analytics
  async getMyResults(sectionId: string): Promise<StudentQuizResult[]> {
    const response = await api.get<any>(
      `/analytics/sections/${sectionId}/my-results`
    );
    return Array.isArray(response.data) ? response.data.map(normalizeStudentResult) : [];
  },

  async getMyQuizResults(quizId: string): Promise<StudentQuizResult[]> {
    const response = await api.get<any>(
      `/analytics/quizzes/${quizId}/my-results`
    );
    return Array.isArray(response.data) ? response.data.map(normalizeStudentResult) : [];
  },

  async getAnswerReview(attemptId: string): Promise<any> {
    const response = await api.get(`/analytics/attempts/${attemptId}/answer-review`);
    return response.data;
  },

  async getMyAnswerHistory(quizId: string): Promise<any[]> {
    const response = await api.get(`/analytics/quizzes/${quizId}/my-answer-history`);
    return response.data || [];
  },

  async getMyClassRanking(sectionId: string): Promise<StudentClassRanking | null> {
    const response = await api.get<any>(
      `/analytics/sections/${sectionId}/my-ranking`
    );
    return normalizeStudentRanking(response.data);
  },

  // Admin Analytics
  async getHierarchicalReport(): Promise<HierarchicalReportNode> {
    const response = await api.get<HierarchicalReportNode>(
      '/analytics/hierarchical-report'
    );
    return response.data;
  },

  async getHierarchicalReportTree(): Promise<HierarchicalReportNode> {
    const response = await api.get<HierarchicalReportNode>(
      '/analytics/hierarchical-report/tree'
    );
    return response.data;
  },

  async getHierarchicalReportSummary(): Promise<any> {
    const response = await api.get('/analytics/hierarchical-report/summary');
    return response.data;
  },

  async getHierarchicalReportByFaculty(facultyId: string): Promise<HierarchicalReportNode> {
    const response = await api.get<HierarchicalReportNode>(
      `/analytics/hierarchical-report/faculty/${facultyId}`
    );
    return response.data;
  },

  async getHierarchicalReportByCourse(courseId: string): Promise<HierarchicalReportNode> {
    const response = await api.get<HierarchicalReportNode>(
      `/analytics/hierarchical-report/course/${courseId}`
    );
    return response.data;
  },
};
