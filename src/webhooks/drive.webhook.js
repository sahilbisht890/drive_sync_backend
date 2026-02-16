import { onDriveChange } from "../services/drive-watch.service.js";

export const driveWebhook = async (req, res) => {
  res.status(200).send("OK");

  onDriveChange().catch(console.error);
};