import mongoose from "mongoose";

const driveWatchStateSchema = new mongoose.Schema({
  key: { type: String, unique: true }, // always "drive-watch"
  channelId: String,
  resourceId: String,
  expiration: Date,
  isActive: { type: Boolean, default: false },
});

export default mongoose.model("DriveWatchState", driveWatchStateSchema);