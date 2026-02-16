import mongoose from "mongoose";

const GoogleCredentialSchema = new mongoose.Schema({
  userId: String,
  email: String,
  username: String,
  access_token: String,
  refresh_token: String,
  expiry_date: Number,
  scope: String,
  pageToken: String,
}, { timestamps: true });

export default mongoose.model("GoogleCredential", GoogleCredentialSchema);