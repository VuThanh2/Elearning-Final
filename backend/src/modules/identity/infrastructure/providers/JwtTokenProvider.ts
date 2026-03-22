import jwt from "jsonwebtoken";
import { RedisClientType } from "redis";
import { ITokenProvider, TokenPayload, } from "../../application/interfaces/ITokenProvider";

// JwtTokenProvider — Implementation của ITokenProvider
//
// Dùng jsonwebtoken để sign/verify JWT và Redis để blacklist token khi logout.
//
// Nhận redisClient qua constructor (dependency injection) thay vì
// import trực tiếp từ config — lý do:
//   - redisClient phải được connect trước khi dùng
//   - Dễ mock khi test
//
// JWT_SECRET và JWT_EXPIRES_IN đọc từ environment variable.
// Không hardcode secret trong code vì đây là thông tin nhạy cảm.
//
// Blacklist logic (invalidate + verify):
//   - Khi logout: lưu token vào Redis với key "blacklist:{token}",
//     TTL = thời gian còn lại của token để Redis tự xóa sau khi hết hạn
//   - Khi verify: check Redis trước, nếu token đang trong blacklist
//     thì trả null dù token chưa hết hạn

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1d";

export class JwtTokenProvider implements ITokenProvider {
  constructor(private readonly redisClient: RedisClientType) {}

  // Tạo JWT token sau khi login thành công.
  // Nhúng userId và roleName vào payload để middleware dùng mà không cần query DB thêm.
  generate(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  // Verify token từ request header.
  //
  // Kiểm tra theo thứ tự:
  //   1. Token có trong Redis blacklist không (đã logout rồi)
  //   2. Token có hợp lệ và chưa hết hạn không (jwt.verify)
  async verify(token: string): Promise<TokenPayload | null> {
    // Bước 1: check blacklist trước khi decode
    // Nếu token đã bị invalidate thì từ chối ngay
    const isBlacklisted = await this.redisClient.get(
      `blacklist:${token}`
    );
    if (isBlacklisted) return null;

    // Bước 2: verify chữ ký và hạn sử dụng
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  // Đưa token vào blacklist trên Redis.
  // Dùng trong: AuthenticationUseCase khi user logout.
  async invalidate(token: string): Promise<void> {
    const decoded = jwt.decode(token) as { exp?: number } | null;

    if (!decoded?.exp) {
      // Token không có exp (không hợp lệ) thì bỏ qua
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    // Chỉ lưu vào blacklist nếu token chưa hết hạn
    // Token đã expired thì không cần blacklist vì verify sẽ fail
    if (ttl > 0) {
      await this.redisClient.set(`blacklist:${token}`, "1", {
        EX: ttl,
      });
    }
  }
}