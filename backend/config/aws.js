import dotenv from "dotenv";
dotenv.config();

import { EC2Client } from "@aws-sdk/client-ec2";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";

const awsConfig = {
  region: process.env.AWS_REGION || "ap-south-1",
};

export const ec2Client = new EC2Client(awsConfig);
export const cloudwatchClient = new CloudWatchClient(awsConfig);
