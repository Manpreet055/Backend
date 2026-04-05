// loan.model.js
import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  emiNumber: { type: Number }, // e.g., "EMI 1 of 12"
  status: { type: String, default: "Paid" },
});

const LoanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    loanProvider: { type: String, required: true, trim: true },
    amount: { type: Number, required: true }, // Total Loan Principal
    totalEmis: { type: Number, default: 1 },
    interest: { type: Number, default: 0 },
    debtType: { type: String, enum: ["Loan", "Borrow"], required: true },
    repaymentCycle: { type: String, default: "Monthly" },

    // NEW: Array to store history for your vertical checkpoints
    payments: [PaymentSchema],

    // Virtual or helper fields
    paidEmis: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Loan = mongoose.model("Loan", LoanSchema);
export default Loan;
