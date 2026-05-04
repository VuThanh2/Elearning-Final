import oracledb from "oracledb";
import dotenv from "dotenv";

dotenv.config();

const ORACLE_USER = process.env.ORACLE_USER!;
const ORACLE_PASSWORD = process.env.ORACLE_PASSWORD!;
const ORACLE_CONNECTION_STRING = process.env.ORACLE_CONNECTION_STRING!;
const ORACLE_CONNECT_RETRIES = Number(process.env.ORACLE_CONNECT_RETRIES ?? 30);
const ORACLE_CONNECT_RETRY_DELAY_MS = Number(process.env.ORACLE_CONNECT_RETRY_DELAY_MS ?? 5_000);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const connectOracle = async (): Promise<oracledb.Connection> => {
  for (let attempt = 1; attempt <= ORACLE_CONNECT_RETRIES; attempt += 1) {
    try {
      const connection = await oracledb.getConnection({
        user: ORACLE_USER,
        password: ORACLE_PASSWORD,
        connectionString: ORACLE_CONNECTION_STRING,
      });
      console.log("Oracle DB connected");
      return connection;
    } catch (error) {
      const hasAttemptsLeft = attempt < ORACLE_CONNECT_RETRIES;

      if (!hasAttemptsLeft) {
        console.error("Oracle connection error:", error);
        process.exit(1);
      }

      console.warn(
        `Oracle is not ready yet (${attempt}/${ORACLE_CONNECT_RETRIES}): ${getErrorMessage(error)}`,
      );
      await sleep(ORACLE_CONNECT_RETRY_DELAY_MS);
    }
  }

  throw new Error("Oracle connection loop exited unexpectedly.");
};
