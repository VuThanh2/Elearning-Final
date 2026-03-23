import { IDateTimeProvider } from "../../application/interfaces/IDateTimeProvider";

// Wrap `new Date()` trong class để có thể swap bằng
// FakeDateTimeProvider khi test mà không cần mock global Date.
export class SystemDateTimeProvider implements IDateTimeProvider {
  now(): Date {
    return new Date();
  }
}