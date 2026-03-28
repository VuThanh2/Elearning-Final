import { Quiz } from "../../domain/entities/Quiz";
import { Question } from "../../domain/entities/Question";
import { AnswerOption } from "../../domain/entities/AnswerOption";
import { QuizStatus, isValidQuizStatus } from "../../domain/value-objects/QuizStatus";
import { QuestionType, isValidQuestionType } from "../../domain/value-objects/QuestionType";
import { TimeLimit } from "../../domain/value-objects/TimeLimit";
import { Deadline } from "../../domain/value-objects/Deadline";
import { MaxAttempts } from "../../domain/value-objects/MaxAttempts";
import { Points } from "../../domain/value-objects/Points";
import { IQuizDocument, IQuestionDocument, IAnswerOptionDocument } from "../models/QuizModel";
import { AnswerOptionResponseDTO, QuestionResponseDTO, QuizDetailDTO, QuizSummaryDTO, PublishedQuizSummaryDTO } from "../../application/dtos/QuizResponseDTO";

// 3 nhóm methods:
//   toDomain()        — IQuizDocument (MongoDB) → Quiz entity
//   toPersistence()   — Quiz entity → plain object cho Mongoose upsert
//   toDetailDTO()     — Quiz entity → QuizDetailDTO (HTTP response, có questions)
//   toSummaryDTO()    — Quiz entity → QuizSummaryDTO (HTTP response, không có questions)

export class QuizMapper {

  //MongoDB document → Quiz aggregate
  static toDomain(doc: IQuizDocument): Quiz {
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

  //Quiz entity → plain object cho Mongoose replaceOne/upsert
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

  //Quiz entity → QuizDetailDTO
  // Dùng cho: GET /quizzes/:id
  // Bao gồm toàn bộ questions + options + điểm mỗi câu
  static toDetailDTO(quiz: Quiz): QuizDetailDTO {
    const questionPoints = quiz.questionPoints;

    return {
      quizId:           quiz.quizId,
      teacherId:        quiz.teacherId,
      sectionId:        quiz.sectionId,
      title:            quiz.title,
      description:      quiz.description,
      timeLimitMinutes: quiz.timeLimit.minutes,
      deadlineAt:       quiz.deadline.value.toISOString(),
      maxAttempts:      quiz.maxAttempts.value,
      maxScore:         quiz.maxScore.value,
      questionPoints,
      status:           quiz.status,
      hiddenReason:     quiz.hiddenReason,
      questions:        [...quiz.questions].map((q) =>
                          QuizMapper.questionToResponseDTO(q, questionPoints)
                        ),
      totalQuestions:   quiz.questions.length,
      createdAt:        quiz.createdAt.toISOString(),
      updatedAt:        quiz.updatedAt?.toISOString() ?? null,
    };
  }

  //Quiz entity → QuizSummaryDTO
  // Dùng cho: GET /quizzes (danh sách)
  // Không bao gồm questions để giảm payload
  static toSummaryDTO(quiz: Quiz): QuizSummaryDTO {
    return {
      quizId:           quiz.quizId,
      sectionId:        quiz.sectionId,
      title:            quiz.title,
      description:      quiz.description,
      timeLimitMinutes: quiz.timeLimit.minutes,
      deadlineAt:       quiz.deadline.value.toISOString(),
      maxAttempts:      quiz.maxAttempts.value,
      maxScore:         quiz.maxScore.value,
      status:           quiz.status,
      totalQuestions:   quiz.questions.length,
      createdAt:        quiz.createdAt.toISOString(),
      updatedAt:        quiz.updatedAt?.toISOString() ?? null,
    };
  }

  // Quiz entity → PublishedQuizSummaryDTO
  // Dành cho: GET /sections/:sectionId/quizzes/published (Student)
  static toPublishedSummaryDTO(quiz: Quiz): PublishedQuizSummaryDTO {
    return {
      quizId:           quiz.quizId,
      sectionId:        quiz.sectionId,
      title:            quiz.title,
      description:      quiz.description,
      timeLimitMinutes: quiz.timeLimit.minutes,
      deadlineAt:       quiz.deadline.value.toISOString(),
      maxAttempts:      quiz.maxAttempts.value,
      maxScore:         quiz.maxScore.value,
      totalQuestions:   quiz.questions.length,
      createdAt:        quiz.createdAt.toISOString(),
    };
  }

  // Private helpers
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

  private static questionToPersistence(question: Question): IQuestionDocument {
    return {
      questionId:    question.questionId,
      content:       question.content,
      questionType:  question.questionType,
      answerOptions: [...question.answerOptions].map(
        QuizMapper.answerOptionToPersistence
      ),
    };
  }

  private static questionToResponseDTO(
    question: Question,
    questionPoints: number
  ): QuestionResponseDTO {
    return {
      questionId:    question.questionId,
      content:       question.content,
      questionType:  question.questionType,
      answerOptions: [...question.answerOptions].map(
        QuizMapper.answerOptionToResponseDTO
      ),
      points: questionPoints,
    };
  }

  private static answerOptionToDomain(
    doc: IAnswerOptionDocument,
    questionId: string
  ): AnswerOption {
    return new AnswerOption({
      optionId:  doc.optionId,
      questionId,
      content:   doc.content,
      isCorrect: doc.isCorrect,
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

  private static answerOptionToResponseDTO(
    option: AnswerOption
  ): AnswerOptionResponseDTO {
    return {
      optionId:  option.optionId,
      content:   option.content,
      isCorrect: option.isCorrect,
    };
  }
}