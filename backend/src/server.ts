import express from "express";
import dotenv from "dotenv";
import { connectMongo } from "./config/mongodb";
import { connectOracle } from "./config/oracle";
import { connectRedis } from "./config/redis";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello Backend with DBs!");
});

const startServer = async () => {
  try {
    await connectMongo();
    const oracleConn = await connectOracle();
    await connectRedis();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

    // nếu muốn dùng oracleConn ở toàn bộ project
    // export hoặc gắn vào context app/service
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

startServer();