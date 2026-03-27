import express from "express";
import {
  jwtmiddleware,
  generateNewAccessToken,
} from "../middlewares/authentication.middleware.js";
import {
  login,
  signup,
  getUserById,
  logoutUser,
  updateUser,
} from "../controllers/user.controller.js";

const router = express();

router
  .route("/")
  .get(jwtmiddleware, getUserById)
  .patch(jwtmiddleware, updateUser);
router.post("/refresh-token", generateNewAccessToken);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", jwtmiddleware, logoutUser);

export default router;
