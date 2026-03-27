import User from "../models/user.model.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";
import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../middlewares/authentication.middleware.js";

export const getUserById = async (req, res) => {
  const { id } = req.user;

  try {
    const user = await User.findById(id).populate("transactions").lean();
    if (!user || user.matchedCount === 0)
      res.status(404).json({
        msg: "user not found",
      });

    res.status(200).json({
      msg: "user found",
      user,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Server Error:" + error.message,
    });
  }
};

export const signup = async (req, res) => {
  let { fullName, email, password } = req.body;
  const saltRounds = 10;
  // const salt = bcrypt.genSalt(saltRounds)
  password = await bcrypt.hash(password, saltRounds);
  try {
    if (!fullName || !email || !password) {
      throw new Error("Please provide all the field..");
    }
    const createUser = await User.create({ fullName, email, password });

    const payload = {
      id: createUser.id,
      fullName: createUser.fullName,
      email: createUser.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    createUser.refreshToken = [refreshToken];

    await createUser.save();

    res.status(201).json({
      msg: "User Created",
      user: createUser,
      token: accessToken,
    });
  } catch (error) {
    console.log("Error occured", error.message);
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);

  try {
    if (!email || !password) {
      throw new Error("Please provide both email and password");
    }
    const user = await User.findOne({ email }).populate("transactions");
    if (!user || user?.matchedCount === 0) {
      return res.status(404).json({
        msg: "User not found",
      });
    }
    const verifyPassword = await bcrypt.compare(password, user.password);
    if (!verifyPassword) {
      return res.status(401).json({
        msg: "Password is wrong...",
      });
    }

    const payload = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    user.refreshToken = [...user.refreshToken, refreshToken];

    await user.save();

    res.status(200).json({
      msg: "Login Successfull",
      user,
      token: accessToken,
    });
  } catch (error) {
    console.log(error.message);
  }
};

export const logoutUser = async (req, res) => {
  const { id } = req?.user;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Id is not valid", 400);
  }

  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.sendStatus(204);
  }

  await User.findByIdAndUpdate(id, {
    $pull: { refreshToken: refreshToken },
  }).lean();

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.sendStatus(204);
};

export const updateUser = async (req, res, next) => {
  const id = req?.user?.id;
  try {
    const { preferredCurrency } = req.body;

    if (!preferredCurrency) {
      throw new ApiError("Missing currency data", 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { preferredCurrency } },
      { new: true, runValidators: true }, // "new" returns the updated doc
    ).populate("transactions");

    if (!user) throw new ApiError("User not Found", 404);

    res.status(200).json({
      msg: "User profile updated",
      user,
    });
  } catch (error) {
    // In Express async handlers, always use next(error)
    next(error);
  }
};
