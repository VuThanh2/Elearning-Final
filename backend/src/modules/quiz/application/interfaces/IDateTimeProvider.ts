//port cung cấp thời gian hiện tại cho use cases

// Tại sao không dùng `new Date()` trực tiếp trong use case/domain:
//   - Không thể test time-dependent logic (deadline, expire...)
//     mà không mock global Date — vừa khó vừa dễ gây side effect
//   - Với IDateTimeProvider, test chỉ cần inject FakeDateTimeProvider
//     trả về bất kỳ thời điểm nào cần kiểm tra
export interface IDateTimeProvider {
  now(): Date;
}