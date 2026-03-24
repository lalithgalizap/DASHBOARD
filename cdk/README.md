# PMO Dashboard - AWS CDK Infrastructure

This directory contains AWS CDK infrastructure code to deploy the PMO Dashboard with high availability and automatic failover capabilities.

## Architecture Overview

### High Availability Features

1. **Application Load Balancer (ALB)** - Distributes traffic across multiple instances
2. **Auto Scaling Group (ASG)** - Automatically scales instances based on demand
3. **Multi-AZ Deployment** - Instances deployed across 2 availability zones
4. **Health Checks** - Automatic detection and replacement of unhealthy instances
5. **Rolling Updates** - Zero-downtime deployments
6. **Automated Backups** - Daily MongoDB backups to S3
7. **CloudWatch Monitoring** - Real-time alerts and metrics

### Components

- **VPC** - Isolated network with public subnets in 2 AZs
- **EC2 Instances** - t3.small instances running Ubuntu 22.04
- **Application Load Balancer** - Entry point for all traffic
- **Auto Scaling Group** - 1-3 instances (configurable)
- **S3 Bucket** - Encrypted backup storage with 30-day retention
- **CloudWatch Alarms** - CPU and health monitoring with SNS notifications
- **Security Groups** - Restricted access (ALB → Instances, SSH from anywhere)

## Prerequisites

1. **AWS CLI** configured with credentials
   ```bash
   aws configure
   ```

2. **Node.js** 18.x or later
   ```bash
   node --version
   ```

3. **AWS CDK** installed globally
   ```bash
   npm install -g aws-cdk
   ```

4. **Bootstrap CDK** (first time only)
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```

## Installation

```bash
cd cdk
npm install
```

## Configuration

### Environment Variables

Set these before deployment:

```bash
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=us-east-1
```

### Custom Configuration

Edit `bin/pmo-dashboard-cdk.ts` to customize:

```typescript
new PmoDashboardStack(app, 'PmoDashboardStack', {
  env: { account: '123456789012', region: 'us-east-1' },
  instanceType: 't3.small',      // Instance size
  minCapacity: 1,                // Minimum instances
  maxCapacity: 3,                // Maximum instances
  desiredCapacity: 1,            // Starting instances
  alertEmail: 'alerts@example.com', // Email for alarms
  enableBackups: true,           // Enable S3 backups
});
```

## Deployment

### 1. Synthesize CloudFormation Template

Preview what will be created:

```bash
npm run synth
```

### 2. View Changes

See what will change in your AWS account:

```bash
npm run diff
```

### 3. Deploy Stack

Deploy the infrastructure:

```bash
npm run deploy
```

This will:
- Create VPC with 2 public subnets
- Launch Application Load Balancer
- Create Auto Scaling Group with EC2 instances
- Set up security groups and IAM roles
- Configure CloudWatch alarms
- Create S3 bucket for backups
- Install MongoDB, Node.js, PM2, and Nginx on instances

**Deployment time:** ~10-15 minutes

### 4. Get Application URL

After deployment completes, note the outputs:

```
Outputs:
PmoDashboardStack.ApplicationURL = http://PmoDa-Appli-XXXXX.us-east-1.elb.amazonaws.com
PmoDashboardStack.LoadBalancerDNS = PmoDa-Appli-XXXXX.us-east-1.elb.amazonaws.com
PmoDashboardStack.BackupBucketName = pmo-dashboard-backups-123456789012
```

## Post-Deployment Steps

### 1. Upload Application Code

The CDK creates the infrastructure but doesn't deploy your application code. You need to:

**Option A: Manual Upload**
```bash
# SSH to instance (get instance ID from EC2 console)
ssh -i your-key.pem ubuntu@instance-ip

# Upload code
scp -i your-key.pem -r ../client ../server ../package.json ubuntu@instance-ip:/opt/pmo-dashboard/

# On instance:
cd /opt/pmo-dashboard
npm install
cd client && npm install && npm run build && cd ..
pm2 start ecosystem.config.js
pm2 save
```

**Option B: Use CodeDeploy (Recommended for production)**
- Set up CodeDeploy application
- Create deployment group
- Deploy from S3 or GitHub

### 2. Configure DNS (Optional)

Point your domain to the ALB:

```bash
# Get ALB DNS from outputs
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name PmoDashboardStack \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

# Create Route53 record or update your DNS provider
```

### 3. Set Up SSL Certificate (Optional)

```bash
# Request certificate in ACM
aws acm request-certificate \
  --domain-name your-domain.com \
  --validation-method DNS

# Add certificate to ALB listener (update CDK code)
```

## Failover and High Availability

### How Failover Works

1. **Health Check Failure**
   - ALB checks `/health` endpoint every 30 seconds
   - If 3 consecutive failures, instance marked unhealthy
   - Traffic stops routing to unhealthy instance

2. **Auto Scaling Replacement**
   - ASG detects unhealthy instance
   - Launches new instance in different AZ
   - New instance initializes (5-10 minutes)
   - Health checks pass, traffic routes to new instance
   - Old instance terminated

3. **Automatic Scaling**
   - CPU > 70%: Add instance
   - CPU < 30%: Remove instance (if > minCapacity)
   - Requests > 1000/min: Add instance

### Testing Failover

**Simulate instance failure:**
```bash
# Get instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:aws:autoscaling:groupName,Values=*PmoDashboardStack*" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

# Terminate instance
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# Watch ASG launch replacement
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names $(aws autoscaling describe-auto-scaling-groups \
  --query 'AutoScalingGroups[?contains(AutoScalingGroupName, `PmoDashboard`)].AutoScalingGroupName' \
  --output text)
```

**Expected behavior:**
- ALB stops sending traffic to terminated instance immediately
- ASG launches new instance within 1-2 minutes
- New instance becomes healthy in 5-10 minutes
- Total downtime: 0 seconds (if minCapacity > 1)

## Disaster Recovery

### Backup Strategy

**Automated Daily Backups:**
- Cron job runs at 2 AM UTC
- MongoDB dump created
- Compressed and uploaded to S3
- 30-day retention policy

**Manual Backup:**
```bash
# SSH to instance
ssh -i your-key.pem ubuntu@instance-ip

# Run backup script
sudo /root/backup-to-s3.sh
```

### Restore from Backup

```bash
# Download backup from S3
aws s3 cp s3://pmo-dashboard-backups-ACCOUNT/mongodb/backup-YYYYMMDD_HHMMSS.tar.gz .

# Extract
tar -xzf backup-YYYYMMDD_HHMMSS.tar.gz

# Restore to MongoDB
mongorestore --uri="mongodb://pmo_admin:PASSWORD@localhost:27017/pmo_db" \
  mongodb-backup-YYYYMMDD_HHMMSS/pmo_db
```

### Complete Stack Recovery

If entire stack is lost:

```bash
# 1. Deploy new stack
cd cdk
npm run deploy

# 2. Wait for instances to be healthy
# 3. SSH to new instance
# 4. Restore MongoDB from S3 backup
# 5. Deploy application code
# 6. Update DNS to point to new ALB
```

**Recovery Time Objective (RTO):** ~20-30 minutes
**Recovery Point Objective (RPO):** 24 hours (daily backups)

## Monitoring

### CloudWatch Alarms

Configured alarms:
- **High CPU** - Triggers when CPU > 80% for 2 periods
- **Unhealthy Hosts** - Triggers when any instance is unhealthy

### View Metrics

```bash
# CPU utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=YOUR_ASG_NAME \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average

# Request count
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=YOUR_ALB_ARN \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### View Logs

```bash
# SSH to instance
ssh -i your-key.pem ubuntu@instance-ip

# Application logs
pm2 logs pmo-dashboard

# User data logs (initialization)
sudo tail -f /var/log/user-data.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Scaling

### Manual Scaling

```bash
# Scale up to 3 instances
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name YOUR_ASG_NAME \
  --desired-capacity 3

# Scale down to 1 instance
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name YOUR_ASG_NAME \
  --desired-capacity 1
```

### Update Scaling Configuration

Edit `lib/pmo-dashboard-stack.ts`:

```typescript
minCapacity: 2,  // Always run at least 2 instances
maxCapacity: 5,  // Scale up to 5 instances
```

Then redeploy:
```bash
npm run deploy
```

## Updates and Rollbacks

### Deploy Application Updates

```bash
# Update code on instances
# Option 1: Use CodeDeploy
# Option 2: Manual update with rolling restart

# Get all instance IPs
aws ec2 describe-instances \
  --filters "Name=tag:aws:autoscaling:groupName,Values=*PmoDashboardStack*" \
  --query 'Reservations[].Instances[].PublicIpAddress' \
  --output text

# Update each instance one at a time
for ip in $INSTANCE_IPS; do
  ssh ubuntu@$ip "cd /opt/pmo-dashboard && git pull && npm install && pm2 restart pmo-dashboard"
  sleep 60  # Wait for health checks
done
```

### Rollback Strategy

**If deployment fails:**

1. **Automatic Rollback** - ASG will terminate unhealthy instances
2. **Manual Rollback** - Restore previous code version
3. **Stack Rollback** - Revert CDK changes

```bash
# Rollback CDK stack
cdk deploy --rollback

# Or delete and recreate
cdk destroy
cdk deploy
```

## Cost Optimization

### Current Costs (us-east-1)

- **EC2 (1x t3.small):** ~$15/month
- **ALB:** ~$16/month
- **Data Transfer:** ~$5/month
- **S3 Storage:** ~$1/month
- **CloudWatch:** ~$3/month
- **Total:** ~$40/month

### Reduce Costs

1. **Use Reserved Instances** - Save 30-40%
2. **Schedule Scaling** - Scale down during off-hours
3. **Use Spot Instances** - Save up to 90% (with interruption risk)
4. **Reduce Backup Retention** - Change from 30 to 7 days

## Cleanup

### Delete Stack

```bash
# This will delete ALL resources
npm run destroy

# Confirm deletion
# Note: S3 bucket is retained by default (RETAIN policy)
```

### Manual Cleanup

If destroy fails:

```bash
# Delete stack via AWS CLI
aws cloudformation delete-stack --stack-name PmoDashboardStack

# Manually delete S3 bucket
aws s3 rb s3://pmo-dashboard-backups-ACCOUNT --force
```

## Troubleshooting

### Stack Deployment Fails

```bash
# View stack events
aws cloudformation describe-stack-events --stack-name PmoDashboardStack

# Check CDK logs
cdk deploy --verbose
```

### Instances Not Healthy

```bash
# Check instance status
aws ec2 describe-instance-status --instance-ids INSTANCE_ID

# SSH and check logs
ssh ubuntu@instance-ip
sudo tail -f /var/log/user-data.log
pm2 logs pmo-dashboard
```

### Application Not Accessible

```bash
# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN

# Check security groups
aws ec2 describe-security-groups \
  --group-ids SG_ID
```

## Security Best Practices

1. **Restrict SSH Access** - Update security group to allow only your IP
2. **Enable VPC Flow Logs** - Monitor network traffic
3. **Use Systems Manager Session Manager** - Avoid SSH keys
4. **Enable AWS Config** - Track configuration changes
5. **Set up AWS GuardDuty** - Threat detection
6. **Rotate Secrets** - Change MongoDB passwords regularly
7. **Enable MFA** - For AWS account access

## Support

For issues or questions:
1. Check CloudWatch Logs
2. Review stack events
3. Check application logs via PM2
4. Contact AWS Support (if using support plan)

## License

Same as main application
