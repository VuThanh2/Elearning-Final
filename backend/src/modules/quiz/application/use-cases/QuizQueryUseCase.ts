import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { QuizDetailDTO, QuizSummaryDTO } from "../dtos/QuizResponseDTO";
import { QuizMapper } from "../../infrastructure/mappers/QuizMapper";

// Trả về đầy đủ questions + options + điểm mỗi câu.
//
// Authorization:
//   - Chỉ Teacher là owner của quiz mới xem được
//   - Không cho phép Teacher khác xem quiz của nhau
//
// Flow:
//   1. Load quiz, kiểm tra tồn tại
//   2. Kiểm tra Teacher là owner
//   3. Trả về QuizDetailDTO

export class GetQuizUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(
    teacherId: string,
    quizId: string
  ): Promise<QuizDetailDTO> {
    // Bước 1: load quiz
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }

    // Bước 2: ownership check — Teacher chỉ xem quiz của mình
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền xem quiz này."
      );
    }

    // Bước 3: map và trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}

// Trả về summary (không có questions) để giảm payload.
// Teacher chỉ xem được quiz thuộc section mình dạy.
//
// Flow:
//   1. Load tất cả quiz của Teacher trong section (mọi status)
//   2. Map sang QuizSummaryDTO[]
//
// Note: không cần verify TeachingAssignment ở đây vì nếu Teacher
// không dạy section đó thì query sẽ trả về mảng rỗng

export class GetQuizListUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(
    teacherId: string,
    sectionId: string
  ): Promise<QuizSummaryDTO[]> {
    const quizzes = await this.quizRepository.findByTeacherAndSection(
      teacherId,
      sectionId
    );

    return quizzes.map(QuizMapper.toSummaryDTO);
  }
}