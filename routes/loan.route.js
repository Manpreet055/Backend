import { jwtmiddleware } from "../middlewares/authentication.middleware.js";
import {
  addLoanDetails,
  getAllLoansDetails,
} from "../controllers/loan.controller.js";
import express from "express";

const router = express();

router
  .route("/")
  .get(jwtmiddleware, getAllLoansDetails)
  .post(jwtmiddleware, addLoanDetails);

export default router;
