
import express from "express";
import { getInstanceMetrics } from "../services/cloudwatchService.js";

const router = express.Router();

router.get("/:instanceId", async (req, res) => {
  try {
    const { instanceId } = req.params;

    const metrics = await getInstanceMetrics(instanceId);

    res.status(200).json({
      success: true,
      instanceId,
      metrics,
    });
  } catch (error) {
    console.error("CloudWatch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve CloudWatch metrics",
    });
  }
});

export default router;
