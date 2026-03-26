import Entry from "../models/entry.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

export const addTransaction = async (req, res) => {
  const { id } = req.user;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Invalid User ID", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, transactionType, ...otherData } = req.body;

    // 1. Find user within the session
    const user = await User.findById(id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ msg: "User not found" });
    }

    // 2. Format the amount
    const formattedAmount =
      transactionType === "Expense" ? -Math.abs(amount) : Math.abs(amount);

    // 3. Create Entry within the session
    const [createEntry] = await Entry.create(
      [
        {
          ...otherData,
          amount: formattedAmount,
          transactionType,
          userId: id,
        },
      ],
      { session },
    );

    // 4. Update User stats
    if (transactionType === "Expense") {
      user.totalExpenses += Math.abs(amount);
      user.totalBalance -= Math.abs(amount);
    } else {
      user.totalIncome += Math.abs(amount);
      user.totalBalance += Math.abs(amount);
    }

    user.transactions.push(createEntry._id);
    await user.save({ session });

    // 5. Success: Commit changes
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      msg: "Entry Created Successfully",
      entry: createEntry,
      newBalance: user.totalBalance,
    });
  } catch (error) {
    // Rollback all changes if any step fails
    await session.abortTransaction();
    session.endSession();
    throw new ApiError(error.message || "Internal Server Error", 500);
  }
};

export const getTransactions = async (req, res) => {
  const { id } = req.user;

  try {
    const {
      limit = 10,
      page = 1,
      sortingOrder,
      sortField,
      filters = {},
      month, // Expected format: 1 to 12
      year, // Optional: defaults to current year
      ...rest
    } = req.query;

    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * limitNum;
    const order = sortingOrder === "desc" ? -1 : 1;
    const sortObj = sortField ? { [sortField]: order } : { createdAt: -1 };

    const query = { userId: id };

    // Handle Month Filtering
    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) - 1 : now.getMonth();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    query.createdAt = {
      $gte: startDate,
      $lte: endDate,
    };

    let finalFilters = { ...filters };

    Object.keys(rest).forEach((key) => {
      const match = key.match(/^filters\[(.+)\]$/);
      if (match) {
        finalFilters[match[1]] = rest[key];
      }
    });

    if (finalFilters.category) {
      query.category = finalFilters.category;
    }

    if (finalFilters.transactionType) {
      query.transactionType = finalFilters.transactionType;
    }

    const [transactions, totalCount, categories, transactionType] =
      await Promise.all([
        Entry.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
        Entry.countDocuments(query),
        Entry.find({ userId: id }).distinct("category"),
        Entry.find({ userId: id }).distinct("transactionType"),
      ]);

    if (transactions.length === 0 && pageNum === 1) {
      return res.status(404).json({
        success: false,
        msg: "No transactions found for this period",
      });
    }

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      success: true,
      transactions,
      filters: {
        transactionType: [...transactionType],
        categories: [...categories],
      },
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
export const deleteTransaction = async (req, res) => {
  const { id } = req.user;
  const { transactionId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find and delete the transaction within the session
    const transaction =
      await Entry.findByIdAndDelete(transactionId).session(session);
    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({ msg: "Transaction not found" });
    }

    // 2. Reverse the financial impact on the user
    const updateData = {
      $pull: { transactions: transactionId },
    };

    if (transaction.transactionType === "Expense") {
      updateData.$inc = {
        totalBalance: Math.abs(transaction.amount),
        totalExpenses: -Math.abs(transaction.amount),
      };
    } else {
      updateData.$inc = {
        totalBalance: -Math.abs(transaction.amount),
        totalIncome: -Math.abs(transaction.amount),
      };
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      session,
      new: true,
    });

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ msg: "User not found" });
    }

    // 3. Commit and end
    await session.commitTransaction();
    res.status(200).json({
      msg: "Transaction deleted",
      newBalance: user.totalBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    throw new ApiError(error.message || "Internal Server Error", 500);
  } finally {
    session.endSession();
  }
};

export const getTransactionById = async (req, res) => {
  const { id } = req?.user;
  try {
    const { transactionId } = req.params;
    const transaction = await Entry.findById(transactionId);
    if (!transaction) {
      throw new ApiError("Transaction not found", 404);
    }
    res.status(200).json({
      msg: "Transaction updated",
      transaction,
    });
  } catch (error) {
    throw new ApiError(error.message || "Internal Server Error", 500);
  }
};

export const updateTransactionById = async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const oldEntry = await Entry.findById(transactionId).session(session);
    if (!oldEntry || oldEntry.userId.toString() !== userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: "Transaction not found" });
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: "User not found" });
    }

    const oldAmt = Math.abs(oldEntry.amount);

    if (oldEntry.transactionType === "Expense") {
      user.totalExpenses -= oldAmt;
    } else {
      user.totalIncome -= oldAmt;
    }

    const updatedType = req.body.transactionType || oldEntry.transactionType;
    const rawNewAmount =
      req.body.amount !== undefined ? req.body.amount : oldAmt;

    const newAmt = Math.abs(Number(rawNewAmount));
    if (isNaN(newAmt)) {
      throw new Error("Invalid amount provided");
    }

    const formattedAmount = updatedType === "Expense" ? -newAmt : newAmt;

    if (updatedType === "Expense") {
      user.totalExpenses += newAmt;
    } else {
      user.totalIncome += newAmt;
    }

    const updatedEntry = await Entry.findByIdAndUpdate(
      transactionId,
      {
        ...req.body,
        amount: formattedAmount,
        transactionType: updatedType,
      },
      { new: true, session, runValidators: true },
    );

    user.totalBalance = user.totalIncome - user.totalExpenses;

    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      msg: "Transaction updated successfully",
      entry: updatedEntry,
      newBalance: user.totalBalance,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    res.status(error.statusCode || 500).json({
      msg: error.message || "Internal Server Error",
    });
  }
};
