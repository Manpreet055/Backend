import { jwtmiddleware } from "../middlewares/authentication.middleware.js";
import {
  addLoanDetails,
  getAllLoansDetails,
  getLoanDetailsById,
  deleteLoanDetailsById,
} from "../controllers/loan.controller.js";
import express from "express";

const router = express();

router
  .route("/")
  .get(jwtmiddleware, getAllLoansDetails)
  .post(jwtmiddleware, addLoanDetails);

router
  .route("/:id")
  .get(jwtmiddleware, getLoanDetailsById)
  .delete(jwtmiddleware, deleteLoanDetailsById);
export default router;
