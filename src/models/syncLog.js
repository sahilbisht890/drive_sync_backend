import mongoose from "mongoose";

const syncLogSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      unique: true, // this should be unique instead
      index: true,
    },

    startedAt: Date,
    finishedAt: Date,

    exitCode: Number,

    logs: {
      type: String,
      default: "",
    },

    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SyncLog", syncLogSchema);