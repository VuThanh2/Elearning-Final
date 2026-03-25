// Public contract mà Quiz Attempt Context cần từ Quiz Context.
//
// Tương tự pattern IAcademicQueryService — Quiz Context sẽ
// export interface này qua index.ts, Attempt Context chỉ biết
// interface, không biết implementation bên trong.
//
// Tại sao cần interface riêng thay vì dùng thẳng Quiz entity:
//   - Quiz entity thuộc Quiz Context, không nên leak sang context khác
//   - Attempt Context chỉ cần một subset nhỏ data từ quiz
//   - DTO trả về chỉ chứa đúng những gì cần cho attempt lifecycle

// Data tối thiểu Attempt Context cần để start attempt
export interface QuizSnapshot {
  quizId: string;
  sectionId: string;
  status: string;             // "Published" | "Hidden" | "Expired" | "Draft"
  maxScore: number;
  maxAttempts: number;
  timeLimitMinutes: number;
  deadlineAt: Date;
  totalQuestions: number;
}

// Data cần để chấm điểm khi submit
export interface QuizGradingData {
  quizId: string;
  maxScore: number;
  timeLimitMs:       number;  // timeLimitMinutes * 60_000
  deadlineAt:        Date;
  questions: Array<{
    questionId: string;
    correctOptionIds: string[];
  }>;
  pointsPerQuestion: number;  // maxScore / totalQuestions
}

// QuizStudentViewData — dùng khi start attempt (render bài làm)
//
// Trả về questions với content + options để student render bài làm.
// isCorrect và correctOptionIds bị omit hoàn toàn — student chưa được
// biết đáp án trước khi nộp bài.
export interface StudentOptionView {
  optionId: string;
  content:  string;
}
 
export interface StudentQuestionView {
  questionId:   string;
  content:      string;
  questionType: string;  // "MultipleChoice"
  options:      StudentOptionView[];
}
 
export interface QuizStudentViewData {
  quizId:            string;
  questions:         StudentQuestionView[];
  pointsPerQuestion: number;
}

export interface IQuizQueryService {
  // Lấy snapshot quiz để validate trước khi start attempt
  // (check status, maxAttempts, deadline, timeLimit)
  getQuizSnapshot(quizId: string): Promise<QuizSnapshot | null>;

  // Lấy grading data để chấm điểm khi submit / expire
  // (danh sách question + correctOptionIds + pointsPerQuestion)
  getQuizGradingData(quizId: string): Promise<QuizGradingData | null>;

  // Render bài làm cho student sau khi start attempt
  // Trả về questions + options, KHÔNG có isCorrect/correctOptionIds
  getQuizQuestionsForStudent(quizId: string): Promise<QuizStudentViewData | null>;
}