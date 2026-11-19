# Amazon EC2

CloudPulse currently monitors an Ubuntu EC2 instance in `ap-south-1`.

## Recorded configuration

- Instance name: `cloudpulse-server`
- Instance type: `t3.micro`
- Operating system: Ubuntu
- Region: `ap-south-1`
- Availability Zone: `ap-south-1b` (recorded during setup)

Instance IDs and IP addresses are deliberately omitted because they are environment-specific and can change.

## Operational checks

Connect using the private key associated with the instance:

```bash
ssh -i /path/to/private-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Check the operating system:

```bash
uname -a
lsb_release -a
```

Check resource usage:

```bash
free -h
df -h
top
```

Check the CloudWatch Agent:

```bash
sudo systemctl status amazon-cloudwatch-agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status
```

## Security group guidance

Allow only the traffic required by the deployment. For SSH, restrict inbound TCP port 22 to a trusted source IP rather than opening it to the entire internet. Do not expose the Node.js development server directly to the public internet.

## Notes

This folder documents the EC2 resource. It does not create or modify EC2 instances.
