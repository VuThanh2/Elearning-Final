import { TeacherProfile } from "../../domain/entities/TeacherProfile";
import { TeacherProfileModel } from "../models/TeacherProfileModel";

// toDomain()      — dùng khi Repository load user (findByEmail / findById)
// toPersistence() — không cần vì TeacherProfile không được update trực tiếp
// từ Identity Context, mà chỉ được cập nhật qua event từ Quiz Context,
// nên không bao giờ cần map ngược lại từ entity xuống DB.

export class TeacherProfileMapper {

  // Oracle row → TeacherProfile entity
  static toDomain(row: TeacherProfileModel): TeacherProfile {
    return new TeacherProfile({
      userId: row.USER_ID,
      department: row.DEPARTMENT,
      quizzesCreated: row.QUIZZES_CREATED,
    });
  }
}