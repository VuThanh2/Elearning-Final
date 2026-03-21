import { FullName } from "../value-objects/FullName";

export class TeacherProfile {
  readonly userId: string;
  readonly fullName: FullName;
  readonly department: string;

  // Counter được cập nhật từ Quiz Context qua event, không do
  // Identity Context trực tiếp thay đổi.
  readonly quizzesCreated: number;

  constructor(params: {
    userId: string;
    fullName: FullName;
    department: string;
    quizzesCreated: number;
  }) {
    this.userId = params.userId;
    this.fullName = params.fullName;
    this.department = params.department;
    this.quizzesCreated = params.quizzesCreated;
  }
}