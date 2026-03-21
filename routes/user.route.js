import express from "express"
import { jwtmiddleware, generateNewAccessToken } from "../middlewares/authentication.middleware.js"
import { login, signup, getUserById,logoutUser } from "../controllers/user.controller.js"

const router = express()

router.get("/", jwtmiddleware, getUserById)
router.post("/refresh-token", generateNewAccessToken)
router.post("/signup", signup)
router.post("/login", login)
router.post("/logout",jwtmiddleware ,logoutUser)

export default router