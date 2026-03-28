import { RedisClientType } from "redis";
import { IAnalyticCache }  from "../../domain/interface-repositories/IAnalyticCache";

// Graceful degradation:
//   Tất cả method đều wrap trong try/catch và KHÔNG rethrow.
//   Redis failure → log warning → query fallback vào Oracle/Mongo.
//   Analytics cache là performance optimization, không phải critical path.
export class RedisAnalyticCache implements IAnalyticCache {
  constructor(
    private readonly redis: RedisClientType,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      // JSON.parse fail hoặc Redis lỗi — treat as miss
      console.warn(`[AnalyticsCache] GET miss (error) key="${key}":`, err instanceof Error ? err.message : err);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      // EX = expire in seconds
      await this.redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err) {
      console.warn(`[AnalyticsCache] SET failed key="${key}":`, err instanceof Error ? err.message : err);
      // Silent fail — không throw
    }
  }

  async invalidate(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      // DEL nhận nhiều key — 1 round-trip thay vì N round-trips
      await this.redis.del(keys);
    } catch (err) {
      console.warn(`[AnalyticsCache] DEL failed keys=${JSON.stringify(keys)}:`, err instanceof Error ? err.message : err);
      // Silent fail
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      for await (const keys of this.redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      // scanIterator yield từng batch (string[]) — delete ngay trong loop
      // tránh accumulate toàn bộ keys vào memory trước khi delete
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    }
    } catch (err) {
      console.warn(`[AnalyticsCache] SCAN+DEL failed pattern="${pattern}":`, err instanceof Error ? err.message : err);
      // Silent fail
    }
  }
}