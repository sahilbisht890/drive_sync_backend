import { oauth2Client } from "../config/google.js";
import GoogleCredential from "../models/googleCredentials.js";
import updateRcloneConfig from "./update-rclone.service.js";
import cron from "node-cron";
import { runRcloneSync } from "./rclone.service.js";

const BUFFER = 10 * 60 * 1000; // 10 minutes


export const refreshGoogleAccessTokenIfNeeded = async () => {
  try {
    const cred = await GoogleCredential.findOne();
    if (!cred) throw new Error("No Google credentials found");

    oauth2Client.setCredentials({
      access_token: cred.access_token,
      refresh_token: cred.refresh_token,
      expiry_date: cred.expiry_date,
    });

    

    if (!cred.expiry_date || Date.now() >= cred.expiry_date - BUFFER) {
      console.log("Google token expired/expiring, refreshing...");

      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials?.access_token) {
        throw new Error("Failed to refresh access token");
      }

      await GoogleCredential.findOneAndUpdate(
        {},
        {
          access_token: credentials.access_token,
          expiry_date: credentials.expiry_date,
        }
      );

      await updateRcloneConfig({
        access_token: credentials.access_token,
        refresh_token: cred.refresh_token,
        expiry_date: credentials.expiry_date,
      });

      await runRcloneSync();
      console.log("Google token refreshed & rclone config updated");
    } else {
      console.log("Google token still valid");
    }
  } catch (error) {
    console.error("refreshGoogleAccessTokenIfNeeded error:", error.message);
  }
};


export const startGoogleTokenCron = () => {
  // Runs every 15 minutes
  cron.schedule("*/10 * * * *", async () => {
    console.log("Running Google token refresh cron...");
    await refreshGoogleAccessTokenIfNeeded();
  });
};
