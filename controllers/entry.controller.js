import Entry from "../models/entry.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

export const addTransaction = async (req, res) => {
  const { id } = req.user;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, transactionType, ...otherData } = req.body;
    const user = await User.findById(id).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ msg: "User not found" });
    }

    const absAmount = Math.abs(amount);

    const [createEntry] = await Entry.create(
      [{ ...otherData, amount: absAmount, transactionType, userId: id }],
      { session },
    );

    if (transactionType === "Expense") {
      user.totalExpenses += absAmount;
      user.totalBalance -= absAmount;
    } else if (transactionType === "Debt") {
      user.totalDebt = (user.totalDebt || 0) + absAmount;
    } else {
      user.totalIncome += absAmount;
      user.totalBalance += absAmount;
    }

    user.transactions.push(createEntry._id);
    await user.save({ session });

    await session.commitTransaction();
    res.status(201).json({
      msg: "Entry Created",
      entry: createEntry,
      newBalance: user.totalBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ msg: error.message });
  } finally {
    session.endSession();
  }
};

export const deleteTransaction = async (req, res) => {
  const { id } = req.user;
  const { transactionId } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction =
      await Entry.findByIdAndDelete(transactionId).session(session);
    if (!transaction) {
      await session.abortTransaction();
      return res.status(404).json({ msg: "Transaction not found" });
    }

    const absAmount = Math.abs(transaction.amount);
    const updateData = { $pull: { transactions: transactionId } };

    if (transaction.transactionType === "Expense") {
      updateData.$inc = { totalBalance: absAmount, totalExpenses: -absAmount };
    } else if (transaction.transactionType === "Debt") {
      updateData.$inc = { totalDebt: -absAmount }; //
    } else {
      updateData.$inc = { totalBalance: -absAmount, totalIncome: -absAmount };
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      session,
      returnDocument: true,
    });
    await session.commitTransaction();
    res.status(200).json({ msg: "Deleted", newBalance: user.totalBalance });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ msg: error.message });
  } finally {
    session.endSession();
  }
};

export const updateTransactionById = async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user.id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const oldEntry = await Entry.findById(transactionId).session(session);
    const user = await User.findById(userId).session(session);

    if (!oldEntry || !user) {
      await session.abortTransaction();
      return res.status(404).json({ msg: "Not found" });
    }

    // 1. Reverse Old Impact
    const oldAbs = Math.abs(oldEntry.amount);
    if (oldEntry.transactionType === "Expense") {
      user.totalExpenses -= oldAbs;
      user.totalBalance += oldAbs;
    } else if (oldEntry.transactionType === "Debt") {
      user.totalDebt -= oldAbs;
    } else {
      user.totalIncome -= oldAbs;
      user.totalBalance -= oldAbs;
    }

    // 2. Apply New Impact
    const updatedType = req.body.transactionType || oldEntry.transactionType;
    const newAbs = Math.abs(Number(req.body.amount ?? oldEntry.amount));

    if (updatedType === "Expense") {
      user.totalExpenses += newAbs;
      user.totalBalance -= newAbs;
    } else if (updatedType === "Debt") {
      user.totalDebt = (user.totalDebt || 0) + newAbs;
    } else {
      user.totalIncome += newAbs;
      user.totalBalance += newAbs;
    }

    const updatedEntry = await Entry.findByIdAndUpdate(
      transactionId,
      { ...req.body, amount: newAbs, transactionType: updatedType },
      { new: true, session },
    );

    await user.save({ session });
    await session.commitTransaction();
    res.status(200).json({
      msg: "Updated",
      entry: updatedEntry,
      newBalance: user.totalBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ msg: error.message });
  } finally {
    session.endSession();
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
