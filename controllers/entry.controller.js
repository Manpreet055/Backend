import Entry from "../models/entry.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import ApiError from "../utils/ApiError.js";

export const addTransaction = async (req, res) => {
  const { id } = req.User;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError("Id is not valid", 400);
  }

  try {
    res.status(201).json({ msg: "New Entry Created" });
  } catch (error) {
    throw new ApiError("Internal Server Error", 500);
  }
};
