import { QuestionFailureRateView, QuestionFailureStat } from "../../../../domain/read-models/QuestionFailureRateView";
import { IQuestionFailureRateDocument, IQuestionFailureStatDocument } from "../models/QuestionFailureRateModel";

// Có toDomain() và toPersistence() — lý do giống StudentQuizAnswerMapper.
//
// Điểm khác biệt so với StudentQuizAnswerMapper:
//   - Document _id là compound string "{quizId}_{sectionId}", không phải attemptId.
//   - toPersistence() build document để replaceOne upsert — toàn bộ document
//     được replace, không dùng $inc. Projector tự recalculate stats từ
//     processedAttemptIds trước khi gọi toPersistence().
//   - processedAttemptIds không map vào domain view (là infrastructure concern thuần).
export class QuestionFailureRateMapper {
 
  // MongoDB document → QuestionFailureRateView
  static toDomain(doc: IQuestionFailureRateDocument): QuestionFailureRateView {
    return {
      quizId:                 doc.quizId,
      sectionId:              doc.sectionId,
      quizTitle:              doc.quizTitle,
      sectionName:            doc.sectionName,
      totalSubmittedAttempts: doc.totalSubmittedAttempts,
      lastUpdatedAt:          doc.lastUpdatedAt,
      questions:              doc.questions.map(QuestionFailureRateMapper.statToDomain),
      // processedAttemptIds bị drop — không thuộc domain view
    };
  }
 
  static toDomainList(docs: IQuestionFailureRateDocument[]): QuestionFailureRateView[] {
    return docs.map(QuestionFailureRateMapper.toDomain);
  }
 
  private static statToDomain(sub: IQuestionFailureStatDocument): QuestionFailureStat {
    // Tính lại failureRate từ raw counts để tránh NaN nếu DB bị corrupt
    const safeFailureRate = sub.totalQuestionAttempts > 0
      ? sub.wrongAnswers / sub.totalQuestionAttempts
      : 0;
 
    return {
      questionId:                     sub.questionId,
      questionContent:                sub.questionContent,
      totalQuestionAttempts:          sub.totalQuestionAttempts,
      correctAnswers:                 sub.correctAnswers,
      wrongAnswers:                   sub.wrongAnswers,
      unansweredCount:                sub.unansweredCount,
      failureRate:                    Math.round(safeFailureRate * 10000) / 10000,
      mostSelectedWrongOptionId:      sub.mostSelectedWrongOptionId ?? null,
      mostSelectedWrongOptionContent: sub.mostSelectedWrongOptionContent ?? null,
    };
  }
}