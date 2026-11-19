# Amazon SNS

CloudPulse uses an SNS Standard topic to deliver CloudWatch alarm notifications by email.

## Existing setup

- Topic name: `cloudpulse-alerts`
- Topic type: Standard
- Subscription protocol: Email
- Subscription: confirmed during setup

The actual subscriber email address is intentionally not stored in this repository.

## Alarm integration

The CloudWatch metric alarms publish notifications to the `cloudpulse-alerts` topic when their configured thresholds are breached.

## Verification checklist

1. Open Amazon SNS in the `ap-south-1` region.
2. Open the `cloudpulse-alerts` topic.
3. Confirm the email subscription is in the `Confirmed` state.
4. Open each CloudWatch alarm and verify its notification action targets this topic.
5. Test notifications using a controlled test condition.

Do not commit email addresses or account-specific subscription details.
