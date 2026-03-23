import { Quiz } from "../../domain/entities/Quiz";
import { Question } from "../../domain/entities/Question";
import { AnswerOption } from "../../domain/entities/AnswerOption";
import { QuizStatus, isValidQuizStatus } from "../../domain/value-objects/QuizStatus";
import { QuestionType, isValidQuestionType } from "../../domain/value-objects/QuestionType";
import { TimeLimit } from "../../domain/value-objects/TimeLimit";
import { Deadline } from "../../domain/value-objects/Deadline";
import { MaxAttempts } from "../../domain/value-objects/MaxAttempts";
import { Points } from "../../domain/value-objects/Points";
import {
  IQuizDocument,
  IQuestionDocument,
  IAnswerOptionDocument,
} from "../models/QuizModel";

// toDomain()      — IQuizDocument (raw MongoDB) → Quiz entity
// toPersistence() — Quiz entity → plain object để Mongoose save/upsert

// Lý do dùng fromPersisted() thay vì create() cho value objects:
//   Data từ DB đã được validate trước khi lưu — validate lại khi load
//   chỉ tốn CPU và có thể throw lỗi không cần thiết nếu business rule
//   thay đổi sau khi data đã tồn tại trong DB.

export class QuizMapper {

  //MongoDB document → Quiz aggregate (bao gồm Question + AnswerOption)
  static toDomain(doc: IQuizDocument): Quiz {
    // Guard: validate enum values từ DB trước khi cast —
    // tránh runtime error nếu DB có giá trị không hợp lệ
    if (!isValidQuizStatus(doc.status)) {
      throw new Error(
        `QuizMapper: unknown QuizStatus "${doc.status}" cho quizId "${doc._id}".`
      );
    }

    const questions = doc.questions.map((qDoc) =>
      QuizMapper.questionToDomain(qDoc, doc._id)
    );

    return new Quiz({
      quizId:       doc._id,
      teacherId:    doc.teacherId,
      sectionId:    doc.sectionId,
      title:        doc.title,
      description:  doc.description,
      timeLimit:    TimeLimit.fromPersisted(doc.timeLimitMinutes),
      deadline:     Deadline.fromPersisted(doc.deadlineAt),
      maxAttempts:  MaxAttempts.fromPersisted(doc.maxAttempts),
      maxScore:     Points.fromPersisted(doc.maxScore),
      status:       doc.status as QuizStatus,
      questions,
      createdAt:    doc.createdAt,
      hiddenReason: doc.hiddenReason ?? null,
      updatedAt:    doc.updatedAt ?? null,
    });
  }

  //Quiz entity → plain object cho Mongoose
  // Trả về plain object (không phải Mongoose Document) vì Repository
  // dùng replaceOne/upsert — Mongoose nhận plain object là đủ.
  static toPersistence(quiz: Quiz): IQuizDocument {
    return {
      _id:              quiz.quizId,
      teacherId:        quiz.teacherId,
      sectionId:        quiz.sectionId,
      title:            quiz.title,
      description:      quiz.description,
      timeLimitMinutes: quiz.timeLimit.minutes,
      deadlineAt:       quiz.deadline.value,
      maxAttempts:      quiz.maxAttempts.value,
      maxScore:         quiz.maxScore.value,
      status:           quiz.status,
      questions:        [...quiz.questions].map(QuizMapper.questionToPersistence),
      hiddenReason:     quiz.hiddenReason,
      createdAt:        quiz.createdAt,
      updatedAt:        quiz.updatedAt,
    } as IQuizDocument;
  }

  // Private helpers — Question và AnswerOption
  private static questionToDomain(
    doc: IQuestionDocument,
    quizId: string
  ): Question {
    if (!isValidQuestionType(doc.questionType)) {
      throw new Error(
        `QuizMapper: unknown QuestionType "${doc.questionType}" cho questionId "${doc.questionId}".`
      );
    }

    const answerOptions = doc.answerOptions.map((oDoc) =>
      QuizMapper.answerOptionToDomain(oDoc, doc.questionId)
    );

    return new Question({
      questionId:    doc.questionId,
      quizId,
      content:       doc.content,
      questionType:  doc.questionType as QuestionType,
      answerOptions,
    });
  }

  private static questionToPersistence(
    question: Question
  ): IQuestionDocument {
    return {
      questionId:    question.questionId,
      content:       question.content,
      questionType:  question.questionType,
      answerOptions: [...question.answerOptions].map(
        QuizMapper.answerOptionToPersistence
      ),
    };
  }

  private static answerOptionToDomain(
    doc: IAnswerOptionDocument,
    questionId: string
  ): AnswerOption {
    return new AnswerOption({
      optionId:   doc.optionId,
      questionId,
      content:    doc.content,
      isCorrect:  doc.isCorrect,
    });
  }

  private static answerOptionToPersistence(
    option: AnswerOption
  ): IAnswerOptionDocument {
    return {
      optionId:  option.optionId,
      content:   option.content,
      isCorrect: option.isCorrect,
    };
  }
}