import { AttemptStatus } from "../../domain/value-objects/AttemptStatus";

// Có 3 loại response tương ứng 3 use case:
//
//   StartAttemptResponseDTO  — trả về sau khi start attempt thành công
//   FinalizeAttemptResponseDTO — trả về sau khi submit hoặc expire
//   AttemptResultDetailDTO    — dùng cho query "xem lại kết quả" (nếu cần sau)
//
// Tách riêng từng DTO thay vì dùng 1 DTO chung vì:
//   - Start: student cần biết expiresAt để chạy countdown, cần questions để render
//   - Submit/Expire: student cần biết score, percentage, chi tiết từng câu
//   - InProgress: không được trả về score vì chưa chấm, chỉ cần biết status = InProgress

// Start Attempt
// Thông tin 1 option để student render bài làm.
// isCorrect KHÔNG được trả về ở đây — student chưa được biết đáp án.
export interface AttemptOptionDTO {
  optionId: string;
  content:  string;
}

// Thông tin 1 question để student render bài làm.
export interface AttemptQuestionDTO {
  questionId:    string;
  content:       string;
  questionType:  string;    // "MultipleChoice"
  options:       AttemptOptionDTO[];
  points:        number;    // pointsPerQuestion — để student biết trọng số câu
}

// Trả về sau POST /quizzes/:quizId/attempts (start attempt thành công).
//
// expiresAt: thời điểm attempt tự hết hạn — frontend dùng để chạy countdown.
//   = startedAt + timeLimitMinutes * 60_000 ms
//
// questions: danh sách câu hỏi để render bài làm.
//   - Thứ tự giữ nguyên như trong quiz (không shuffle ở MVP).
//   - isCorrect của từng option KHÔNG được trả về.
export interface StartAttemptResponseDTO {
  attemptId:        string;
  quizId:           string;
  attemptNumber:    number;
  status:           AttemptStatus;    // luôn là "InProgress"
  startedAt:        string;           
  expiresAt:        string;           
  timeLimitMinutes: number;           // redundant nhưng tiện cho frontend
  questions:        AttemptQuestionDTO[];
  totalQuestions:   number;
  maxScore:         number;
}

// Finalize Attempt (Submit / Expire)
// Kết quả 1 câu trả lời — trả về sau khi finalize.
// Lúc này mới reveal isCorrect và correctOptionIds.
export interface AnswerResultDTO {
  questionId:        string;
  selectedOptionIds: string[];
  correctOptionIds:  string[];  // reveal đáp án đúng sau khi nộp
  isCorrect:         boolean;
  earnedPoints:      number;
  questionPoints:    number;    // pointsPerQuestion
}

// Trả về sau POST /attempts/:attemptId/submit
// hoặc      POST /attempts/:attemptId/expire
//
// score/maxScore/percentage luôn có — dù Submitted hay Expired đều đã chấm.
// answers: chi tiết từng câu — student xem ngay sau khi nộp.
// durationSeconds: thời gian làm bài tính bằng giây.
export interface FinalizeAttemptResponseDTO {
  attemptId:       string;
  quizId:          string;
  attemptNumber:   number;
  status:          AttemptStatus;    // "Submitted" hoặc "Expired"
  startedAt:       string;           // ISO 8601
  submittedAt:     string;           // ISO 8601
  durationSeconds: number;
  score:           number;
  maxScore:        number;
  percentage:      number;           // score / maxScore, làm tròn 2 chữ số
  answers:         AnswerResultDTO[];
  totalQuestions:  number;
  correctCount:    number;           // số câu đúng — tiện hiển thị "8/10"
}