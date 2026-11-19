# EC2 Termination and Recreation Runbook

This runbook explains what to preserve before deleting the current CloudPulse monitoring instance and how to rebuild a replacement later.

## 1. Understand what termination affects

Terminating an EC2 instance deletes that compute instance. It does not automatically delete every related AWS resource.

| Resource | What happens when the EC2 instance is terminated? |
|---|---|
| EC2 instance | Terminated permanently. The same instance cannot be restarted. |
| EBS root volume | Deleted if its `DeleteOnTermination` setting is `true`; otherwise it remains and can continue to incur storage charges. |
| Elastic IP | Not automatically released merely because the instance is terminated. A disassociated Elastic IP can incur charges. |
| IAM instance role and policies | Remain in IAM until explicitly deleted. |
| CloudWatch alarms | Remain until explicitly deleted. |
| SNS topic and subscription | Remain until explicitly deleted. |
| CloudWatch metrics | Previously published datapoints remain available according to CloudWatch retention rules. No new EC2/agent datapoints arrive from a terminated host. |
| Security group, subnet, key pair | Remain as independent resources. |

Check the AWS console and billing dashboard after termination. Do not assume that terminating EC2 cleans up the rest of the environment.

## 2. Record the instance configuration before termination

Run these commands from a machine where AWS CLI is configured for the correct account. Replace the instance ID if it has changed.

```bash
mkdir -p cloudpulse-aws-backup
cd cloudpulse-aws-backup

aws sts get-caller-identity > account-identity.json

aws ec2 describe-instances \
  --instance-ids i-08839d160f252a97a \
  --region ap-south-1 \
  > instance-details.json
```

From `instance-details.json`, record these values in your private project notes:

- AMI ID and Ubuntu release
- Instance type
- Availability Zone
- VPC ID and subnet ID
- Security group IDs and inbound/outbound rules
- Key pair name
- IAM instance profile and role name
- Root EBS volume ID, size, volume type, encryption state, and `DeleteOnTermination` value
- Any additional attached EBS volumes
- User data, if any
- Public IPv4 address and whether an Elastic IP was allocated

Export the attached volumes and security groups. Use the IDs found in `instance-details.json`:

```bash
aws ec2 describe-volumes \
  --filters Name=attachment.instance-id,Values=i-08839d160f252a97a \
  --region ap-south-1 \
  > attached-volumes.json

aws ec2 describe-security-groups \
  --group-ids <SECURITY_GROUP_ID> \
  --region ap-south-1 \
  > security-groups.json
```

Keep this backup outside the public Git repository if it contains account-specific identifiers or user data. Never export or commit private SSH keys or AWS access keys.

## 3. Preserve the reusable CloudPulse configuration

The repository should retain these files:

- `aws/iam/CloudPulseBackendReadOnly.json`
- `aws/cloudwatch/agent-config.json`
- `aws/iam/README.md`
- `aws/cloudwatch/README.md`
- `aws/sns/README.md`
- `architecture/architecture.md`

Also preserve the SSH private key securely on your own machine. The key cannot be downloaded again from EC2 after creation.

## 4. Recreate a monitoring EC2 instance later

1. Launch a new Ubuntu EC2 instance in `ap-south-1`.
2. Choose an instance type appropriate for the workload. The previous instance used `t3.micro`; availability and pricing can change.
3. Attach an instance profile with the `CloudWatchAgentServerPolicy` policy, using the existing `CloudPulse-EC2-Role` if it is still present and appropriate.
4. Configure the required security group rules. Restrict SSH (TCP 22) to your trusted IP. Do not expose the development backend port publicly unless there is a specific, secured deployment requirement.
5. Connect using the Ubuntu SSH username, normally `ubuntu`.
6. Install the CloudWatch Agent using the current AWS instructions for Ubuntu and the selected region.
7. Copy `aws/cloudwatch/agent-config.json` to `/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`.
8. Start the agent with the `amazon-cloudwatch-agent-ctl` command documented in `../cloudwatch/README.md`.
9. Verify that `mem_used_percent` and `disk_used_percent` appear in the `CloudPulse` namespace.
10. Update the backend's CloudWatch host dimension or host-to-instance mapping to match the new agent hostname. Do not assume the old hostname remains valid.
11. Verify CPU, memory, disk, instance inventory, and alarm data in CloudPulse.

The existing `CloudPulse-High-Memory` and `CloudPulse-High-Disk` alarms and the `cloudpulse-alerts` SNS topic are separate AWS resources. Reuse them only after checking their metric dimensions and notification actions. If their dimensions refer to the old host, update or recreate the alarms for the new host.

## 5. Verify the environment after termination

After terminating the instance:

- Confirm the instance reaches the `terminated` state.
- Check the EC2 Volumes page for leftover unattached EBS volumes.
- Check Elastic IPs for unused allocations.
- Review CloudWatch alarms and custom metrics. Delete resources you no longer need, after confirming they are not used elsewhere.
- Keep the IAM role, backend IAM user, policy, SNS topic, and alarms only if you intend to reuse them. They are not automatically removed with EC2.
- Review AWS Billing and Cost Explorer for ongoing charges.

## 6. Important CloudPulse application changes for a replacement host

The current project configuration was built around one monitored host. The CloudWatch Agent publishes custom metrics with a `host` dimension. The backend currently uses a configured host value, so a replacement EC2 instance may publish metrics under a different dimension value.

Before considering multi-instance monitoring complete, implement a reliable mapping between each EC2 instance ID and its CloudWatch Agent dimensions. Until then, update the configured host value when switching the monitored instance.

The backend's local AWS credentials are separate from the EC2 instance role. Terminating the monitored EC2 instance does not delete the local AWS CLI profile or the IAM user. Keep credentials out of the repository.
