export class UserLoggedIn {
  readonly occurredAt: Date;

  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    this.occurredAt = new Date();
  }
}
//Cân nhắc Bỏ