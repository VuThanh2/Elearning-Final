import { IMongoAnalyticsRepository }      from  "../../../../domain/interface-repositories/IMongoAnalyticsRepository";
import { StudentQuizAnswerView }           from "../../../../domain/read-models/StudentQuizAnswerView";
import { QuestionFailureRateView }         from "../../../../domain/read-models/QuestionFailureRateView";

import { StudentQuizAnswerModel, IStudentQuizAnswerDocument }  from "../models/StudentQuizAnswerModel";
import { QuestionFailureRateModel, IQuestionFailureRateDocument }  from "../models/QuestionFailureRateModel";

import { StudentQuizAnswerMapper }         from "../mappers/StudentQuizAnswerMapper";
import { QuestionFailureRateMapper }       from "../mappers/QuestionFailureRateMapper";

// Chỉ file này trong toàn bộ Analytics Context được phép query
// vào các MongoDB collections analytics_*.
//
//   - Nhận Mongoose Model qua constructor (DI) — dễ mock khi test
//   - Tất cả query dùng .lean() — nhận plain object, bỏ qua Mongoose overhead
//   - Gọi Mapper sau khi nhận document — Repository không tự map
//
// Không có insert / update — Analytics Repository là read-only.
export class MongoAnalyticsRepository implements IMongoAnalyticsRepository {
  constructor(
    // Nhận Model qua constructor để dễ mock khi test
    private readonly studentQuizAnswerModel:   typeof StudentQuizAnswerModel,
    private readonly questionFailureRateModel: typeof QuestionFailureRateModel,
  ) {}

  // StudentQuizAnswerView
  async findAnswerViewByAttempt(
    attemptId: string,
  ): Promise<StudentQuizAnswerView | null> {
    console.log('[MongoAnalyticsRepository.findAnswerViewByAttempt] ENTRY: attemptId=', attemptId);
    // _id = attemptId — findById() dùng _id index mặc định của MongoDB
    const doc = await this.studentQuizAnswerModel
      .findById(attemptId)
      .lean<IStudentQuizAnswerDocument>()
      .exec();

    console.log('[MongoAnalyticsRepository.findAnswerViewByAttempt] Found document:', !!doc);
    if (doc) {
      console.log('[MongoAnalyticsRepository.findAnswerViewByAttempt] Document keys:', Object.keys(doc));
      console.log('[MongoAnalyticsRepository.findAnswerViewByAttempt] Document answers count:', (doc as any).answers?.length);
      console.log('[MongoAnalyticsRepository.findAnswerViewByAttempt] First answer:', (doc as any).answers?.[0]);
    }

    if (!doc) return null;

    const view = StudentQuizAnswerMapper.toDomain(doc);
    console.log('[MongoAnalyticsRepository.findAnswerViewByAttempt] Mapped to domain view:', {
      attemptId: view.attemptId,
      answersCount: view.answers?.length,
      totalScore: view.totalScore,
      maxScore: view.maxScore,
    });
    return view;
  }

  async findAnswerViewsByStudentAndQuiz(
    studentId: string,
    quizId:    string,
  ): Promise<StudentQuizAnswerView[]> {
    // Dùng compound index { studentId: 1, quizId: 1 }
    // Sắp xếp theo attemptNumber ASC — Student xem lịch sử từ lần 1 → lần N
    const docs = await this.studentQuizAnswerModel
      .find({ studentId, quizId })
      .sort({ attemptNumber: 1 })
      .lean<IStudentQuizAnswerDocument[]>()
      .exec();

    return StudentQuizAnswerMapper.toDomainList(docs);
  }

  // QuestionFailureRateView 
  async findQuestionFailureRate(
    quizId:    string,
    sectionId: string,
  ): Promise<QuestionFailureRateView | null> {
    // _id = "{quizId}_{sectionId}" — findById() để tận dụng _id index
    const docId = `${quizId}_${sectionId}`;

    const doc = await this.questionFailureRateModel
      .findById(docId)
      .lean<IQuestionFailureRateDocument>()
      .exec();

    if (!doc) return null;

    return QuestionFailureRateMapper.toDomain(doc);
  }
}