import { jwtmiddleware } from "../middlewares/authentication.middleware.js";
import {
  addLoanDetails,
  getAllLoansDetails,
  getLoanDetailsById,
} from "../controllers/loan.controller.js";
import express from "express";

const router = express();

router
  .route("/")
  .get(jwtmiddleware, getAllLoansDetails)
  .post(jwtmiddleware, addLoanDetails);

router.get("/:id", jwtmiddleware, getLoanDetailsById);
export default router;
