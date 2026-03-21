// Đây là data trả về cho controller sau khi login thành công.
// Controller dùng để:
//   - Trả token về cho client (lưu vào cookie / localStorage)
//   - Trả thông tin user cơ bản để frontend hiển thị / redirect
//     đúng trang theo role 

export interface AuthTokenDTO {
  accessToken: string;
  userId: string;
  roleName: string;
}