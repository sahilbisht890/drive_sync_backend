import cron from "node-cron";
import DriveWatchState from "../models/driveWatchState.js";
import { startDriveWatch, stopDriveWatch } from "./drive-watch.service.js";

const RENEW_BEFORE_MS = 10 * 60 * 1000; // 1 hour before expiry

export const startDriveWatchCron = () => {
  console.log("Drive watch renewal cron started");

  cron.schedule("*/10 * * * *", async () => {
    try {
      console.log("Checking Drive watch expiration...");

      const state = await DriveWatchState.findOne({ key: "drive-watch" });

      if (!state || !state.isActive) {
        console.log("No active watch found. Starting new one...");
        await startDriveWatch();
        return;
      }

      const now = new Date();
      const timeLeft = new Date(state.expiration) - now;

      console.log("Time left (ms):", timeLeft);

      if (timeLeft <= RENEW_BEFORE_MS) {
        console.log("Drive watch near expiration. Renewing...");

        await stopDriveWatch();
        await startDriveWatch();

        console.log("Drive watch renewed successfully");
      } else {
        console.log("Drive watch still valid");
      }
    } catch (err) {
      console.error("Drive watch renewal error:", err.message);
    }
  });
};