// Hiện tại hệ thống hỗ trợ:
//   MULTIPLE_CHOICE — trắc nghiệm, phải có >= 2 AnswerOption
//
// CODING được dự kiến nhưng chưa xác định spec chấm điểm
// → để trong enum nhưng chưa enable ở business rule

export enum QuestionType {
  MULTIPLE_CHOICE = "MultipleChoice",
}

export function isValidQuestionType(value: string): value is QuestionType {
  return Object.values(QuestionType).includes(value as QuestionType);
}