import { IOracleAnalyticsRepository }       from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { StudentQuizResultView }             from "../../domain/read-models/StudentQuizResultView";
import { StudentQuizResultDTO, AttemptStatus } from "../dtos/StudentQuizResultDTO";

// Actor:   Student
// Permission: VIEW_OWN_RESULT
//
// Authorization by data:
//   studentId lấy từ JWT — compound query (studentId, sectionId/quizId)
//   đảm bảo Student chỉ thấy kết quả của mình.
//   Không cần verify enrollment: nếu không có data → [].
export class StudentQuizResultQuery {
  constructor(
    private readonly oracleRepo: IOracleAnalyticsRepository,
  ) {}

  // GET /analytics/sections/:sectionId/my-results
  // → StudentQuizResultDTO[]   (sắp xếp SUBMITTED_AT DESC từ Repository)
  async bySection(
    studentId: string,
    sectionId: string,
  ): Promise<StudentQuizResultDTO[]> {
    const views = await this.oracleRepo.findStudentResultsBySection(
      studentId,
      sectionId,
    );
    return views.map(this.toDTO);
  }

  // GET /analytics/quizzes/:quizId/my-results
  // → StudentQuizResultDTO[]   (sắp xếp ATTEMPT_NUMBER ASC từ Repository)
  async byQuiz(
    studentId: string,
    quizId:    string,
  ): Promise<StudentQuizResultDTO[]> {
    const views = await this.oracleRepo.findStudentResultsByQuiz(
      studentId,
      quizId,
    );
    return views.map(this.toDTO);
  }

  // private helpers
  // StudentQuizResultView (domain) → StudentQuizResultDTO (application)
  private toDTO(view: StudentQuizResultView): StudentQuizResultDTO {
    return {
      attemptId:       view.attemptId,
      quizId:          view.quizId,
      sectionId:       view.sectionId,
      quizTitle:       view.quizTitle,
      score:           view.score,
      maxScore:        view.maxScore,
      percentage:      view.percentage,
      startedAt:       view.startedAt.toISOString(),
      submittedAt:     view.submittedAt.toISOString(),
      durationSeconds: view.durationSeconds,
      attemptNumber:   view.attemptNumber,
      status:          view.status as AttemptStatus,
    };
  }
}