import {
  addTransaction,
  getTransactions,
  deleteTransaction,
} from "../controllers/entry.controller.js";
import { jwtmiddleware } from "../middlewares/authentication.middleware.js";
import express from "express";

const router = express();

router.get("/get", jwtmiddleware, getTransactions);
router.post("/add", jwtmiddleware, addTransaction);
router.delete("/delete/:transactionId", jwtmiddleware, deleteTransaction);

export default router;
