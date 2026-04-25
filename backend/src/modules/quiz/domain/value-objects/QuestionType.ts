// Hệ thống hỗ trợ:
//   SINGLE_CHOICE — trắc nghiệm, 1 câu trả lời, phải có >= 2 AnswerOption
//   MULTIPLE_CHOICE — trắc nghiệm, nhiều câu trả lời, phải có >= 2 AnswerOption
//
// CODING được dự kiến nhưng chưa xác định spec chấm điểm
// → để trong enum nhưng chưa enable ở business rule

export enum QuestionType {
  SINGLE_CHOICE = "SINGLE_CHOICE",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
}

export function isValidQuestionType(value: string): value is QuestionType {
  return Object.values(QuestionType).includes(value as QuestionType);
}