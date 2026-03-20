import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST!;
const REDIS_PORT = Number(process.env.REDIS_PORT!);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";

export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT!),
  },
  ...(process.env.REDIS_PASSWORD
    ? { password: process.env.REDIS_PASSWORD }
    : {}),
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