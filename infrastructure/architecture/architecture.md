# CloudPulse Infrastructure Architecture

## Overview

CloudPulse is a real-time infrastructure health dashboard. AWS provides the infrastructure metrics and alarms. The Node.js backend retrieves and evaluates that information, then distributes updates to the React dashboard.

## Data flow

```text
                    AWS
  +------------------------------------------+
  |                                          |
  |  EC2 Ubuntu instance                     |
  |       |                                  |
  |       +-- CloudWatch Agent                |
  |       |      +-- Memory metric            |
  |       |      +-- Disk metric              |
  |       |                                  |
  |       +-- EC2 monitoring                  |
  |              +-- CPU metric               |
  |                                          |
  |  CloudWatch Metrics and Alarms            |
  |       |                                  |
  |       +-- Alarm actions --> SNS --> Email |
  +-------------------|----------------------+
                      |
                      v
             Node.js / Express backend
             +-----------------------+
             | AWS SDK clients       |
             | Telemetry scheduler   |
             | Freshness evaluation  |
             | Health evaluation     |
             | In-memory cache       |
             | Socket.IO server      |
             +-----------|-----------+
                         |
               REST API + Socket.IO
                         |
                         v
                React dashboard
                +----------------+
                | KPI summaries  |
                | Metric cards   |
                | Recharts       |
                | EC2 inventory  |
                | Alarm table    |
                +----------------+
```

## Main responsibilities

### EC2

Runs the Ubuntu server being monitored.

### CloudWatch Agent

Publishes custom memory and disk utilization metrics to the `CloudPulse` namespace.

### CloudWatch

Provides EC2 CPU metrics, stores custom metrics, and evaluates configured metric alarms.

### SNS

Delivers email notifications for CloudWatch alarm actions.

### Backend

Uses the AWS SDK to retrieve EC2 inventory, metrics, and alarm state. A centralized scheduler collects and evaluates telemetry, caches the latest result, and broadcasts updates through Socket.IO.

### Frontend

Displays the latest telemetry, instance inventory, health indicators, charts, and alarm information.

## Real-time behavior

Socket.IO pushes updates from the backend to connected browser clients. The scheduler controls AWS collection, so each browser does not independently call AWS APIs.

The scheduler interval controls how often the backend requests data. It does not force CloudWatch to publish new datapoints at that same frequency.

## Current limitations

- The telemetry cache is in process memory and is lost when the backend restarts.
- A single-process scheduler is assumed. Multiple backend replicas require distributed coordination to avoid duplicate collection.
- Historical metric persistence is not included in the current scope.
- The current CloudWatch custom metric host mapping is configured for the monitored host and should be made dynamic before monitoring multiple instances.
- Terraform provisioning is not yet implemented.

## Design principle

Treat missing, stale, or inaccessible metrics as unknown/degraded telemetry. Never convert unavailable metrics into zero utilization or silently present old datapoints as current.
