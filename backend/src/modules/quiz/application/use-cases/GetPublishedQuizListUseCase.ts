import { IQuizRepository }          from "../../domain/interface-repositories/IQuizRepository";
import { PublishedQuizSummaryDTO }   from "../dtos/QuizResponseDTO";
import { QuizMapper }                from "../../infrastructure/mappers/QuizMapper";

// Actor: Student (hoặc Teacher xem preview danh sách Published)
// Permission: ATTEMPT_QUIZ — Student + Teacher đều có
//
// Trả về danh sách quiz đang Published trong một Section.
// Chỉ quiz có status = Published mới được trả về:
//   - Draft   → Teacher chưa publish, student không được biết
//   - Hidden  → Teacher đã ẩn, student không được thấy
//   - Expired → Hết hạn, không còn làm được
//
// Flow:
//   1. Query tất cả quiz Published trong sectionId từ Repository
//   2. Map sang PublishedQuizSummaryDTO[]
//   3. Sắp xếp theo deadlineAt tăng dần (quiz sắp hết hạn lên đầu)
//      — giúp student ưu tiên làm bài sắp deadline
export class GetPublishedQuizListUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(sectionId: string): Promise<PublishedQuizSummaryDTO[]> {
    // Bước 1: query — Repository đã filter status = Published
    const quizzes = await this.quizRepository.findPublishedBySection(sectionId);

    // Bước 2 + 3: map và sort theo deadline tăng dần
    return quizzes
      .map(QuizMapper.toPublishedSummaryDTO)
      .sort((a, b) =>
        new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime()
      );
  }
}