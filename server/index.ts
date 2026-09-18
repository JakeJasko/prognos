import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { apiRouter } from "./routes.js";
import { getDb } from "./db.js";

// Load .env if present
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

// Initialize Database & Schema
getDb();

// Mount REST API
app.use("/api", apiRouter);

const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

function getLocalNetworkIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

app.listen(PORT, "0.0.0.0", () => {
  const lanIp = getLocalNetworkIp();
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                 🌌  PROGNOS LOCAL  🌌                        ║
  ║       Personal & Home Network Forecasting Platform           ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  ➜ Local:   http://localhost:${PORT}                           ║
  ║  ➜ Network: http://${lanIp}:${PORT}                    ║
  ║                                                              ║
  ║  Tip: Open the Network URL on your phone or tablet on Wi-Fi! ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
});
