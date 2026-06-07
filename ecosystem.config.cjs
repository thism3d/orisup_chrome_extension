/**
 * PM2 config for storefront on VPS.
 * Set PM2_APP_NAME + PORT per site (e.g. orlenbd on 5025, norexbd on 5026).
 */
const path = require("path");

const appName = process.env.PM2_APP_NAME || "orisup";
const port = process.env.PORT || "5026";

module.exports = {
  apps: [
    {
      name: appName,
      cwd: "/home/rokon/web/orisup.com/private/nodeapp",
      script: "dist/index.js",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: port,
      },
    },
  ],
};
