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
    const response = await api.get<StudentQuizResult[]>(
      `/analytics/sections/${sectionId}/my-results`
    );
    return response.data || [];
  },

  async getMyQuizResults(quizId: string): Promise<StudentQuizResult[]> {
    const response = await api.get<StudentQuizResult[]>(
      `/analytics/quizzes/${quizId}/my-results`
    );
    return response.data || [];
  },

  async getAnswerReview(attemptId: string): Promise<any> {
    const response = await api.get(`/analytics/attempts/${attemptId}/answer-review`);
    return response.data;
  },

  async getMyAnswerHistory(quizId: string): Promise<any[]> {
    const response = await api.get(`/analytics/quizzes/${quizId}/my-answer-history`);
    return response.data || [];
  },

  async getMyClassRanking(sectionId: string): Promise<StudentClassRanking[]> {
    const response = await api.get<StudentClassRanking[]>(
      `/analytics/sections/${sectionId}/my-ranking`
    );
    return response.data || [];
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
