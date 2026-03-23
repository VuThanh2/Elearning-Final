import { QuizStatus } from "../../domain/value-objects/QuizStatus";
import { QuestionType } from "../../domain/value-objects/QuestionType";

// Response DTO interfaces — shape của HTTP response body

export interface AnswerOptionResponseDTO {
  optionId:  string;
  content:   string;
  isCorrect: boolean;
}

export interface QuestionResponseDTO {
  questionId:    string;
  content:       string;
  questionType:  QuestionType;
  answerOptions: AnswerOptionResponseDTO[];
  points:        number;  // hệ thống tự chia đều: maxScore / totalQuestions
}

//GET /quizzes/:id
// Teacher xem chi tiết quiz, bao gồm toàn bộ questions + options
export interface QuizDetailDTO {
  quizId:           string;
  teacherId:        string;
  sectionId:        string;
  title:            string;
  description:      string;
  timeLimitMinutes: number;
  deadlineAt:       string;        // ISO 8601
  maxAttempts:      number;
  maxScore:         number;
  questionPoints:   number;        // maxScore / totalQuestions
  status:           QuizStatus;
  hiddenReason:     string | null;
  questions:        QuestionResponseDTO[];
  totalQuestions:   number;
  createdAt:        string;        // ISO 8601
  updatedAt:        string | null;
}

//GET /quizzes (danh sách)
// Không bao gồm questions để giảm payload
export interface QuizSummaryDTO {
  quizId:           string;
  sectionId:        string;
  title:            string;
  description:      string;
  timeLimitMinutes: number;
  deadlineAt:       string;
  maxAttempts:      number;
  maxScore:         number;
  status:           QuizStatus;
  totalQuestions:   number;
  createdAt:        string;
  updatedAt:        string | null;
}