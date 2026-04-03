import mongoose from "mongoose";

const LoanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    loanProvider: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    totalEmis: {
      type: Number,
      default: 1,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    interest: {
      type: Number,
      default: 0,
    },
    lastEMI: {
      type: Number,
    },
    pendingInstallments: {
      type: Number,
    },
    debtType: {
      type: String,
      enum: ["Loan", "Borrow"], // Added validation
      required: true,
    },
    repaymentCycle: {
      type: String,
      default: "Monthly",
    },
  },
  {
    timestamps: true, // Automatically creates 'createdAt' and 'updatedAt'
  },
);

const Loan = mongoose.model("Loan", LoanSchema);

export default Loan;
