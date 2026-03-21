import jwt from "jsonwebtoken"
import User from "../models/user.model.js";

export const jwtmiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    
    if (!authHeader) {
        return res.status(401).json({
            error: "Please provide access token",
        });
    }

    // Verifying token
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            error: "Invalid token format",
        });
    }

    try {
        const decodedPayload = jwt.verify(token, process.env.ACCESS_SECRET);
        req.user = decodedPayload;
        next();
    } catch (error) {
        return res.status(401).json({
            error: "Authentication Failed ",
        });
    }
}

export const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.ACCESS_SECRET)
}
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.REFRESH_SECRET)
}

export const generateNewAccessToken = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
        return res.status(401).json({ msg: "Refresh token missing" });
    }
    
    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET   );
        
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(403).json({ msg: "Refresh token is invalid." });
        }

        if (!user.refreshToken.includes(refreshToken)) {
            return res.status(403).json({ msg: "Refresh token is used or invalid." });
        }

        const accessToken = generateAccessToken(decoded);
        return res.status(200).json({ token: accessToken });
    } catch (err) {
        // jwt.verify throws if token is expired/invalid
        return res.status(403).json({ msg: "Invalid or expired refresh token" });
    }
}