import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  }, // Unique key for toggling status
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  emiNumber: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Pending", "Paid"],
    default: "Pending",
  },
});

const LoanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    loanProvider: { type: String, required: true, trim: true },
    amount: { type: Number, required: true }, // Principal amount
    additionalAmount: { type: Number, default: 0 }, // Extra fees or processing costs
    totalEmis: { type: Number, required: true },
    emiAmount: { type: Number, required: true },
    interest: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    debtType: {
      type: String,
      enum: ["Loan", "Borrow"],
      required: true,
    },
    repaymentCycle: {
      type: String,
      default: "30 days",
    }, // e.g., "15 days" or "30 days"
    date: {
      type: Date,
      default: Date.now,
    }, // Loan start/disbursement date

    // The full EMI schedule calculated at creation
    payments: [PaymentSchema],

    // Helper trackers
    paidEmis: { type: Number, default: 0 },
    pendingInstallments: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Active", "Paid"],
      default: "Active",
    },
  },
  { timestamps: true },
);

// Middleware to keep trackers in sync before saving
LoanSchema.pre("save", function () {
  if (this.payments) {
    this.paidEmis = this.payments.filter((p) => p.status === "Paid").length;
    this.pendingInstallments = this.totalEmis - this.paidEmis;
  }
  if (this.paidEmis === this.totalEmis) {
    this.status = "Paid";
  }
});

const Loan = mongoose.model("Loan", LoanSchema);
export default Loan;
