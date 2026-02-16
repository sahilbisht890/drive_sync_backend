import fs from "fs";
import path from "path";

function updateRcloneConfig({ access_token, refresh_token, expiry_date }) {
  const configPath = path.join(process.cwd(), "rclone.config");

  const tokenObj = {
    access_token,
    token_type: "Bearer",
    refresh_token,
    expiry: new Date(expiry_date).toISOString(),
  };

  const content = `
[gdrive]
type = drive
scope = drive
token = ${JSON.stringify(tokenObj)}
`.trim();

  fs.writeFileSync(configPath, content, "utf8");
}

export default updateRcloneConfig;
