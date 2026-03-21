//event này KHÔNG chứa password cũ hay mới — domain event
// không được chứa thông tin nhạy cảm.
export class PasswordReset {
  readonly occurredAt: Date;

  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    this.occurredAt = new Date();
  }
}
//Cân nhắc Bỏ