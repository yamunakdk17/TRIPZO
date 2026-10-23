import { verifyAdminToken } from "../utils/adminToken.js";
import User from "../models/User.js";

export default async function requireAdmin(req, res, next) {
  try {
    const match = /^Bearer\s+(.+)$/i.exec(req.get("Authorization") || "");
    if (!match) return res.status(401).json({ success: false, message: "Admin sign in is required." });
    const payload = verifyAdminToken(match[1]);
    const user = await User.findById(payload.sub);
    if (!user || user.accountStatus !== "active") {
      return res.status(401).json({ success: false, message: "This account is unavailable." });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Administrator access is required." });
    }
    req.admin = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
    return next();
  } catch (error) {
    const status = Number(error.status) || 401;
    return res.status(status).json({ success: false, message: status === 503 ? error.message : "Admin session is invalid or expired." });
  }
}
