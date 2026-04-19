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
      paidEmis = 0,
      emiAmount,
      repaymentCycle,
      date,
      debtType,
    } = req.body?.data;

    // 1. Setup initial variables
    const userPaidEmis = Number(paidEmis);
    const monthlyEmiVal = Number(emiAmount);

    // We calculate the remaining balance here ONLY to determine the
    // last EMI amount in the loop logic below.
    const principal = Number(amount);
    const interestRate = Number(interest) / 100;
    const totalLoanValue =
      principal * (1 + interestRate) + Number(additionalAmount);
    const remainingBalanceAtStart =
      totalLoanValue - userPaidEmis * monthlyEmiVal;

    let schedule = [];
    const nextInstallmentDate = new Date(date);

    if (debtType === "Loan") {
      const intervalDays = repaymentCycle === "15 days" ? 15 : 30;
      const remainingEmisCount = Number(totalEmis) - userPaidEmis;

      for (let i = 1; i <= remainingEmisCount; i++) {
        const currentEmiNumber = userPaidEmis + i;
        const isLast = i === remainingEmisCount;

        const dueDate = new Date(nextInstallmentDate);
        // (i-1) ensures the first pending EMI is exactly on the 'date' selected
        dueDate.setDate(nextInstallmentDate.getDate() + (i - 1) * intervalDays);

        // Calculate last EMI to absorb any rounding differences
        const currentEmiAmount = isLast
          ? remainingBalanceAtStart - monthlyEmiVal * (remainingEmisCount - 1)
          : monthlyEmiVal;

        schedule.push({
          emiNumber: currentEmiNumber,
          amount: Math.round(currentEmiAmount),
          date: dueDate,
          status: "Pending",
          paymentId: new mongoose.Types.ObjectId(),
        });
      }
    }

    // 2. Construct the document
    // We pass the raw values; the pre-save hook will finalize the remainingBalance
    const loanToCreate = {
      ...req.body?.data,
      userId: id,
      payments: schedule,
    };

    const loanArray = await Loan.create([loanToCreate], { session });
    const savedLoan = loanArray[0];

    // 3. Update User Debt
    // We use the remainingBalance that was JUST calculated by the Mongoose Hook
    const user = await User.findById(id);
    user.totalDebt += savedLoan.remainingBalance;
    await user.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      msg: `${debtType} Details Added Successfully`,
      loan: savedLoan,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("LOAN_INSERT_ERROR:", error);
    res.status(500).json({ msg: error.message || "Server Error" });
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

export const deleteLoanDetailsById = async (req, res) => {
  const userId = req.user?.id; // Corrected optional chaining
  const loanId = req.params.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const loan = await Loan.findById(loanId).session(session);
    if (!loan) {
      throw new ApiError("Loan not found", 404);
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    user.totalDebt -= loan.remainingBalance;
    await user.save({ session });

    await Loan.findByIdAndDelete(loanId).session(session);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      msg: "Loan details deleted and user debt updated",
    });
  } catch (error) {
    // 6. Roll back changes if anything fails
    await session.abortTransaction();
    // Assuming ApiError is a custom class you've defined
    res.status(error.statusCode || 500).json({
      message: error.message || "Server Error",
    });
  } finally {
    // 7. Always close the session
    session.endSession();
  }
};
