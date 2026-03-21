//Interface cho việc hash và verify password
export interface IPasswordHasher {
  // Nhận plain text, trả về chuỗi hash để lưu vào DB.
  hash(plainText: string): Promise<string>;
  // So sánh plain text với hash đã lưu trong DB.
  compare(plainText: string, hash: string): Promise<boolean>;
}