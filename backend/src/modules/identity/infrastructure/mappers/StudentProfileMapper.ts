import { StudentProfile } from "../../domain/entities/StudentProfile";
import { StudentProfileModel } from "../models/StudentProfileModel";

// toDomain()      — dùng khi Repository load user (findByEmail / findById)
// toPersistence() — không cần vì StudentProfile không được update trực tiếp
// từ Identity Context, mà chỉ được cập nhật qua event từ Quiz Attempt Context,
// nên không bao giờ cần map ngược lại từ entity xuống DB.

export class StudentProfileMapper {

  // Oracle row → StudentProfile entity
  static toDomain(row: StudentProfileModel): StudentProfile {
    return new StudentProfile({
      userId: row.USER_ID,
      major: row.MAJOR,
      averageScore: row.AVERAGE_SCORE,
      completedQuizAttempts: row.COMPLETED_QUIZ_ATTEMPTS,
    });
  }
}