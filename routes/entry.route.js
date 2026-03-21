import { addTransaction } from "../controllers/entry.controller.js";
import { jwtmiddleware } from "../middlewares/authentication.middleware.js";
import express from "express";

const router = express();

router.post("/add", jwtmiddleware, addTransaction);

export default router;
