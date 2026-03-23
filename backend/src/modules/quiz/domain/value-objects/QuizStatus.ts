// State machine hợp lệ:
//   Draft      → Published
//   Published  → Hidden
//   Published  → Expired  (system only, qua background job)
//   Hidden     → Published
//   Hidden     → Expired  (system only)
//   Expired    → (terminal, không thể chuyển)

export enum QuizStatus {
  DRAFT     = "Draft",
  PUBLISHED = "Published",
  HIDDEN    = "Hidden",
  EXPIRED   = "Expired",
}

export function isValidQuizStatus(value: string): value is QuizStatus {
  return Object.values(QuizStatus).includes(value as QuizStatus);
}