import { StudentQuizAnswerView, StudentAnswerDetail } from "../../../../domain/read-models/StudentQuizAnswerView";
import { IStudentQuizAnswerDocument, IStudentAnswerDetailDocument } from "../models/StudentQuizAnswerModel";

// Chỉ có toDomain() và toPersistence().
//
// Tại sao NoSQL mapper CÓ toPersistence() khác với SQL mapper?
//   SQL write path: Projector ghi trực tiếp vào Oracle bằng bind variables —
//     không cần map qua type trung gian.
//   MongoDB write path: Projector dùng replaceOne({ _id }, doc, { upsert: true }) —
//     cần build đúng document shape cho Mongoose. toPersistence() làm việc này,
//     giúp Projector không tự build document thủ công (tránh typo field name).
//
// STATUS: MongoDB lưu string — guard tương tự SQL mapper.
//
// Lưu ý lean(): Repository dùng .lean() nên doc là plain object, không phải
//   Mongoose Document đầy đủ. IStudentQuizAnswerDocument vẫn là type đúng
//   vì lean() trả về shape giống hệt Document interface nhưng không có methods.
const VALID_STATUSES = new Set<string>(["SUBMITTED", "EXPIRED"]);
 
export class StudentQuizAnswerMapper {
 
  // MongoDB document → StudentQuizAnswerView
  static toDomain(doc: IStudentQuizAnswerDocument): StudentQuizAnswerView {
    if (!VALID_STATUSES.has(doc.status)) {
      throw new Error(
        `StudentQuizAnswerMapper: status không hợp lệ "${doc.status}" ` +
        `cho attemptId "${doc._id}". Dữ liệu DB có thể bị corrupt.`
      );
    }
 
    return {
      attemptId:     doc._id,
      quizId:        doc.quizId,
      studentId:     doc.studentId,
      sectionId:     doc.sectionId,
      totalScore:    doc.totalScore,
      maxScore:      doc.maxScore,
      submittedAt:   doc.submittedAt,
      attemptNumber: doc.attemptNumber,
      status:        doc.status as "SUBMITTED" | "EXPIRED",
      answers:       doc.answers.map(StudentQuizAnswerMapper.answerDetailToDomain),
    };
  }
 
  static toDomainList(docs: IStudentQuizAnswerDocument[]): StudentQuizAnswerView[] {
    return docs.map(StudentQuizAnswerMapper.toDomain);
  }
 
  private static answerDetailToDomain(
    sub: IStudentAnswerDetailDocument,
  ): StudentAnswerDetail {
    return {
      questionId:             sub.questionId,
      questionContent:        sub.questionContent,
      selectedOptionIds:      sub.selectedOptionIds,
      selectedOptionContents: sub.selectedOptionContents,
      correctOptionIds:       sub.correctOptionIds,
      correctOptionContents:  sub.correctOptionContents,
      isCorrect:              sub.isCorrect,
      earnedPoints:           sub.earnedPoints,
      questionPoints:         sub.questionPoints,
    };
  }
}