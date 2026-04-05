import Loan from "../models/loan.model.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

export const addLoanDetails = async (req, res, next) => {
  const id = req?.user.id;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, totalEmis, emiAmount, repaymentCycle, date } =
      req.body?.data;

    // 1. Calculate the Last EMI Adjustment
    // (emiAmount * totalEMIs) - amount is the difference to be added to the last one
    const totalPaymentsExpected = emiAmount * totalEmis;
    const adjustment = totalPaymentsExpected - amount;
    const lastEmiValue = emiAmount - adjustment;

    // 2. Generate the EMI Schedule (Milestones)
    const schedule = [];
    const startDate = new Date(date || Date.now());
    const intervalDays = repaymentCycle === "15 days" ? 15 : 30;

    for (let i = 1; i <= totalEmis; i++) {
      const isLast = i === totalEmis;
      const dueDate = new Date(startDate);
      dueDate.setDate(startDate.getDate() + i * intervalDays);

      schedule.push({
        emiNumber: i,
        amount: isLast ? lastEmiValue : emiAmount,
        date: dueDate,
        status: "Pending", // Default status
        paymentId: new mongoose.Types.ObjectId(), // Unique key for toggling
      });
    }

    const loanDetails = {
      ...req.body?.data,
      userId: id,
      payments: schedule, // Structure is saved immediately
    };

    const loan = await Loan.create([loanDetails], { session });
    const user = await User.findById(id);

    user.totalDebt += amount;
    await user.save({ session });

    await session.commitTransaction();
    res.status(201).json({
      msg: "Loan and EMI Schedule Created",
      loan: loan[0],
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("DETAILED ERROR:", error); // Add this line
    res.status(500).json({
      msg: error.message || "Server Error",
      stack: error.stack, // Only for development
    });
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
