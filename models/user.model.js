import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minLength: [2, "Name is too short"],
      maxLength: [50, "Name is too long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [8, "Password must be at least 8 characters"],
    },
    // Financial Overview Fields
    totalBalance: {
      type: Number,
      default: 0,
    },
    totalExpenses: {
      type: Number,
      default: 0,
    },
    totalIncome: {
      type: Number,
      default: 0,
    },
    totalDebt: {
      type: Number,
      default: 0,
    },
    preferredCurrency: {
      code: {
        type: String,
        default: "USD",
        uppercase: true,
        trim: true,
      },
      symbol: {
        type: String,
        default: "$",
      },
      name: {
        type: String,
        default: "US Dollar",
      },
    },
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Entry",
      },
    ],
    lastMonthBalance: {
      type: Number,
      default: 0,
    },
    lastMonthIncome: {
      type: Number,
      default: 0,
    },
    lastMonthExpense: {
      type: Number,
      default: 0,
    },

    lastMonthDebt: {
      type: Number,
      default: 0,
    },

    refreshToken: [
      {
        type: String,
      },
    ],
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);
export default User;
