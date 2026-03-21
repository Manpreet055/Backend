import mongoose from "mongoose";

const entrySchema = new mongoose.Schema(
  {
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
        "Income",
        "Others",
      ],
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "Cash",
    },
    tags: [String],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    notes: String,
  },
  {
    timestamps: true,
  },
);

const Entry = mongoose.model("Entry", entrySchema);
export default Entry;
