import { GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { cloudwatchClient } from "../config/aws.js";

// Helper to construct a metric query object
const query = (Id, Namespace, MetricName, Dimensions) => ({
  Id,
  MetricStat: {
    Metric: { Namespace, MetricName, Dimensions },
    Period: 60,
    Stat: "Average",
  },
  ReturnData: true,
});

// Helper to format the latest metric data point
const format = (results, id, freshSec = 300) => {
  const match = results?.find((r) => r.Id === id);
  if (!match?.Values?.length) return null;

  const timestamp = match.Timestamps[0];
  const ageSeconds = Math.round((Date.now() - new Date(timestamp).getTime()) / 1000);

  return {
    value: Number(match.Values[0].toFixed(1)),
    timestamp,
    ageSeconds,
    isFresh: ageSeconds <= freshSec,
  };
};

export const getInstanceMetrics = async (instanceId) => {
  try {
    const { MetricDataResults = [] } = await cloudwatchClient.send(
      new GetMetricDataCommand({
        StartTime: new Date(Date.now() - 15 * 60 * 1000), // 15 min window
        EndTime: new Date(),
        ScanBy: "TimestampDescending",
        MetricDataQueries: [
          query("cpu", "AWS/EC2", "CPUUtilization", [{ Name: "InstanceId", Value: instanceId }]),
          query("memory", "CloudPulse", "mem_used_percent", [{ Name: "InstanceId", Value: instanceId }]),
          query("disk", "CloudPulse", "disk_used_percent", [
            { Name: "path", Value: "/" },
            { Name: "InstanceId", Value: instanceId },
            { Name: "device", Value: "nvme0n1p1" },
            { Name: "fstype", Value: "ext4" },
          ]),
        ],
      })
    );

    return {
      cpu: format(MetricDataResults, "cpu", 600),
      memory: format(MetricDataResults, "memory"),
      disk: format(MetricDataResults, "disk"),
    };
  } catch (err) {
    console.error(`Metric query failed for ${instanceId}:`, err.message);
    return { cpu: null, memory: null, disk: null, error: err.message };
  }
};
