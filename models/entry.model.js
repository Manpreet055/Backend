import mongoose from "mongoose";

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now(),
    },
    transactionType: {
      type: String,
      enum: ["Expense", "Income"],
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Housing & Rent",
        "Food & Dining",
        "Transportation",
        "Utilities",
        "Shopping",
        "Entertainment",
        "Health & Fitness",
        "Personal Care",
        "Education",
        "Travel",
        "Investments",
        "Salary",
        "Others",
      ],
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "Cash",
    },
    notes: {
      type: String,
      default: "No additional details",
    },
  },
  {
    timestamps: true,
  },
);

const Entry = mongoose.model("Entry", entrySchema);
export default Entry;
