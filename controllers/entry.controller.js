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
    let { limit, page, sortingOrder, sortField, ...filters } = req.query;
    // console.log(filters);

    const limitNum = parseInt(limit) || 10;
    const pageNum = parseInt(page) || 1;
    const skip = (pageNum - 1) * limitNum;
    const order = sortingOrder === "desc" ? -1 : 1;
    const sortObj = sortField ? { [sortField]: order } : { createdAt: -1 };

    const query = { userId: id };
    if (filters.category) query.category = filters.category;
    if (filters.transactionType)
      query.transactionType = filters.transactionType;

    const [transactions, totalCount, categories] = await Promise.all([
      Entry.find(query).sort(sortObj).skip(skip).limit(limitNum).lean(),
      Entry.countDocuments(query),
      Entry.find(query).distinct("category"),
    ]);

    if (transactions.length === 0 && pageNum === 1) {
      return res.status(404).json({ msg: "No transactions found" });
    }

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      transactions,
      categories,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ msg: error.message || "Server Error" });
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
    res.status(500).json({ msg: "Server Error" });
  } finally {
    session.endSession();
  }
};
