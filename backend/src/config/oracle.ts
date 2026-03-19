import oracledb from "oracledb";
import dotenv from "dotenv";

dotenv.config();

const ORACLE_USER = process.env.ORACLE_USER!;
const ORACLE_PASSWORD = process.env.ORACLE_PASSWORD!;
const ORACLE_CONNECTION_STRING = process.env.ORACLE_CONNECTION_STRING!;

export const connectOracle = async (): Promise<oracledb.Connection> => {
  try {
    const connection = await oracledb.getConnection({
      user: ORACLE_USER,
      password: ORACLE_PASSWORD,
      connectionString: ORACLE_CONNECTION_STRING,
    });
    console.log("✅ Oracle DB connected");
    return connection;
  } catch (error) {
    console.error("❌ Oracle connection error:", error);
    process.exit(1);
  }
};