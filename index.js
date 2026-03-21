import express, { urlencoded } from "express";
import dotenv from "dotenv";
import dbConnection from "./config/db.js";
import userRouter from "./routes/user.route.js";
import entryRoute from "./routes/entry.route.js";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
dotenv.config();
const app = express();
dbConnection();

// Initializing Middlewares
app.use(
  morgan("dev", {
    //this is the middleware used to check the incoming logs
    skip: (req) => req.method === "OPTIONS",
  }),
);

app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(urlencoded({ extended: true }));

app.use("/users", userRouter);
app.use("/entry", entryRoute);

app.listen(3000, (err) => {
  if (!err) {
    console.log("Server is running on port 3000");
  } else {
    console.log(err);
  }
});
