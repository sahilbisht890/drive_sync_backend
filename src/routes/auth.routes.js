import express from "express";
import { getAuthUrl , handleOAuthCallback } from "../services/auth.service.js";
import { startDriveWatchController , stopDriveWatchController } from "../controllers/authController.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/google", (req, res) => {
  const key = req.query.key;
  if (key !== process.env.AUTH_SECRET) {
    return res.status(403).json({ message: "Forbidden" });
  }
  res.redirect(getAuthUrl());
});

router.get("/google/callback", async (req, res) => {
  await handleOAuthCallback(req.query.code);
  res.send("Google Drive Connected");
});

router.get("/start-drive-watch", authMiddleware , startDriveWatchController);
router.get("/stop-drive-watch", authMiddleware , stopDriveWatchController);



export default router;