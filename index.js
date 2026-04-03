import express, { urlencoded } from "express";
import dotenv from "dotenv";
dotenv.config();
import dbConnection from "./config/db.js";
import userRouter from "./routes/user.route.js";
import entryRouter from "./routes/entry.route.js";
import loanRouter from "./routes/loan.route.js";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import nodeCron from "node-cron";
import { sendMonthlyEmailWithPDF } from "./controllers/pdf.controller.js";

const app = express();

app.set("trust proxy", 1); // trust first proxy
app.use(cookieParser());

app.use(
  morgan("dev", {
    //this is the middleware used to check the incoming logs
    skip: (req) => req.method === "OPTIONS",
  }),
);
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins =
        process.env.NODE_ENV === "production"
          ? [process.env.CORS_ORIGIN] // must be set in Vercel
          : [
              "http://localhost:5173",
              "http://localhost:5174",
              "http://172.16.17.149:5173",
            ];

      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    maxAge: 86400, // 24 hours prefl
  }),
);
app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use("/loans", loanRouter);
app.use("/users", userRouter);
app.use("/entry", entryRouter);
app.use("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || "Internal Server Error",
  });
});

const startServer = async () => {
  try {
    await dbConnection();

    const PORT = process.env.PORT || 4000;

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // nodeCron.schedule("*/5 * * * * *", async () => {
    //   console.log("Running monthly email job...");
    //   await sendMonthlyEmailWithPDF();
    // });
  } catch (e) {
    console.error("Critical Error: Could not start server", e.message);
    process.exit(1);
  }
};

startServer();
