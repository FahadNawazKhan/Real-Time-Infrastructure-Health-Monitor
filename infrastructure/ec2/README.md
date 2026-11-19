# Amazon EC2

CloudPulse was configured to monitor an Ubuntu EC2 instance in `ap-south-1`. The original test instance used the configuration below. Treat these values as a record of the previous environment, not as a guarantee that the instance still exists.

## Recorded configuration

- Instance name: `cloudpulse-server`
- Instance type: `t3.micro`
- Operating system: Ubuntu
- Region: `ap-south-1`
- Availability Zone: `ap-south-1b` (recorded during setup)
- Instance ID: `i-08839d160f252a97a` (historical reference; do not assume it is still running)
- CloudWatch Agent custom metric namespace: `CloudPulse`

The original CloudWatch Agent host dimension was `ip-172-31-1-242`. A replacement instance will normally have a different private hostname, so update the backend's configured host dimension or host-to-instance mapping.

## Connect to an existing Ubuntu instance

```bash
ssh -i /path/to/private-key.pem ubuntu@<EC2_PUBLIC_IP>
```

The SSH username for Ubuntu images is normally `ubuntu`, not `ec2-user`.

## Operational checks

```bash
uname -a
lsb_release -a
free -h
df -h
top
sudo systemctl status amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status
```

## Security group guidance

Allow only the traffic required by the deployment. Restrict inbound TCP port 22 to a trusted source IP. Do not expose the Node.js development server directly to the public internet.

## Termination and recreation

See [TERMINATION_AND_RECREATION.md](./TERMINATION_AND_RECREATION.md) before deleting the instance. It explains what survives termination, which settings to export, and how to launch a replacement monitoring host.

## Scope

These files document the EC2 resource and its setup. They do not create or modify EC2 instances. Terraform provisioning is not implemented yet.
