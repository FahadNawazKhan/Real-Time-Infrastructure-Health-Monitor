import { GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { cloudwatchClient } from "../config/aws.js";

export const getInstanceMetrics = async (instanceId) => {
  const host = process.env.CLOUDWATCH_HOST;

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 10 * 60 * 1000); // 10 min window for CloudWatch reporting lag

  const metricQueries = [
    {
      Id: "cpu",
      MetricStat: {
        Metric: {
          Namespace: "AWS/EC2",
          MetricName: "CPUUtilization",
          Dimensions: [
            {
              Name: "InstanceId",
              Value: instanceId,
            },
          ],
        },
        Period: 60,
        Stat: "Average",
      },
      ReturnData: true,
    },
  ];

  if (host) {
    metricQueries.push(
      {
        Id: "memory",
        MetricStat: {
          Metric: {
            Namespace: "CloudPulse",
            MetricName: "mem_used_percent",
            Dimensions: [
              {
                Name: "host",
                Value: host,
              },
            ],
          },
          Period: 60,
          Stat: "Average",
        },
        ReturnData: true,
      },
      {
        Id: "disk",
        MetricStat: {
          Metric: {
            Namespace: "CloudPulse",
            MetricName: "disk_used_percent",
            Dimensions: [
              {
                Name: "path",
                Value: "/",
              },
              {
                Name: "host",
                Value: host,
              },
              {
                Name: "device",
                Value: "nvme0n1p1",
              },
              {
                Name: "fstype",
                Value: "ext4",
              },
            ],
          },
          Period: 60,
          Stat: "Average",
        },
        ReturnData: true,
      }
    );
  }

  try {
    const command = new GetMetricDataCommand({
      StartTime: startTime,
      EndTime: endTime,
      MetricDataQueries: metricQueries,
      ScanBy: "TimestampDescending",
    });

    const response = await cloudwatchClient.send(command);

    const getLatestValue = (metricId) => {
      const result = response.MetricDataResults?.find(
        (item) => item.Id === metricId
      );

      if (!result || !result.Values?.length) {
        return null;
      }

      const latestIndex = result.Timestamps.reduce(
        (latest, timestamp, index, timestamps) =>
          timestamp > timestamps[latest] ? index : latest,
        0
      );

      const timestamp = result.Timestamps[latestIndex];
      const ageSeconds = Math.round(
        (Date.now() - new Date(timestamp).getTime()) / 1000
      );

      return {
        value: result.Values[latestIndex],
        timestamp,
        ageSeconds,
        isFresh: ageSeconds <= 300, // Considered fresh if within 5 minutes (due to CloudWatch pipeline lag)
      };
    };

    return {
      cpu: getLatestValue("cpu"),
      memory: getLatestValue("memory"),
      disk: getLatestValue("disk"),
    };
  } catch (error) {
    console.error(`CloudWatch metric query failed for instance ${instanceId}:`, error.message);
    return {
      cpu: null,
      memory: null,
      disk: null,
      error: error.message,
    };
  }
};
