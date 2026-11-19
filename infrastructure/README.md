# CloudPulse Infrastructure

This directory documents the AWS resources used by CloudPulse and keeps reusable infrastructure configuration in version control.

## Current AWS environment

| Resource | Configuration |
|---|---|
| AWS Region | `ap-south-1` |
| Compute | Ubuntu EC2 instance |
| EC2 instance type | `t3.micro` |
| Monitoring | Amazon CloudWatch |
| Custom metric namespace | `CloudPulse` |
| Notifications | Amazon SNS |
| CloudWatch Agent interval | 60 seconds for memory and disk |

The actual AWS account and resource identifiers are intentionally not embedded in these files. Retrieve them from the AWS Console or AWS CLI when needed.

## Directory guide

- `aws/ec2/`: EC2 setup and operational notes.
- `aws/iam/`: IAM role and backend read-only policy documentation.
- `aws/cloudwatch/`: CloudWatch Agent configuration.
- `aws/sns/`: SNS topic and email subscription notes.
- `terraform/`: reserved for future Infrastructure as Code.
- `architecture/`: infrastructure flow and design decisions.

## Apply the CloudWatch Agent configuration

Copy `aws/cloudwatch/agent-config.json` to the EC2 instance, for example:

```bash
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
sudo cp agent-config.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

Then load it:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s
```

Check the agent:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status
```

## Security rules

- Never commit AWS access keys, secret keys, private SSH keys, `.env` files, or Terraform state.
- Prefer IAM roles for workloads running on EC2.
- Give application identities only the permissions they need.
- Do not put real email addresses, account IDs, or credentials in example files.
- Review AWS costs before enabling detailed monitoring or creating additional resources.

## Current scope

These files document the infrastructure already used by the project. Terraform provisioning is a future improvement, not something this project currently claims to have automated.
