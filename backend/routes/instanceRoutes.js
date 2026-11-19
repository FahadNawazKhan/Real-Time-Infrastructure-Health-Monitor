import express from "express";
import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { ec2Client } from "../config/aws.js";

const router = express.Router();

export const fetchInstancesData = async () => {
  const command = new DescribeInstancesCommand({});
  const response = await ec2Client.send(command);

  return (response.Reservations || []).flatMap((reservation) =>
    (reservation.Instances || []).map((instance) => ({
      instanceId: instance.InstanceId,
      name:
        instance.Tags?.find((tag) => tag.Key === "Name")?.Value ||
        "Unnamed Instance",
      state: instance.State?.Name,
      instanceType: instance.InstanceType,
      publicIp: instance.PublicIpAddress || null,
      privateIp: instance.PrivateIpAddress || null,
      launchTime: instance.LaunchTime,
      availabilityZone: instance.Placement?.AvailabilityZone,
    }))
  );
};

router.get("/", async (req, res) => {
  try {
    const instances = await fetchInstancesData();

    res.status(200).json({
      success: true,
      count: instances.length,
      instances,
    });
  } catch (error) {
    console.error("EC2 fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve EC2 instances",
    });
  }
});

export default router;
