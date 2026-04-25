import { Quiz, Question, AnswerOption, QuizStatus } from '../types';

/**
 * Normalize backend quiz response to frontend Quiz type
 * Backend returns quizId, questionId, optionId
 * Frontend also accepts id, but uses quizId for consistency with backend
 */
export function normalizeQuiz(data: any): Quiz {
  const quizSource = data?.quiz ?? data;
  const questionsSource =
    quizSource?.questions ??
    quizSource?.questionList ??
    quizSource?.items ??
    [];

  const quizId = quizSource.quizId || quizSource.id || '';
  const title = quizSource.title || 'Untitled quiz';
  const status = String(quizSource.status || 'DRAFT').toUpperCase() as QuizStatus;
  const totalQuestions = Number.isFinite(Number(quizSource.totalQuestions))
    ? Number(quizSource.totalQuestions)
    : Array.isArray(questionsSource)
      ? questionsSource.length
      : 0;
  const maxScore = Number.isFinite(Number(quizSource.maxScore)) ? Number(quizSource.maxScore) : 0;
  const questionPoints = Number.isFinite(Number(quizSource.questionPoints))
    ? Number(quizSource.questionPoints)
    : totalQuestions > 0
      ? maxScore / totalQuestions
      : 0;

  return {
    id: quizId,
    quizId,
    teacherId: quizSource.teacherId || '',
    sectionId: quizSource.sectionId || '',
    title,
    description: quizSource.description || '',
    timeLimitMinutes: Number.isFinite(Number(quizSource.timeLimitMinutes)) ? Number(quizSource.timeLimitMinutes) : 0,
    deadlineAt: quizSource.deadlineAt || '',
    maxAttempts: Number.isFinite(Number(quizSource.maxAttempts)) ? Number(quizSource.maxAttempts) : 1,
    maxScore,
    status,
    createdAt: quizSource.createdAt,
    updatedAt: quizSource.updatedAt,
    hiddenReason: quizSource.hiddenReason,
    totalQuestions,
    questionPoints,
    questions: Array.isArray(questionsSource)
      ? questionsSource.map(normalizeQuestion)
      : [],
  };
}

export function normalizeQuestion(data: any): Question {
  const questionSource = data?.question ?? data;
  const optionsSource =
    questionSource?.answerOptions ??
    questionSource?.options ??
    questionSource?.answers ??
    [];

  return {
    id: questionSource.questionId || questionSource.id,
    questionId: questionSource.questionId || questionSource.id,
    content: questionSource.content ?? questionSource.questionContent ?? questionSource.text,
    questionType: questionSource.questionType ?? questionSource.type,
    points: questionSource.points,
    answerOptions: Array.isArray(optionsSource)
      ? optionsSource.map(normalizeAnswerOption)
      : [],
  };
}

export function normalizeAnswerOption(data: any): AnswerOption {
  const optionSource = data?.option ?? data;
  return {
    id: optionSource.optionId || optionSource.id,
    optionId: optionSource.optionId || optionSource.id,
    content: optionSource.content ?? optionSource.text ?? optionSource.label,
    isCorrect: optionSource.isCorrect,
  };
}

export function normalizeQuizzes(quizzes: any[]): Quiz[] {
  return quizzes.map(normalizeQuiz);
}
