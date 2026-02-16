import express from "express";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { connectDB } from "./config/mongoDB.js";
import { startDriveWatchCron } from "./services/drive-watch-renewal.service.js";
import authRoutes from "./routes/auth.routes.js";
import { driveWebhook } from "./webhooks/drive.webhook.js";
import { startGoogleTokenCron } from "./services/googleTokenRefresh.service.js";

await connectDB();
const app = express();

app.use("/auth", authRoutes);
app.post("/webhook/drive", driveWebhook);

startGoogleTokenCron();
startDriveWatchCron();

app.get("/", (req, res) => res.send("Drive Sync API is running"));

app.listen(process.env.PORT, () =>
  console.log(`Server running on ${process.env.PORT}`)
);