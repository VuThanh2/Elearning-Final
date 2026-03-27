import { IQuizRepository }    from "../../domain/interface-repositories/IQuizRepository";
import {
  IQuizQueryService,
  QuizSnapshot,
  QuizGradingData,
  QuizStudentViewData,
  StudentQuestionView,
  StudentOptionView,
} from "../interfaces/IQuizQueryService";

// Service nội bộ của Quiz Context — chỉ được export ra ngoài qua index.ts.
// Module khác (Quiz Attempt Context) chỉ biết IQuizQueryService (interface)
//
// Hai methods tương ứng với 2 giai đoạn của attempt lifecycle:
//   - getQuizSnapshot()    → validate trước khi start attempt
//   - getQuizQuestionsForStudent() → render bài làm sau khi start
//   - getQuizGradingData() → chấm điểm khi submit / expire

export class QuizQueryService implements IQuizQueryService {
  constructor(
    private readonly quizRepository: IQuizRepository,
  ) {}

  // Lấy thông tin tối thiểu để Quiz Attempt Context validate
  // trước khi tạo attempt mới:
  //   - status = Published?
  //   - deadline chưa qua?
  //   - student chưa vượt maxAttempts?
  //   - sectionId để cross-check enrollment
  //
  // Trả về null nếu quiz không tồn tại — caller (StartAttemptUseCase)
  // sẽ throw NotFoundError phù hợp.
  async getQuizSnapshot(quizId: string): Promise<QuizSnapshot | null> {
    const quiz = await this.quizRepository.findById(quizId);

    if (!quiz) return null;

    return {
      quizId:           quiz.quizId,
      sectionId:        quiz.sectionId,
      status:           quiz.status,                 // QuizStatus enum value (string)
      maxScore:         quiz.maxScore.value,
      maxAttempts:      quiz.maxAttempts.value,
      timeLimitMinutes: quiz.timeLimit.minutes,
      deadlineAt:       quiz.deadline.value,         // Date object
      totalQuestions:   quiz.questions.length,
      quizTitle:        quiz.title,
    };
  }

  // Render bài làm cho student sau khi start attempt.
  //
  // Trả về questions + options với content đầy đủ.
  // isCorrect bị omit hoàn toàn — anti-corruption layer:
  // Quiz Context tự lọc trước khi expose ra ngoài.
  async getQuizQuestionsForStudent(quizId: string): Promise<QuizStudentViewData | null> {
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) return null;
 
    const questions      = [...quiz.questions];
    const totalQuestions = questions.length;
    if (totalQuestions === 0) return null;
 
    const pointsPerQuestion = quiz.maxScore.value / totalQuestions;
 
    const studentQuestions: StudentQuestionView[] = questions.map((q) => {
      const options: StudentOptionView[] = [...q.answerOptions].map((opt) => ({
        optionId: opt.optionId,
        content:  opt.content,
        // isCorrect bị omit — không leak đáp án đúng trước khi nộp bài
      }));
 
      return {
        questionId:   q.questionId,
        content:      q.content,
        questionType: q.questionType,
        options,
      };
    });
 
    return {
      quizId,
      questions:         studentQuestions,
      pointsPerQuestion,
    };
  }

  // Lấy đáp án đúng + điểm mỗi câu để chấm điểm khi student submit/expire.
  //
  // pointsPerQuestion = maxScore / totalQuestions:
  //   - Hệ thống phân bổ điểm đều (System-Controlled Points Distribution)
  //   - Nếu quiz không có câu hỏi → trả về null (không thể chấm)
  //     thực tế không xảy ra vì PublishQuizUseCase enforce ít nhất 1 câu hỏi
  //
  // Chỉ expose correctOptionIds, không expose toàn bộ AnswerOption —
  // tránh leak thông tin nội bộ không cần thiết sang context khác.
  async getQuizGradingData(quizId: string): Promise<QuizGradingData | null> {
    const quiz = await this.quizRepository.findById(quizId);

    if (!quiz) return null;

    const questions = [...quiz.questions];
    const totalQuestions = questions.length;

    // Guard: quiz không có câu hỏi → không thể tính điểm
    if (totalQuestions === 0) return null;

    const pointsPerQuestion = quiz.maxScore.value / totalQuestions;

    return {
      quizId:           quiz.quizId,
      maxScore:         quiz.maxScore.value,
      timeLimitMs:       quiz.timeLimit.minutes * 60_000,
      deadlineAt:        quiz.deadline.value,
      questions:        questions.map((q) => ({
        questionId:       q.questionId,
        correctOptionIds: [...q.correctOptions].map((opt) => opt.optionId),
      })),
      pointsPerQuestion,
    };
  }
}