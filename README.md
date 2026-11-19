# CloudPulse — Real-Time Infrastructure Health Monitor

A developer-focused, low-latency infrastructure monitoring system bridging **AWS EC2** and **CloudWatch** metrics with **Socket.IO** real-time broadcasts.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │                AWS EC2                │
                      │  (Instances: web-prod, api-gateway)   │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │    CloudWatch Agent (CWAgent)         │
                      │  (Memory & Disk -> CloudPulse NS)     │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
                      ┌───────────────────────────────────────┐
                      │      AWS CloudWatch Telemetry         │
                      │  • AWS/EC2 CPUUtilization             │
                      │  • CloudPulse mem_used_percent        │
                      │  • CloudPulse disk_used_percent       │
                      │  • Metric Alarms (DescribeAlarms)     │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Node.js Backend (Express 5)                           │
│                                                                             │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │ Metric Collection Scheduler     │   │ Health Evaluation Engine        │  │
│  │ • Single Poller (every 10s)     │──▶│ • 0–100 Health Score            │  │
│  │ • Queries AWS once for N users  │   │ • Threshold Breaches & Alarms   │  │
│  │ • Calculates Metric Freshness   │   │ • Status: Healthy/Warn/Critical │  │
│  └─────────────────────────────────┘   └─────────────────────────────────┘  │
│                                        │                                    │
│                                        ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       Socket.IO Server (Port 5000)                    │  │
│  │  • Broadcasts telemetry:update on scheduler tick                      │  │
│  │  • Emits telemetry:init immediately on client handshake               │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       │ WebSocket stream (Port 5000)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 React Dashboard (Vite 6 + Tailwind CSS)                     │
│                                                                             │
│  • Global Navbar with live WebSocket connection dot & freshness lag (sec)   │
│  • 4-Stat KPI Strip: Health Score, Discovered EC2, Running Fleet, Alarms    │
│  • Live Telemetry Focus: CPU/RAM/Disk gauges, SSH helper, Recharts Area     │
│  • EC2 Compute Inventory: Searchable, state-filtered 7-column table         │
│  • CloudWatch Metric Alarms: Console-style tabular viewer with state reasons│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Core Architectural Principle: Single Backend Scheduler

In traditional monitoring setups, every active browser tab independently polls AWS APIs, which multiplies API calls ($N \times \text{clients}$) and risks hitting AWS API rate limits or incurring unexpected CloudWatch costs.

**CloudPulse implements a single, centralized backend scheduler**:
1. The backend scheduler queries AWS CloudWatch and EC2 **once per interval** (default: 10s).
2. The **Health Evaluation Engine** analyzes alarm triggers and CPU/memory/disk saturation.
3. The server computes **Metric Freshness** lag based on CloudWatch data point timestamps.
4. The server broadcasts a unified payload to all connected WebSocket clients (`io.emit('telemetry:update')`).
5. When a new browser tab opens, it immediately receives the latest evaluated state (`socket.emit('telemetry:init')`) with zero wait time.

---

## Directory Structure

```
Real-Time-Infrastructure-Health-Monitor/
├── backend/
│   ├── config/
│   │   └── aws.js               # Centralized EC2Client & CloudWatchClient initialization
│   ├── routes/
│   │   ├── alarmRoutes.js       # CloudWatch alarms route & fetchAlarmsData() helper
│   │   ├── instanceRoutes.js    # EC2 instances route & fetchInstancesData() helper
│   │   └── metricsRoutes.js     # Instance metrics REST route (/api/metrics/:instanceId)
│   ├── services/
│   │   ├── cloudwatchService.js # GetMetricData queries (CPU, RAM, Disk) & lag calculation
│   │   └── schedulerService.js  # Central scheduler, health evaluation, Socket.IO broadcast
│   ├── .env                     # Local environment config (PORT, AWS_REGION, CLOUDWATCH_HOST)
│   ├── package.json             # Backend dependencies (express, socket.io, @aws-sdk/...)
│   └── server.js                # HTTP + Socket.IO server entrypoint (Port 5000)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Top bar with WebSocket status & freshness lag indicator
│   │   │   ├── MetricsBar.jsx        # 4-card KPI strip with Health Evaluation Score
│   │   │   ├── InstanceTelemetry.jsx # Active node focus: CPU/RAM/Disk gauges & AreaChart
│   │   │   ├── InstanceTable.jsx     # Full-width 7-column EC2 table with search & state tabs
│   │   │   └── AlarmsTable.jsx       # Tabular CloudWatch alarms viewer with trigger reasons
│   │   ├── api.js                    # REST API client & manual sync helpers
│   │   ├── socket.js                 # Socket.IO client connection manager (auto-reconnect)
│   │   ├── App.jsx                   # Central state orchestrator (WebSocket + UI layout)
│   │   ├── index.css                 # Clean developer theme & typography
│   │   └── main.jsx
│   ├── vite.config.js                # Vite config with /api proxy to http://localhost:5000
│   └── package.json                  # Frontend dependencies (react, socket.io-client, recharts)
│
├── infrastructure/                   # Reserved for IaC (Terraform) & CWAgent configuration
├── package.json                      # Root workspace scripts
└── README.md                         # Project documentation
```

---

## API & WebSocket Reference

### 1. WebSocket Events (`socket.io`)

| Direction | Event Name | Payload Description |
| :--- | :--- | :--- |
| **Server ➔ Client** | `telemetry:init` | Emitted immediately upon client handshake with the current cached state. |
| **Server ➔ Client** | `telemetry:update` | Broadcast every 10 seconds with updated instances, metrics, alarms, and health. |
| **Client ➔ Server** | `telemetry:request_refresh` | Requests the backend scheduler to run an immediate AWS collection cycle. |

### 2. REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns service status, timestamp, and active WebSocket client count. |
| `GET` | `/api/telemetry` | Returns the single source of truth cached telemetry payload. |
| `POST` | `/api/telemetry/sync` | Triggers a fresh collection cycle and returns updated telemetry. |
| `GET` | `/api/instances` | Returns all EC2 instances discovered in the configured AWS region. |
| `GET` | `/api/metrics/:instanceId` | Queries CloudWatch for CPU, memory, and disk telemetry for a specific instance. |
| `GET` | `/api/alarms` | Returns all CloudWatch metric alarms and state reason descriptions. |

---

## Health Evaluation & Metric Freshness

### Health Scoring Algorithm
The backend evaluator computes an automated **0–100 Health Score**:
- **Baseline**: Starts at `100`.
- **Active Alarms**: Each alarm in state `ALARM` deducts `25` points.
- **CPU Saturation**: Any instance with CPU $\ge 85\%$ deducts `20` points ($\ge 70\%$ deducts `10` points).
- **Memory Saturation**: Any instance with RAM $\ge 90\%$ deducts `20` points ($\ge 80\%$ deducts `10` points).
- **Disk Saturation**: Any instance with root disk $\ge 90\%$ deducts `20` points.
- **Categorization**:
  - `Healthy`: Score 80–100
  - `Warning`: Score 50–79
  - `Critical`: Score 0–49
  - `Degraded`: Network timeouts or AWS credential errors

### Metric Freshness Lag
CloudWatch metric data points have an intrinsic pipeline delay (typically 60–120 seconds for standard resolution). CloudPulse calculates exact pipeline latency:
$$\text{ageSeconds} = \text{round}\left(\frac{\text{Date.now()} - \text{timestamp}}{1000}\right)$$
- If $\text{ageSeconds} \le 300\text{s}$, the reading is flagged as `isFresh: true`.
- If readings are older, the UI flags the exact lag duration (`Lag: 4m ago`) to ensure operational awareness.

---

## Prerequisites & AWS Setup

### 1. AWS IAM Permissions
The credentials running the backend (configured via `aws configure`, environment variables, or an EC2 IAM Instance Role) require the following minimal policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "cloudwatch:DescribeAlarms",
        "cloudwatch:GetMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. CloudWatch Agent (CWAgent) Configuration
To collect OS-level **Memory** and **Disk** metrics on your EC2 instances, ensure the CloudWatch Agent is publishing to the `CloudPulse` namespace:

```json
{
  "metrics": {
    "namespace": "CloudPulse",
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"],
        "metrics_collection_interval": 60
      }
    },
    "append_dimensions": {
      "host": "${aws:InstanceId}"
    }
  }
}
```

---

## Quick Start

### 1. Configure Backend Environment
Edit `backend/.env`:
```env
PORT=5000
AWS_REGION=ap-south-1
CLOUDWATCH_HOST=ip-172-31-1-242
```

### 2. Start Backend (Socket.IO + Scheduler)
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:5000` with the scheduler polling every 10s.*

### 3. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
*Frontend opens on `http://localhost:3000` connected to WebSocket broadcasts.*

### 4. Root Helper Scripts
From the root directory, you can also run:
```bash
npm run dev:backend   # Starts the backend server
npm run dev:frontend  # Starts the Vite dev server
npm run build:frontend # Production build of the frontend
```
