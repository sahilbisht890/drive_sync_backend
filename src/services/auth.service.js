import { oauth2Client } from "../config/google.js";
import GoogleCredential from "../models/googleCredentials.js";
import { google } from "googleapis";
import updateRcloneConfig from "./update-rclone.service.js";

/**
 * Generate Google OAuth URL
 */
export const getAuthUrl = () => {
  try {
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      hd: "cachelabs.io",
    });
  } catch (error) {
    console.error("Error generating auth URL:", error.message);
    throw new Error("Failed to generate Google authentication URL");
  }
};

/**
 * Handle Google OAuth callback
 */
export const handleOAuthCallback = async (code) => {
  if (!code) {
    throw new Error("Authorization code is required");
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens || !tokens.access_token) {
      throw new Error("Failed to retrieve access token from Google");
    }

    oauth2Client.setCredentials(tokens);

    //  Get authenticated user email
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data: userInfo } = await oauth2.userinfo.get();
    const email = userInfo?.email;

    if (!email) {
      throw new Error("Unable to fetch user email from Google");
    }

    //  Restrict domain access
    if (!email.endsWith("@cachelabs.io")) {
      throw new Error("Unauthorized domain. Only cachelabs.io allowed.");
    }

    //  Get Drive start page token
    const driveClient = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    const { data } = await driveClient.changes.getStartPageToken();

    if (!data?.startPageToken) {
      throw new Error("Failed to retrieve Drive start page token");
    }

    //  Persist credentials in DB
    await GoogleCredential.findOneAndUpdate(
      {},
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date,
        email,
        pageToken: data.startPageToken,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Update rclone config
    await updateRcloneConfig({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    console.info(`OAuth completed successfully for: ${email}`);

    return {
      success: true,
      email,
      message: "Google OAuth completed successfully",
    };
  } catch (error) {
    console.error("OAuth Callback Error:", {
      message: error.message,
      stack: error.stack,
    });

    throw new Error(
      error?.response?.data?.error_description ||
        error.message ||
        "Google OAuth authentication failed"
    );
  }
};