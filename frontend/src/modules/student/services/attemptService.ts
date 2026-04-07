import { api } from '../../shared/services/api';
import { QuizAttempt, SubmitAttemptRequest } from '../../shared/types';

// Normalize backend attempt response to frontend format
const normalizeAttempt = (data: any): QuizAttempt => ({
  id: data.attemptId || data.id,
  quizId: data.quizId,
  studentId: data.studentId,
  sectionId: data.sectionId,
  attemptNumber: data.attemptNumber,
  status: data.status,
  startedAt: data.startedAt,
  submittedAt: data.submittedAt || null,
  expiresAt: data.expiresAt,
  score: data.score || 0,
  maxScore: data.maxScore || 0,
  answers: data.answers,
});

export const attemptService = {
  async startAttempt(quizId: string): Promise<QuizAttempt> {
    const response = await api.post<QuizAttempt>(`/quizzes/${quizId}/attempts`, {});
    console.log('[attemptService] Raw response:', response.data);
    const normalized = normalizeAttempt(response.data);
    console.log('[attemptService] Normalized:', normalized);
    return normalized;
  },

  async submitAttempt(attemptId: string, data: SubmitAttemptRequest): Promise<QuizAttempt> {
    const response = await api.post<QuizAttempt>(`/attempts/${attemptId}/submit`, data);
    return normalizeAttempt(response.data);
  },

  async expireAttempt(attemptId: string): Promise<QuizAttempt> {
    const response = await api.post<QuizAttempt>(`/attempts/${attemptId}/expire`, {});
    return normalizeAttempt(response.data);
  },
};
