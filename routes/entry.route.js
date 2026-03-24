import {
  addTransaction,
  getTransactions,
  deleteTransaction,
  getTransactionById,
  getPDFFileofTransactions,
} from "../controllers/entry.controller.js";
import { jwtmiddleware } from "../middlewares/authentication.middleware.js";
import express from "express";

const router = express();

router.get("/pdf", jwtmiddleware, getPDFFileofTransactions);

router
  .route("/")
  .get(jwtmiddleware, getTransactions)
  .post(jwtmiddleware, addTransaction);

router
  .route("/:transactionId")
  .get(jwtmiddleware, getTransactionById)
  .delete(jwtmiddleware, deleteTransaction);

export default router;
