import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(), // Automatically generate if not provided
  },
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  emiNumber: { type: Number }, // Optional for 'Borrow' type chunks
  status: {
    type: String,
    enum: ["Pending", "Paid"],
    default: "Pending",
  },
  note: { type: String, trim: true }, // Useful for family "Borrow" chunks
});

const LoanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    loanProvider: { type: String, required: true, trim: true },
    amount: { type: Number, required: true }, // Initial borrowed/loan amount
    additionalAmount: { type: Number, default: 0 },
    totalEmis: {
      type: Number,
      required: function () {
        return this.debtType === "Loan";
      }, // Only required for bank loans
    },
    emiAmount: {
      type: Number,
      required: function () {
        return this.debtType === "Loan";
      }, // Only required for bank loans
    },
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
    },
    date: {
      type: Date,
      default: Date.now,
    },

    // Both structured EMIs and flexible "chunks" live here
    payments: [PaymentSchema],

    // Trackers
    paidEmis: { type: Number, default: 0 },
    pendingInstallments: { type: Number, default: 0 },
    remainingBalance: { type: Number, default: 0 }, // New field for flexible tracking
    status: {
      type: String,
      enum: ["Active", "Closed"], // 'Closed' is clearer for fully paid debt
      default: "Active",
    },
  },
  { timestamps: true },
);

// Unified Middleware for both Loan and Borrow logic
LoanSchema.pre("save", function () {
  const totalPrincipal = this.amount + (this.additionalAmount || 0);

  if (this.payments) {
    // 1. Calculate how much has been paid in total (sum of all 'Paid' status amounts)
    const totalPaidAmount = this.payments
      .filter((p) => p.status === "Paid")
      .reduce((sum, p) => sum + p.amount, 0);

    // 2. Update remaining balance
    this.remainingBalance = Math.max(0, totalPrincipal - totalPaidAmount);

    // 3. Track milestone counts
    this.paidEmis = this.payments.filter((p) => p.status === "Paid").length;

    // 4. Handle Status and Remaining Counts differently based on type
    if (this.debtType === "Loan") {
      this.pendingInstallments = Math.max(0, this.totalEmis - this.paidEmis);
    } else {
      // For 'Borrow', installments aren't fixed, so we just track them as 0 or 1
      this.pendingInstallments = this.remainingBalance > 0 ? 1 : 0;
    }

    // 5. Auto-close the debt if balance is 0
    if (this.remainingBalance <= 0) {
      this.status = "Closed";
    } else {
      this.status = "Active";
    }
  }
});

const Loan = mongoose.model("Loan", LoanSchema);
export default Loan;
