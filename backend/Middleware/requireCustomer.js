import { verifyAdminToken } from "../utils/adminToken.js";
import User from "../models/User.js";

async function readCustomer(req, res, next, optional) {
  try {
    const header = req.get("Authorization") || "";
    if (!header && optional) return next();
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (!match) return res.status(401).json({ success: false, message: "Customer sign in is required." });
    const payload = verifyAdminToken(match[1]);
    const user = await User.findById(payload.sub);
    if (!user || user.accountStatus !== "active") return res.status(401).json({ success: false, message: "This customer account is unavailable." });
    if (user.role !== "customer") return res.status(403).json({ success: false, message: "Customer access is required." });
    req.customer = { id: user.id, email: user.email, fullName: user.fullName };
    return next();
  } catch (error) {
    const status = Number(error.status) || 401;
    return res.status(status).json({ success: false, message: status === 503 ? error.message : "Customer session is invalid or expired." });
  }
}

export function requireCustomer(req, res, next) { return readCustomer(req, res, next, false); }
export function optionalCustomer(req, res, next) { return readCustomer(req, res, next, true); }
export default requireCustomer;
