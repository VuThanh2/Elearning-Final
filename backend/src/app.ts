import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

// placeholder route
app.get("/", (req, res) => res.send("Hello Express + TS"));

export default app;