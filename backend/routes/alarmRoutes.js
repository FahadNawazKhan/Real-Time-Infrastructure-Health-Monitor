import express from "express";
import { DescribeAlarmsCommand } from "@aws-sdk/client-cloudwatch";
import { cloudwatchClient } from "../config/aws.js";

const router = express.Router();

export const fetchAlarmsData = async () => {
  const command = new DescribeAlarmsCommand({
    MaxRecords: 100,
  });

  const response = await cloudwatchClient.send(command);

  return (response.MetricAlarms || []).map((alarm) => ({
    name: alarm.AlarmName,
    description: alarm.AlarmDescription || null,
    metricName: alarm.MetricName,
    namespace: alarm.Namespace,
    state: alarm.StateValue,
    stateReason: alarm.StateReason,
    threshold: alarm.Threshold,
    comparisonOperator: alarm.ComparisonOperator,
    statistic: alarm.Statistic,
    period: alarm.Period,
    evaluationPeriods: alarm.EvaluationPeriods,
    updatedAt: alarm.StateUpdatedTimestamp,
  }));
};

router.get("/", async (req, res) => {
  try {
    const alarms = await fetchAlarmsData();

    res.status(200).json({
      success: true,
      count: alarms.length,
      alarms,
    });
  } catch (error) {
    console.error("CloudWatch alarm error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve CloudWatch alarms",
    });
  }
});

export default router;
