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
      paidEmis = 0, // Ensure this is coming from req.body.data
      emiAmount,
      repaymentCycle,
      date,
      debtType,
    } = req.body?.data;

    console.log(req.body?.data);

    // 1. Permanent Total Amount (Principal + Interest)
    // This should never change regardless of payments
    const basePrincipal = Number(amount) + Number(additionalAmount);
    const totalLoanValue =
      basePrincipal + basePrincipal * (Number(interest) / 100);

    // 2. Calculate Progress
    const userPaidEmis = Number(paidEmis);
    const alreadyPaidAmount = userPaidEmis * Number(emiAmount);
    const remainingBalance = totalLoanValue - alreadyPaidAmount;

    let schedule = [];
    const nextInstallmentDate = new Date(date);

    if (debtType === "Loan") {
      const intervalDays = repaymentCycle === "15 days" ? 15 : 30;

      // Start loop from the first pending EMI
      for (let i = userPaidEmis + 1; i <= Number(totalEmis); i++) {
        const isLast = i === Number(totalEmis);

        const dueDate = new Date(nextInstallmentDate);
        const offset = (i - (userPaidEmis + 1)) * intervalDays;
        dueDate.setDate(nextInstallmentDate.getDate() + offset);

        // Adjust last EMI for rounding
        const currentEmiAmount = isLast
          ? remainingBalance - emiAmount * (Number(totalEmis) - i)
          : Number(emiAmount);

        schedule.push({
          emiNumber: i,
          amount: currentEmiAmount,
          date: dueDate,
          status: "Pending",
          paymentId: new mongoose.Types.ObjectId(),
        });
      }
    }

    const loanDetails = {
      ...req.body?.data,
      userId: id,
      amount: totalLoanValue, // ALWAYS the full amount (Fixed)
      remainingBalance: remainingBalance, // The actual money left to pay (Dynamic)
      paidEmis: userPaidEmis, // Saving the progress correctly now
      payments: schedule,
    };

    const loan = await Loan.create([loanDetails], { session });
    const user = await User.findById(id);

    // Update User's total debt only by what is ACTUALLY remaining
    user.totalDebt += remainingBalance;
    await user.save({ session });

    await session.commitTransaction();
    res.status(201).json({
      msg: `${debtType} Details Added Successfully`,
      loan: loan[0],
    });
  } catch (error) {
    await session.abortTransaction();
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

    user.totalDebt -= loan.amount;
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
