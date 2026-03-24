// State machine hợp lệ:
//   InProgress → Submitted   (student nộp bài)
//   InProgress → Expired     (hết thời gian, system auto-submit)
//   Submitted  → (terminal)
//   Expired    → (terminal)

export enum AttemptStatus {
  IN_PROGRESS = "InProgress",
  SUBMITTED   = "Submitted",
  EXPIRED     = "Expired",
}

export function isValidAttemptStatus(value: string): value is AttemptStatus {
  return Object.values(AttemptStatus).includes(value as AttemptStatus);
}