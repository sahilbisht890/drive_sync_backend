import { startDriveWatch , stopDriveWatch } from "../services/drive-watch.service.js";

export const startDriveWatchController = async (req, res) => {
  try {
    await startDriveWatch();

    return res.status(200).json({
      success: true,
      message: "Drive watch started successfully",
    });
  } catch (error) {
    console.error("Failed to start Drive watch:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start Drive watch",
      error: error.message,
    });
  }
};

export const stopDriveWatchController = async (req, res) => {
  await stopDriveWatch();

  res.json({ success: true, message: "Drive watch stopped" });
};