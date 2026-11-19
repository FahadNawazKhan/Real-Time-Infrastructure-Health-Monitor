import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import instanceRoutes from "./routes/instanceRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import alarmRoutes from "./routes/alarmRoutes.js";
import {
  initTelemetryScheduler,
  getCachedTelemetry,
  collectTelemetry,
} from "./services/schedulerService.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with permissive CORS for local dashboard development
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "CloudPulse API",
    websocketClients: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

// Real-Time Cached Telemetry Endpoint (Single source of truth)
app.get("/api/telemetry", (req, res) => {
  res.status(200).json({
    success: true,
    data: getCachedTelemetry(),
  });
});

// Trigger on-demand sync via REST
app.post("/api/telemetry/sync", async (req, res) => {
  try {
    const updated = await collectTelemetry();
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// EC2 instances
app.use("/api/instances", instanceRoutes);

// Metrics
app.use("/api/metrics", metricsRoutes);

// Alarms
app.use("/api/alarms", alarmRoutes);

const PORT = process.env.PORT || 5000;

// Start single backend scheduler + Socket.IO server
initTelemetryScheduler(io, 10000); // 10-second default polling cadence

server.listen(PORT, () => {
  console.log(`CloudPulse API & Socket.IO server running on port ${PORT}`);
  console.log(`AWS Region: ${process.env.AWS_REGION}`);
});
