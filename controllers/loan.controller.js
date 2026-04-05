import Loan from "../models/loan.model.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

export const addLoanDetails = async (req, res) => {
  const id = req?.user.id;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const loanDetails = { ...req.body?.data, userId: id };
    const loan = await Loan.create(loanDetails);
    const user = await User.findById(id);

    user.totalDebt += loanDetails.amount;
    await user.save();

    res.status(201).json({
      msg: "Loan Details Added",
      loan,
    });
    session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(error.message || "Server Error", 500);
  } finally {
    session.endSession();
  }
};

export const getAllLoansDetails = async (req, res) => {
  const id = req?.user.id;

  try {
    const allLoans = await Loan.find({ userId: id }).lean();
    if (!allLoans || allLoans.length === 0) {
      return res.status(404).json({
        msg: "Loans not found",
      });
    }

    res.status(200).json({
      msg: "Loans Found",
      loans: allLoans,
    });
  } catch (error) {
    throw new ApiError(error.message || "Server Error", 500);
  }
};

export const getLoanDetailsById = async (req, res) => {
  try {
    const id = req.params.id;

    const loan = await Loan.findById(id);
    if (!loan) {
      return res.status(404).json({
        msg: "Loan Details not found",
      });
    }
    res.status(200).json({
      msg: "Loan details found",
      loan,
    });
  } catch (error) {
    throw new ApiError(error.message || "Server Error", 500);
  }
};
