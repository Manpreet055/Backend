import express, { urlencoded } from "express";
import dotenv from "dotenv";
import dbConnection from "./config/db.js";
import userRouter from "./routes/user.route.js";
import entryRoute from "./routes/entry.route.js";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
dotenv.config({ quiet: true });
const app = express();

(async () => {
  try {
    await dbConnection();
  } catch (e) {
    console.log(e.message);
  }
})();

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

app;
app.use("/users", userRouter);
app.use("/entry", entryRoute);
app.use("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.listen(4000, (err) => {
  if (!err) {
    console.log("Server is running on port 3000");
  } else {
    console.log(err);
  }
});
