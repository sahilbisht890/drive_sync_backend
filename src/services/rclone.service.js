import path from "path";
import { spawn } from "child_process";
import crypto from "node:crypto";
import SyncState from "../models/syncState.js";
import SyncLog from "../models/syncLog.js";
import fs from "fs";

let fileLogs = "";

const ROOT_PATH = process.cwd();
const RCLONE_CONFIG_PATH = path.join(ROOT_PATH, "rclone.config");

export const runRcloneSync = async () => {
  const rclonePath = process.env.RCLONE_PATH;

  const SRC = `gdrive:${process.env.DRIVE_FOLDER_SRC_NAME}`;
  const DEST = `gdrive:${process.env.DRIVE_FOLDER_DEST_NAME}`;

  const isMyDrive = process.env.DRIVE_IS_MYDRIVE === "true";

  if (!rclonePath || !SRC || !DEST) {
    throw new Error("Rclone environment variables not configured properly");
  }

  const runId = crypto.randomUUID();
  let fullLogs = "";
  const logFilePath = path.join(ROOT_PATH, `rclone-${runId}.log`);

  try {
    const state = await SyncState.findOne({ key: "drive-sync" });

    if (state?.isRunning && state.currentPid) {
      try {
        process.kill(state.currentPid);
      } catch {}
    }

    await SyncState.findOneAndUpdate(
      { key: "drive-sync" },
      {
        isRunning: true,
        lastStartedAt: new Date(),
        lastExitCode: null,
        currentPid: null,
        lastError: null,
      },
      { upsert: true },
    );

    const logDoc = await SyncLog.create({
      runId,
      startedAt: new Date(),
    });

    return new Promise((resolve, reject) => {
      const args = [
        "--config",
        RCLONE_CONFIG_PATH,
        "sync",
        SRC,
        DEST,
        "--ignore-existing",
        "--create-empty-src-dirs",
        "--checksum",
        "--log-level",
        "DEBUG",
        "--log-file",
        logFilePath,
      ];

      // If NOT My Drive, enable shared-with-me mode
      if (!isMyDrive) {
        args.push("--drive-shared-with-me");
      }

      const rclone = spawn(rclonePath, args, {
        windowsHide: true,
      });

      SyncState.updateOne(
        { key: "drive-sync" },
        { currentPid: rclone.pid },
      ).exec();

      rclone.stdout.on("data", (data) => {
        fullLogs += data.toString();
      });

      rclone.stderr.on("data", (data) => {
        fullLogs += data.toString();
      });

      rclone.on("error", async (err) => {
        await SyncState.updateOne(
          { key: "drive-sync" },
          {
            isRunning: false,
            lastFinishedAt: new Date(),
            lastExitCode: -1,
            currentPid: null,
            lastError: err.message,
          },
        );

        await SyncLog.updateOne(
          { _id: logDoc._id },
          {
            finishedAt: new Date(),
            exitCode: -1,
            logs: fullLogs,
            error: err.message,
          },
        );

        reject(err);
      });

      rclone.on("close", async (code) => {
        await SyncState.updateOne(
          { key: "drive-sync" },
          {
            isRunning: false,
            lastFinishedAt: new Date(),
            lastExitCode: code,
            currentPid: null,
            lastError: code === 0 ? null : "rclone exited with error",
          },
        );
        try {
          fileLogs = fs.readFileSync(logFilePath, "utf8");
        } catch (e) {
          fileLogs = "No log file generated";
        }

        await SyncLog.updateOne(
          { _id: logDoc._id },
          {
            finishedAt: new Date(),
            exitCode: code,
            logs: fileLogs,
            error: code === 0 ? null : "rclone exited with error",
          },
        );

        try {
          if (fs.existsSync(logFilePath)) {
            fs.unlinkSync(logFilePath);
            console.log("Log file deleted:", logFilePath);
          }
        } catch (err) {
          console.error("Failed to delete log file:", err.message);
        }

        if (code === 0) resolve();
        else reject(new Error(`rclone exited with code ${code}`));
      });
    });
  } catch (error) {
    await SyncState.updateOne(
      { key: "drive-sync" },
      {
        isRunning: false,
        lastFinishedAt: new Date(),
        lastExitCode: -1,
        currentPid: null,
        lastError: error.message,
      },
    );

    throw error;
  }
};
