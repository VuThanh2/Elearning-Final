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
    const response = await api.get<any>(
      `/analytics/sections/${sectionId}/at-risk`
    );
    // Backend returns wrapped response with students array
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // If wrapped, extract students array
    if (response.data?.students && Array.isArray(response.data.students)) {
      return response.data.students;
    }
    return [];
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
    return response.data;
  },

  async getMyQuizResults(quizId: string): Promise<StudentQuizResult[]> {
    const response = await api.get<StudentQuizResult[]>(
      `/analytics/quizzes/${quizId}/my-results`
    );
    return response.data;
  },

  async getAnswerReview(attemptId: string): Promise<any> {
    const response = await api.get(`/analytics/attempts/${attemptId}/answer-review`);
    return response.data;
  },

  async getMyAnswerHistory(quizId: string): Promise<any[]> {
    const response = await api.get(`/analytics/quizzes/${quizId}/my-answer-history`);
    return response.data;
  },

  async getMyClassRanking(sectionId: string): Promise<StudentClassRanking[]> {
    const response = await api.get<StudentClassRanking[]>(
      `/analytics/sections/${sectionId}/my-ranking`
    );
    return response.data;
  },

  // Admin Analytics
  async getHierarchicalReport(): Promise<HierarchicalReportNode> {
    console.log('[Admin Analytics] Fetching hierarchical report from: /analytics/hierarchical-report');
    try {
      const response = await api.get<any>(
        '/analytics/hierarchical-report'
      );
      console.log('[Admin Analytics] Response status:', response.status);
      console.log('[Admin Analytics] Raw response data:', response.data);

      // Transform backend response (HierarchicalReportTreeDTO) to frontend format (HierarchicalReportNode)
      const transformed = this.transformHierarchicalReport(response.data);
      console.log('[Admin Analytics] Transformed data:', transformed);
      return transformed;
    } catch (error) {
      console.error('[Admin Analytics] Error fetching hierarchical report:', error);
      throw error;
    }
  },

  // Transform backend tree structure to frontend format
  private transformHierarchicalReport(data: any): HierarchicalReportNode {
    console.log('[Admin Analytics.transformHierarchicalReport] ENTRY');
    console.log('[Admin Analytics.transformHierarchicalReport] Input data:', data);
    console.log('[Admin Analytics.transformHierarchicalReport] Input keys:', Object.keys(data || {}));

    if (!data) {
      console.error('[Admin Analytics.transformHierarchicalReport] Data is null/undefined');
      return {
        id: 'root',
        name: 'Organization',
        level: 'FACULTY',
        totalQuizzes: 0,
        averageScore: 0,
        completionRate: 0,
        children: [],
      };
    }

    // Backend returns { generatedAt, faculties: [...] }
    const faculties = data.faculties || [];
    console.log('[Admin Analytics.transformHierarchicalReport] Faculties count:', faculties.length);

    // Aggregate metrics across all faculties
    let totalQuizzes = 0;
    let totalScore = 0;
    let totalCompletion = 0;
    const facultyCount = faculties.length;

    const children = faculties.map((faculty: any, index: number) => {
      console.log(`[Admin Analytics.transformHierarchicalReport] Processing faculty ${index}:`, faculty.facultyName);

      const fMetrics = faculty.summary || {};
      totalQuizzes += fMetrics.totalQuizzes || 0;
      totalScore += fMetrics.averageScore || 0;
      totalCompletion += fMetrics.completionRate || 0;

      const courses = (faculty.courses || []).map((course: any) => {
        const cMetrics = course.summary || {};
        const sections = (course.sections || []).map((section: any) => ({
          id: section.sectionId,
          name: section.sectionName,
          level: 'SECTION' as const,
          totalQuizzes: section.quizzes?.length || 0,
          averageScore: cMetrics.averageScore || 0,
          completionRate: cMetrics.completionRate || 0,
          children: [],
        }));

        return {
          id: course.courseId,
          name: course.courseName,
          level: 'COURSE' as const,
          totalQuizzes: cMetrics.totalQuizzes || 0,
          averageScore: cMetrics.averageScore || 0,
          completionRate: cMetrics.completionRate || 0,
          children: sections,
        };
      });

      return {
        id: faculty.facultyId,
        name: faculty.facultyName,
        level: 'FACULTY' as const,
        totalQuizzes: fMetrics.totalQuizzes || 0,
        averageScore: fMetrics.averageScore || 0,
        completionRate: fMetrics.completionRate || 0,
        children: courses,
      };
    });

    const rootNode: HierarchicalReportNode = {
      id: 'root',
      name: 'Organization',
      level: 'FACULTY',
      totalQuizzes: totalQuizzes,
      averageScore: facultyCount > 0 ? Math.round((totalScore / facultyCount) * 100) / 100 : 0,
      completionRate: facultyCount > 0 ? Math.round((totalCompletion / facultyCount) * 10000) / 10000 : 0,
      children,
    };

    console.log('[Admin Analytics.transformHierarchicalReport] Transformed root node:', rootNode);
    return rootNode;
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
