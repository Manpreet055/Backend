import Loan from "../models/loan.model.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

export const addLoanDetails = async (req, res) => {
  const id = req?.user.id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      amount,
      additionalAmount = 0,
      interest = 0,
      totalEmis,
      emiAmount,
      repaymentCycle,
      date,
      debtType,
    } = req.body?.data;

    // 1. Calculate Base Principal (Amount + Fees)
    const basePrincipal = amount + additionalAmount;

    // 2. Apply Interest Percentage to the Base Principal
    // Total Debt = Principal + (Principal * Interest / 100)
    const totalPayable = basePrincipal + basePrincipal * (interest / 100);

    let schedule = [];
    const startDate = new Date(date || Date.now());

    // 3. Logic Branching: Structured Loan vs. Flexible Borrowing
    if (debtType === "Loan") {
      // Structured path: Use emiAmount and totalEmis
      const totalPaymentsFromEmis = emiAmount * totalEmis;
      const adjustment = totalPaymentsFromEmis - totalPayable;
      const lastEmiValue = emiAmount - adjustment;

      const intervalDays = repaymentCycle === "15 days" ? 15 : 30;

      for (let i = 1; i <= totalEmis; i++) {
        const isLast = i === totalEmis;
        const dueDate = new Date(startDate);
        dueDate.setDate(startDate.getDate() + i * intervalDays);

        schedule.push({
          emiNumber: i,
          amount: isLast ? lastEmiValue : emiAmount,
          date: dueDate,
          status: "Pending",
          paymentId: new mongoose.Types.ObjectId(),
        });
      }
    } else {
      // Flexible path: Schedule starts empty for chunks to be added later
      schedule = [];
    }

    const loanDetails = {
      ...req.body?.data,
      userId: id,
      amount: totalPayable, // The new principle includes interest and fees
      payments: schedule,
    };

    const loan = await Loan.create([loanDetails], { session });
    const user = await User.findById(id);

    // Update User's overall debt with the interest-inclusive amount
    user.totalDebt += totalPayable;
    await user.save({ session });

    await session.commitTransaction();
    res.status(201).json({
      msg: `${debtType} Details Added Successfully`,
      loan: loan[0],
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("DETAILED ERROR:", error);
    res.status(500).json({
      msg: error.message || "Server Error",
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
