import { IQuizRepository }        from "../../domain/interface-repositories/IQuizRepository";
import { IAcademicQueryService }  from "../../../academic/application/interfaces/IAcademicQueryService";
import { IDateTimeProvider }      from "../interfaces/IDateTimeProvider";
import { IEventPublisher }        from "../interfaces/IEventPublisher";
import { CreateQuizDTO }          from "../dtos/CreateQuizDTO";
import { QuizDetailDTO }          from "../dtos/QuizResponseDTO";
import { validateCreateQuiz }     from "../validators/QuizValidator";
import { Quiz }                   from "../../domain/entities/Quiz";
import { TimeLimit }              from "../../domain/value-objects/TimeLimit";
import { Deadline }               from "../../domain/value-objects/Deadline";
import { MaxAttempts }            from "../../domain/value-objects/MaxAttempts";
import { Points }                 from "../../domain/value-objects/Points";
import { QuizCreated }            from "../../domain/events/QuizCreated";
import { QuizMapper }             from "../../infrastructure/mappers/QuizMapper";

// Flow:
//   1. Validate format DTO
//   2. Verify sectionId tồn tại (Academic Context)
//   3. Verify Teacher được assign vào section (Academic Context)
//   4. Tạo Quiz entity (Draft)
//   5. Persist
//   6. Publish QuizCreated event
//   7. Trả về QuizDetailDTO
export class CreateQuizUseCase {
  constructor(
    private readonly quizRepository:   IQuizRepository,
    private readonly academicService:  IAcademicQueryService,
    private readonly dateTimeProvider: IDateTimeProvider,
    private readonly eventPublisher:   IEventPublisher,
  ) {}

  async execute(
    teacherId: string,
    dto: CreateQuizDTO
  ): Promise<QuizDetailDTO> {
    // Bước 1: validate format
    validateCreateQuiz(dto);

    // Bước 2: section có tồn tại không
    const sectionExists = await this.academicService.sectionExists(
      dto.sectionId
    );
    if (!sectionExists) {
      throw new Error(
        `NotFoundError: Section "${dto.sectionId}" không tồn tại.`
      );
    }

    // Bước 3: Teacher có được dạy section này không
    const isAssigned = await this.academicService.isTeacherAssignedToSection(
      teacherId,
      dto.sectionId
    );
    if (!isAssigned) {
      throw new Error(
        `AccessDeniedError: Bạn không có quyền tạo quiz cho section "${dto.sectionId}".`
      );
    }

    // Bước 4: tạo Quiz entity
    const now      = this.dateTimeProvider.now();
    const deadline = new Date(dto.deadlineAt);

    const quiz = Quiz.create({
      teacherId,
      sectionId:   dto.sectionId,
      title:       dto.title.trim(),
      description: dto.description?.trim() ?? "",
      timeLimit:   TimeLimit.create(dto.timeLimitMinutes),
      deadline:    Deadline.create(deadline, now),
      maxAttempts: MaxAttempts.create(dto.maxAttempts),
      maxScore:    Points.create(dto.maxScore),
    });

    // Bước 5: persist
    await this.quizRepository.save(quiz);

    // Bước 6: publish event
    await this.eventPublisher.publish(
      new QuizCreated(quiz.quizId, teacherId, quiz.sectionId, quiz.title)
    );

    // Bước 7: trả về DTO
    return QuizMapper.toDetailDTO(quiz);
  }
}