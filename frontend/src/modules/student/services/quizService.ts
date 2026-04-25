import { api } from '../../shared/services/api';
import {
  Quiz,
  CreateQuizRequest,
  UpdateQuizRequest,
  AddQuestionRequest,
  UpdateQuestionRequest,
  AddAnswerOptionRequest,
  UpdateAnswerOptionRequest,
} from '../../shared/types';
import { normalizeQuiz, normalizeQuizzes } from '../../shared/utils/normalizers';

export const quizService = {
  async createQuiz(sectionId: string, data: CreateQuizRequest): Promise<Quiz> {
    const response = await api.post<any>('/quizzes', {
      ...data,
      sectionId,
    });
    return normalizeQuiz(response.data);
  },

  async getQuiz(quizId: string): Promise<Quiz> {
    const response = await api.get<any>(`/quizzes/${quizId}`);
    return normalizeQuiz(response.data);
  },

  async getQuizForAttempt(quizId: string): Promise<Quiz> {
    const response = await api.get<any>(`/quizzes/${quizId}/attempt`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
    const data = response.data?.data ?? response.data;
    const quiz = normalizeQuiz(data);

    if (quiz.questions.length === 0 && Array.isArray((data as any)?.questions)) {
      console.warn('Quiz attempt response contained questions but normalization failed', data);
    }

    return quiz;
  },

  async updateQuiz(quizId: string, data: UpdateQuizRequest): Promise<Quiz> {
    const response = await api.patch<any>(`/quizzes/${quizId}`, data);
    return normalizeQuiz(response.data);
  },

  async publishQuiz(quizId: string): Promise<Quiz> {
    const response = await api.post<any>(`/quizzes/${quizId}/publish`);
    return normalizeQuiz(response.data);
  },

  async hideQuiz(quizId: string): Promise<Quiz> {
    const response = await api.post<any>(`/quizzes/${quizId}/hide`);
    return normalizeQuiz(response.data);
  },

  async getSectionQuizzes(sectionId: string): Promise<Quiz[]> {
    const response = await api.get<any[]>(`/sections/${sectionId}/quizzes`);
    return normalizeQuizzes(response.data || []);
  },

  async getPublishedQuizzes(sectionId: string): Promise<Quiz[]> {
    const response = await api.get<any[]>(`/sections/${sectionId}/quizzes/published`);
    return normalizeQuizzes(response.data || []);
  },

  // Question operations
  async addQuestion(quizId: string, data: AddQuestionRequest): Promise<any> {
    const response = await api.post(`/quizzes/${quizId}/questions`, data);
    return response.data;
  },

  async updateQuestion(
    quizId: string,
    questionId: string,
    data: UpdateQuestionRequest
  ): Promise<void> {
    await api.patch(`/quizzes/${quizId}/questions/${questionId}`, data);
  },

  async deleteQuestion(quizId: string, questionId: string): Promise<void> {
    await api.delete(`/quizzes/${quizId}/questions/${questionId}`);
  },

  // Answer option operations
  async addAnswerOption(
    quizId: string,
    questionId: string,
    data: AddAnswerOptionRequest
  ): Promise<void> {
    await api.post(`/quizzes/${quizId}/questions/${questionId}/options`, data);
  },

  async updateAnswerOption(
    quizId: string,
    questionId: string,
    optionId: string,
    data: UpdateAnswerOptionRequest
  ): Promise<void> {
    await api.patch(
      `/quizzes/${quizId}/questions/${questionId}/options/${optionId}`,
      data
    );
  },

  async deleteAnswerOption(
    quizId: string,
    questionId: string,
    optionId: string
  ): Promise<void> {
    await api.delete(`/quizzes/${quizId}/questions/${questionId}/options/${optionId}`);
  },
};
