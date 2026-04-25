import { api } from '../../shared/services/api';
import { QuizAttempt, SubmitAttemptRequest, Question, AnswerOption } from '../../shared/types';

export interface StartAttemptResponse {
  attemptId: string;
  quizId: string;
  quizTitle?: string;
  description?: string;
  attemptNumber: number;
  status: QuizAttempt['status'];
  startedAt: string;
  expiresAt: string;
  timeLimitMinutes: number;
  questions: Question[];
  totalQuestions: number;
  maxScore: number;
}

const normalizeAttemptQuestion = (data: any): Question => ({
  id: data.questionId || data.id,
  questionId: data.questionId || data.id,
  content: data.content ?? data.questionContent ?? data.text,
  questionType: data.questionType,
  points: data.points,
  answerOptions: Array.isArray(data.answerOptions ?? data.options)
    ? (data.answerOptions ?? data.options).map((opt: any): AnswerOption => ({
        id: opt.optionId || opt.id,
        optionId: opt.optionId || opt.id,
        content: opt.content ?? opt.text ?? opt.label,
        isCorrect: Boolean(opt.isCorrect),
      }))
    : [],
});

export const normalizeAttemptStart = (data: any): StartAttemptResponse => {
  const source = data?.data ?? data?.quiz ?? data;
  const questionsSource = source?.questions ?? [];

  return {
    attemptId: source.attemptId,
    quizId: source.quizId,
    quizTitle: source.quizTitle,
    description: source.description,
    attemptNumber: source.attemptNumber,
    status: source.status,
    startedAt: source.startedAt,
    expiresAt: source.expiresAt,
    timeLimitMinutes: source.timeLimitMinutes,
    totalQuestions: source.totalQuestions ?? questionsSource.length,
    maxScore: source.maxScore,
    questions: Array.isArray(questionsSource) ? questionsSource.map(normalizeAttemptQuestion) : [],
  };
};

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
  async startAttempt(quizId: string): Promise<StartAttemptResponse> {
    try {
      const response = await api.post<any>(`/quizzes/${quizId}/attempts`, {});
      const data = response.data?.data ?? response.data;
      return normalizeAttemptStart(data);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status !== 404) {
        throw error;
      }

      const fallback = await api.post<any>(`/quizzes/${quizId}/attempt`, {});
      const data = fallback.data?.data ?? fallback.data;
      return normalizeAttemptStart(data);
    }
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
