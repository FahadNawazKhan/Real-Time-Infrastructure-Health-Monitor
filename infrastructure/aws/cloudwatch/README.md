# Amazon CloudWatch

CloudPulse reads standard EC2 CPU metrics and custom memory/disk metrics published by the CloudWatch Agent.

## Metric sources

| Metric | Namespace | Metric name | Dimensions |
|---|---|---|---|
| CPU | `AWS/EC2` | `CPUUtilization` | `InstanceId` |
| Memory | `CloudPulse` | `mem_used_percent` | `host` |
| Disk | `CloudPulse` | `disk_used_percent` | `path`, `host`, `device`, `fstype` |

The custom namespace is `CloudPulse`.

## CloudWatch Agent

The agent configuration is stored in `agent-config.json`. It publishes memory and root filesystem disk utilization every 60 seconds.

The `host` dimension for the configured instance was `ip-172-31-1-242`. The backend currently resolves this through its environment configuration. If the monitored host changes, update the backend's host-to-instance mapping rather than assuming every EC2 instance shares the same hostname.

## Verify metrics

List the CPU metric:

```bash
aws cloudwatch list-metrics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --region ap-south-1
```

List custom memory metrics:

```bash
aws cloudwatch list-metrics \
  --namespace CloudPulse \
  --metric-name mem_used_percent \
  --region ap-south-1
```

List custom disk metrics:

```bash
aws cloudwatch list-metrics \
  --namespace CloudPulse \
  --metric-name disk_used_percent \
  --region ap-south-1
```

## Alarms

The project created these metric alarms:

- `CloudPulse-High-Memory`: memory utilization above 80%.
- `CloudPulse-High-Disk`: disk utilization above 80%.

Both use a 60-second period and two evaluation periods, and notify the `cloudpulse-alerts` SNS topic.

## Freshness note

A backend polling interval does not change the publication interval of CloudWatch metrics. A repeated datapoint is not a new measurement. Use the CloudWatch datapoint timestamp to calculate metric age.
