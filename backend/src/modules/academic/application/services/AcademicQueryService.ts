import { IAcademicRepository } from "../../domain/interface-repositories/IAcademicRepository";
import { IAcademicQueryService } from "../interfaces/IAcademicQueryService";

// Chỉ Academic Context nội bộ biết class này tồn tại —
// module khác chỉ nhìn thấy IAcademicQueryService (interface).
//
// Nguyên tắc mở rộng:
//   Khi một Module mới cần data từ Academic Context,
//   thêm method vào IAcademicQueryService + implement ở đây.
//
// Các Module đang dùng:
//   - Quiz Context         → sectionExists(), isTeacherAssignedToSection()
//   - Quiz Attempt Context → isStudentEnrolledInSection()  
export class AcademicQueryService implements IAcademicQueryService {
  constructor(
    private readonly academicRepository: IAcademicRepository
  ) {}

  // Dùng bởi: Quiz Context (CreateQuizUseCase)
  // Mục đích: verify sectionId Teacher nhập vào là hợp lệ
  async sectionExists(sectionId: string): Promise<boolean> {
    return this.academicRepository.sectionExists(sectionId);
  }

  // Dùng bởi: Quiz Context (CreateQuizUseCase)
  // Mục đích: verify Teacher chỉ tạo quiz cho section mình dạy
  async isTeacherAssignedToSection(
    teacherId: string,
    sectionId: string
  ): Promise<boolean> {
    return this.academicRepository.isTeacherAssignedToSection(
      teacherId,
      sectionId
    );
  }

  // Dùng bởi: Quiz Attempt Context (StartQuizAttemptUseCase)
  // Mục đích: verify Student chỉ làm quiz thuộc section mình enrolled
  async isStudentEnrolledInSection(
    studentId: string,
    sectionId: string
  ): Promise<boolean> {
    return this.academicRepository.isStudentEnrolledInSection(
      studentId,
      sectionId
    );
  }
}