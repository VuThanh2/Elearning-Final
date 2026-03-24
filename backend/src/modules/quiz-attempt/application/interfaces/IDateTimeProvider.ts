// Port cung cấp thời gian hiện tại cho use cases và background jobs.
//
// Tại sao không dùng new Date() trực tiếp:
//   - Không thể test time-dependent logic (timeLimit, deadline, expire)
//     mà không mock global Date
//   - Với IDateTimeProvider, test chỉ cần inject FakeDateTimeProvider
//     trả về bất kỳ thời điểm nào cần kiểm tra
//
// Mỗi context có interface riêng
// vì chúng thuộc về application layer của context đó,
// không share interface across contexts.
export interface IDateTimeProvider {
  now(): Date;
}