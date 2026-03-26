import { QuizAttempt } from "../../domain/entities/QuizAttempt";
import { StudentAnswer } from "../../domain/entities/StudentAnswer";
import { AttemptStatus, isValidAttemptStatus } from "../../domain/value-objects/AttemptStatus";
import { AttemptNumber } from "../../domain/value-objects/AttemptNumber";
import { Score } from "../../domain/value-objects/Score";
import { SelectedOptions } from "../../domain/value-objects/SelectedOptions";
import { IQuizAttemptDocument, IStudentAnswerDocument } from "../models/QuizAttemptModel";

// 2 nhóm methods:
//   toDomain()       — IQuizAttemptDocument (MongoDB) → QuizAttempt entity
//   toPersistence()  — QuizAttempt entity → plain object cho Mongoose upsert

// DTO mapping không nằm ở đây mà ở Use Case hoặc Controller —
// vì DTO shape phụ thuộc vào từng use case cụ thể
// (ví dụ: start attempt trả về ít field hơn submit attempt).
export class QuizAttemptMapper {

  // MongoDB document → QuizAttempt aggregate 
  static toDomain(doc: IQuizAttemptDocument): QuizAttempt {
    if (!isValidAttemptStatus(doc.status)) {
      throw new Error(
        `QuizAttemptMapper: unknown AttemptStatus "${doc.status}" cho attemptId "${doc._id}".`
      );
    }

    const answers = doc.answers.map(QuizAttemptMapper.answerToDomain);

    return new QuizAttempt({
      attemptId:     doc._id,
      quizId:        doc.quizId,
      studentId:     doc.studentId,
      sectionId:     doc.sectionId,
      attemptNumber: AttemptNumber.fromPersisted(doc.attemptNumber),
      status:        doc.status as AttemptStatus,
      startedAt:     doc.startedAt,
      submittedAt:   doc.submittedAt ?? null,
      score:         doc.submittedAt
                       ? Score.fromPersisted(doc.score, doc.maxScore)
                       : Score.zero(doc.maxScore), //đang InProgress nên tạm tạo Score với value=0
      answers,
    });
  }

  // QuizAttempt entity → plain object cho Mongoose
  static toPersistence(attempt: QuizAttempt, expiresAt: Date): IQuizAttemptDocument {
    return {
      _id:           attempt.attemptId,
      quizId:        attempt.quizId,
      studentId:     attempt.studentId,
      sectionId:     attempt.sectionId,
      attemptNumber: attempt.attemptNumber.value,
      status:        attempt.status,
      startedAt:     attempt.startedAt,
      submittedAt:   attempt.submittedAt,
      expiresAt,
      score:         attempt.score.value,
      maxScore:      attempt.score.maxScore,
      answers:       [...attempt.answers].map(QuizAttemptMapper.answerToPersistence),
    } as IQuizAttemptDocument;
  }

  // "Data cần $set khi một attempt kết thúc (submit hoặc expire)"
  static toFinalizedUpdate(attempt: QuizAttempt): {
    status:      AttemptStatus;
    submittedAt: Date | null;
    score:       number;
    answers:     IStudentAnswerDocument[];
  } {
    return {
      status:      attempt.status,
      submittedAt: attempt.submittedAt,
      score:       attempt.score.value,
      answers:     [...attempt.answers].map(QuizAttemptMapper.answerToPersistence),
    };
  }

  // Private helpers 
  private static answerToDomain(doc: IStudentAnswerDocument): StudentAnswer {
    return new StudentAnswer({
      answerId:        doc.answerId,
      questionId:      doc.questionId,
      selectedOptions: SelectedOptions.fromPersisted(doc.selectedOptionIds),
      isCorrect:       doc.isCorrect,
      earnedPoints:    doc.earnedPoints,
    });
  }

  private static answerToPersistence(answer: StudentAnswer): IStudentAnswerDocument {
    return {
      answerId:          answer.answerId,
      questionId:        answer.questionId,
      selectedOptionIds: [...answer.selectedOptions.optionIds],
      isCorrect:         answer.isCorrect,
      earnedPoints:      answer.earnedPoints,
    };
  }
}