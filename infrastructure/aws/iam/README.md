# AWS IAM

CloudPulse uses two distinct IAM identities for separate responsibilities.

## EC2 instance role

Role name used during setup: `CloudPulse-EC2-Role`

The role has the AWS-managed `CloudWatchAgentServerPolicy` attached. This allows the CloudWatch Agent on EC2 to publish configured metrics to CloudWatch without storing long-lived access keys on the server.

## Backend IAM user

IAM user used during local backend development: `cloudpulse-backend`

A customer-managed policy named `CloudPulseBackendReadOnly` was attached to this user. Its purpose is to allow the backend to read EC2 inventory, CloudWatch metrics, and CloudWatch alarms.

The policy template is in `CloudPulseBackendReadOnly.json`.

## Credential handling

The backend uses the AWS SDK default credential provider chain. During local development, credentials were configured with:

```bash
aws configure
```

The credentials are stored in the local AWS CLI credentials file, normally `~/.aws/credentials`. They must not be committed to Git or copied into the project's `.env` file.

For a deployed backend, prefer an IAM role attached to its compute environment rather than a long-lived IAM user access key.

## Least privilege

The supplied policy is a read-only starting point for the current API endpoints. Review and reduce permissions as the application evolves. Never attach administrator access merely to make an authorization error disappear.
