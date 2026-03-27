// Tách riêng với IAnalyticsOracleRepository — Interface Segregation Principle:
//   - MongoDB thay đổi độc lập với Oracle (schema document vs schema bảng).
//   - Query Service chỉ inject đúng interface nó cần.
//   - Mock riêng khi test MongoDB path mà không kéo theo Oracle.
//
// Các Read Model MongoDB (2 views — dữ liệu nested, aggregation pipeline):
//
//   StudentQuizAnswerView     → collection: analytics_student_quiz_answers
//     1 document = 1 attempt, embedded answers[]
//     Lý do MongoDB: answers là mảng nested — Oracle sẽ phải unwind thành nhiều row,
//     mất đi tính locality và tốn JOIN. MongoDB trả về 1 document là đủ.
//
//   QuestionFailureRateView   → collection: analytics_question_failure_rate
//     1 document = 1 quiz × 1 section, embedded questions[]
//     Lý do MongoDB: cần $unwind answers → $group by questionId — đây là
//     native MongoDB aggregation pipeline, không hiệu quả nếu làm ở Oracle.
import { StudentQuizAnswerView }  from "../read-models/StudentQuizAnswerView";
import { QuestionFailureRateView } from "../read-models/QuestionFailureRateView";

export interface IMongoAnalyticsRepository {

  // StudentQuizAnswerView — Actor: Student

  // Lấy chi tiết từng câu trả lời của 1 attempt cụ thể.
  // Dùng bởi: Student xem lại bài làm sau khi nộp (answer review screen).
  // Trả về null nếu view chưa được populate (event chưa xử lý xong — eventually consistent).
  findAnswerViewByAttempt(
    attemptId: string,
  ): Promise<StudentQuizAnswerView | null>;

  // Lấy tất cả answer views của 1 student cho 1 quiz (nhiều attempt).
  // Dùng bởi: Student xem lịch sử từng lần làm bài với đáp án chi tiết.
  // Sắp xếp theo attemptNumber tăng dần.
  findAnswerViewsByStudentAndQuiz(
    studentId: string,
    quizId:    string,
  ): Promise<StudentQuizAnswerView[]>;

  // QuestionFailureRateView — Actor: Teacher

  // Lấy failure rate của tất cả câu hỏi trong 1 quiz × 1 section.
  // Dùng bởi: Teacher xem Question Analytics dashboard.
  //
  // Trả về null nếu quiz chưa có attempt submitted nào trong section.
  // Nếu có view nhưng totalSubmittedAttempts < ngưỡng tối thiểu (ví dụ 5),
  //   → trả về view bình thường, Query Service tự gắn cảnh báo "dữ liệu chưa đủ".
  findQuestionFailureRate(
    quizId:    string,
    sectionId: string,
  ): Promise<QuestionFailureRateView | null>;
}