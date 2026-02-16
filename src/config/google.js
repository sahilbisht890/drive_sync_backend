import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const callbackURL = `${process.env.BACKEND_URL}/auth/google/callback`;
export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  callbackURL
);

export const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});