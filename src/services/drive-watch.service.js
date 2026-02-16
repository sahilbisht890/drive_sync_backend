import DriveWatchState from "../models/driveWatchState.js";
import { drive, oauth2Client } from "../config/google.js";
import GoogleCredential from "../models/googleCredentials.js";
import crypto from "node:crypto";
import { runRcloneSync } from "./rclone.service.js";
import updateRcloneConfig from "./update-rclone.service.js";


const webhookUrl = `${process.env.BACKEND_URL}/webhook/drive`;
export const startDriveWatch = async () => {
  try {
    if (!webhookUrl) {
      throw new Error("DRIVE_WEBHOOK_URL is not configured");
    }

    const existing = await DriveWatchState.findOne({ key: "drive-watch" });

    if (
      existing?.isActive &&
      existing?.expiration &&
      new Date(existing.expiration) > new Date()
    ) {
      console.log("Drive watch already active — skipping");
      return;
    }

    const cred = await GoogleCredential.findOne();
    if (!cred) {
      throw new Error("No Google credentials found");
    }

    oauth2Client.setCredentials({
      access_token: cred.access_token,
      refresh_token: cred.refresh_token,
      expiry_date: cred.expiry_date,
    });

    if (!cred.expiry_date || Date.now() >= cred.expiry_date) {
      console.log("Access token expired. Refreshing before watch...");

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

      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: cred.refresh_token,
        expiry_date: credentials.expiry_date,
      });

      console.log("Token refreshed successfully");
    }

    if (!cred.pageToken) {
      throw new Error("Missing Drive pageToken");
    }

    const channelId = crypto.randomUUID();

    const res = await drive.changes.watch({
      pageToken: cred.pageToken,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
      },
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,

    });

    if (!res?.data?.resourceId || !res?.data?.expiration) {
      throw new Error("Invalid response from Drive watch API");
    }

    await DriveWatchState.findOneAndUpdate(
      { key: "drive-watch" },
      {
        channelId,
        resourceId: res.data.resourceId,
        expiration: new Date(Number(res.data.expiration)),
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log("Drive watch started:", {
      channelId,
      resourceId: res.data.resourceId,
      expiration: res.data.expiration,
    });
  } catch (error) {
    console.error("startDriveWatch error:", error.message);
    throw error;
  }
};


let debounceTimer = null;
let syncQueued = false;


const isFileInsideFolder = async (fileId, targetFolderId) => {
  try {
    let currentId = fileId;
    const visited = new Set();

    while (currentId) {
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const res = await drive.files.get({
        fileId: currentId,
        fields: "id, parents",
        supportsAllDrives: true,
      });

      const parents = res.data.parents;
      if (!parents || parents.length === 0) return false;

      if (parents.includes(targetFolderId)) return true;

      currentId = parents[0]; // move upward
    }

    return false;
  } catch (err) {
    console.error("Folder traversal error:", err.message);
    return false;
  }
};

export const onDriveChange = async () => {
  try {
    if (syncQueued) return;

    console.log("Drive change webhook received");

    const cred = await GoogleCredential.findOne();
    if (!cred?.pageToken) {
      console.log("No stored pageToken");
      return;
    }

    oauth2Client.setCredentials({
      access_token: cred.access_token,
      refresh_token: cred.refresh_token,
      expiry_date: cred.expiry_date,
    });

    const folder1Id = process.env.DRIVE_FOLDER_SRC_ID;
    if (!folder1Id) {
      throw new Error("DRIVE_FOLDER_SRC_ID not configured");
    }

    // IMPORTANT: include Shared Drive support
    const changesRes = await drive.changes.list({
      pageToken: cred.pageToken,
      spaces: "drive",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      fields:
        "nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, parents, trashed))",
    });

    const changes = changesRes.data.changes || [];

    let shouldSync = false;



    for (const change of changes) {
  const fileId = change.fileId;

  if (!fileId) continue;

  const isInside = await isFileInsideFolder(fileId, folder1Id);

  if (isInside) {
    console.log("Relevant change detected (including delete)");
    shouldSync = true;
    break;
  }
}

    // ALWAYS update pageToken immediately
    const newToken =
      changesRes.data.newStartPageToken || changesRes.data.nextPageToken;

    if (newToken) {
      await GoogleCredential.updateOne({}, { pageToken: newToken });
    }

    if (!shouldSync) {
      console.log("No relevant folder changes detected");
      return;
    }

    syncQueued = true;

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      try {
        console.log("Starting rclone sync...");
        await runRcloneSync();
        console.log("Rclone sync completed");
      } catch (error) {
        console.error("Rclone sync failed:", error.message);
      } finally {
        syncQueued = false;
      }
    }, 8000); // 8 sec debounce

  } catch (error) {
    console.error("onDriveChange error:", error.message);
  }
};

export const stopDriveWatch = async () => {
  try {
    const state = await DriveWatchState.findOne({ key: "drive-watch" });

    if (!state?.channelId || !state?.resourceId) {
      console.log("No active Drive watch to stop");
      return;
    }

    const cred = await GoogleCredential.findOne();
    if (!cred) {
      throw new Error("No Google credentials found");
    }

    oauth2Client.setCredentials({
      access_token: cred.access_token,
      refresh_token: cred.refresh_token,
    });

    await drive.channels.stop({
      requestBody: {
        id: state.channelId,
        resourceId: state.resourceId,
      },
    });

    await DriveWatchState.updateOne(
      { key: "drive-watch" },
      { isActive: false }
    );

    console.log("Drive watch stopped:", state.channelId);
  } catch (error) {
    console.error("stopDriveWatch error:", error.message);
    throw error;
  }
};