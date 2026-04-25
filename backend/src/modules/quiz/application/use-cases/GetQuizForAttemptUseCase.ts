import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { QuizDetailDTO } from "../dtos/QuizResponseDTO";
import { QuizMapper } from "../../infrastructure/mappers/QuizMapper";

// Student views quiz during attempt — NO ownership check, only check if Published
//
// Authorization:
//   - Student phải có permission ATTEMPT_QUIZ (done ở middleware)
//   - Quiz phải ở status Published (check ở đây)
//
// Flow:
//   1. Load quiz
//   2. Kiểm tra quiz tồn tại
//   3. Kiểm tra quiz Published (không cần xem owner)
//   4. Trả về QuizDetailDTO

export class GetQuizForAttemptUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
  ) {}

  async execute(
    quizId: string
  ): Promise<QuizDetailDTO> {
    // Bước 1: load quiz
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }

    // Bước 2: check Published status
    if (quiz.status !== "Published") {
      throw new Error(
        `AccessDeniedError: Quiz không ở trạng thái Published.`
      );
    }

    // Bước 3: map và trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}
