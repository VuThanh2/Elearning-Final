import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST!;
const REDIS_PORT = Number(process.env.REDIS_PORT!);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";

export const redisClient = createClient({
  url: `redis://${REDIS_PASSWORD ? REDIS_PASSWORD + "@" : ""}${REDIS_HOST}:${REDIS_PORT}`,
});

redisClient.on("error", (err) => console.error("❌ Redis Client Error", err));

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    console.log("✅ Redis connected");
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
    process.exit(1);
  }
};