import { Router, type IRouter } from "express";
import { login, logout, currentUser, rateLimitLogin, requireAuth } from "../lib/auth";

const router: IRouter = Router();

// POST /api/auth/login — rate-limited credential check
router.post("/auth/login", rateLimitLogin, login);

// POST /api/auth/logout — invalidate the current session
router.post("/auth/logout", requireAuth, logout);

// GET /api/auth/me — current session identity
router.get("/auth/me", requireAuth, currentUser);

export default router;