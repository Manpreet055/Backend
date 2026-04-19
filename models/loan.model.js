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
    notes: { type: String, trim: true },
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

LoanSchema.pre("save", function () {
  // 1. Align the math: Interest only on the core Principal (this.amount)
  const principal = Number(this.amount);
  const interestRate = Number(this.interest || 0) / 100;
  const flatFees = Number(this.additionalAmount || 0);

  // (50000 * 1.045) + 2500 = 54750
  const totalLoanValue = principal * (1 + interestRate) + flatFees;

  if (this.payments) {
    // Payments already marked "Paid" in the array
    const actualPaidInArray = this.payments
      .filter((p) => p.status === "Paid")
      .reduce((sum, p) => sum + p.amount, 0);

    // Initial payments made before tracking started
    const initialPaidAmount =
      this.debtType === "Loan"
        ? Number(this.paidEmis) * Number(this.emiAmount)
        : 0;

    const totalPaidSoFar = initialPaidAmount + actualPaidInArray;

    // Set the balance accurately
    this.remainingBalance = Math.max(0, totalLoanValue - totalPaidSoFar);

    // Update Status
    if (this.remainingBalance <= 0) {
      this.status = "Closed";
    } else {
      this.status = "Active";
    }
  }
});

const Loan = mongoose.model("Loan", LoanSchema);
export default Loan;
