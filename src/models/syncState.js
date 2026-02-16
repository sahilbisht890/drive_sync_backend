import mongoose from "mongoose";


const syncStateSchema = new mongoose.Schema({
  key: { type: String, unique: true },

  isRunning: Boolean,
  lastStartedAt: Date,
  lastFinishedAt: Date,
  lastExitCode: Number,
  currentPid: Number,
  lastError: String,
});

export default mongoose.model("SyncState", syncStateSchema);