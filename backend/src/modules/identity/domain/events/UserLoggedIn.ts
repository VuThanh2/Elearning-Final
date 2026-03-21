export class UserLoggedOut {
  readonly occurredAt: Date;

  constructor(
    // userId lấy từ JWT payload khi user gọi logout
    readonly userId: string,
  ) {
    this.occurredAt = new Date();
  }
}
//Cân nhắc Bỏ