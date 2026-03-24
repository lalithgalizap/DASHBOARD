import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as backup from 'aws-cdk-lib/aws-backup';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

export interface PmoDashboardStackProps extends cdk.StackProps {
  instanceType?: string;
  minCapacity?: number;
  maxCapacity?: number;
  desiredCapacity?: number;
  alertEmail?: string;
  enableBackups?: boolean;
}

export class PmoDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: PmoDashboardStackProps) {
    super(scope, id, props);

    // Configuration with defaults
    const config = {
      instanceType: props?.instanceType || 't3.small',
      minCapacity: props?.minCapacity || 1,
      maxCapacity: props?.maxCapacity || 3,
      desiredCapacity: props?.desiredCapacity || 1,
      alertEmail: props?.alertEmail || '',
      enableBackups: props?.enableBackups !== false,
    };

    // Create VPC or use default
    const vpc = new ec2.Vpc(this, 'PmoDashboardVpc', {
      maxAzs: 2,
      natGateways: 0, // No NAT Gateway to save costs
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // S3 Bucket for backups and file storage
    const backupBucket = new s3.Bucket(this, 'PmoDashboardBackupBucket', {
      bucketName: `pmo-dashboard-backups-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldBackups',
          enabled: true,
          expiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Security Group for Application Load Balancer
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for PMO Dashboard ALB',
      allowAllOutbound: true,
    });

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from anywhere'
    );

    // Security Group for EC2 instances
    const instanceSecurityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
      vpc,
      description: 'Security group for PMO Dashboard EC2 instances',
      allowAllOutbound: true,
    });

    instanceSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(5000),
      'Allow traffic from ALB to Node.js app'
    );

    instanceSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access (restrict to your IP in production)'
    );

    // IAM Role for EC2 instances
    const instanceRole = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Grant S3 access for backups
    backupBucket.grantReadWrite(instanceRole);

    // User Data script for EC2 initialization
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      'exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1',
      '',
      '# Update system',
      'apt-get update',
      'DEBIAN_FRONTEND=noninteractive apt-get upgrade -y',
      '',
      '# Install MongoDB',
      'wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -',
      'echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list',
      'apt-get update',
      'apt-get install -y mongodb-org',
      '',
      '# Configure MongoDB',
      'systemctl start mongod',
      'systemctl enable mongod',
      '',
      '# Wait for MongoDB to start',
      'sleep 10',
      '',
      '# Create MongoDB user',
      'mongosh <<EOF',
      'use pmo_db',
      'db.createUser({',
      '  user: "pmo_admin",',
      '  pwd: "' + this.generateRandomPassword() + '",',
      '  roles: [{ role: "readWrite", db: "pmo_db" }]',
      '})',
      'exit',
      'EOF',
      '',
      '# Install Node.js 18.x',
      'curl -fsSL https://deb.nodesource.com/setup_18.x | bash -',
      'apt-get install -y nodejs git',
      '',
      '# Install PM2 globally',
      'npm install -g pm2',
      '',
      '# Create application directory',
      'mkdir -p /opt/pmo-dashboard',
      'cd /opt/pmo-dashboard',
      '',
      '# Clone or download application (placeholder - update with your repo)',
      '# git clone https://github.com/your-repo/pmo-dashboard.git .',
      '# For now, create placeholder structure',
      'mkdir -p server client uploads project-documents logs',
      '',
      '# Install dependencies (when you have the code)',
      '# npm install',
      '# cd client && npm install && npm run build && cd ..',
      '',
      '# Create .env file',
      'cat > /opt/pmo-dashboard/.env <<ENVEOF',
      'MONGODB_URI=mongodb://pmo_admin:' + this.generateRandomPassword() + '@localhost:27017/pmo_db',
      'PORT=5000',
      'JWT_SECRET=' + this.generateRandomPassword(32),
      'NODE_ENV=production',
      'ENVEOF',
      '',
      'chmod 600 /opt/pmo-dashboard/.env',
      '',
      '# Create PM2 ecosystem file',
      'cat > /opt/pmo-dashboard/ecosystem.config.js <<PMEOF',
      'module.exports = {',
      '  apps: [{',
      '    name: "pmo-dashboard",',
      '    script: "server/index.js",',
      '    cwd: "/opt/pmo-dashboard",',
      '    instances: 1,',
      '    autorestart: true,',
      '    watch: false,',
      '    max_memory_restart: "500M",',
      '    env: {',
      '      NODE_ENV: "production",',
      '      PORT: 5000',
      '    },',
      '    error_file: "/opt/pmo-dashboard/logs/err.log",',
      '    out_file: "/opt/pmo-dashboard/logs/out.log",',
      '    log_file: "/opt/pmo-dashboard/logs/combined.log",',
      '    time: true',
      '  }]',
      '};',
      'PMEOF',
      '',
      '# Start application with PM2 (when code is deployed)',
      '# pm2 start ecosystem.config.js',
      '# pm2 save',
      '# pm2 startup systemd -u root --hp /root',
      '',
      '# Install and configure Nginx',
      'apt-get install -y nginx',
      '',
      'cat > /etc/nginx/sites-available/pmo-dashboard <<NGINXEOF',
      'server {',
      '    listen 80;',
      '    server_name _;',
      '    client_max_body_size 50M;',
      '',
      '    location /health {',
      '        access_log off;',
      '        return 200 "healthy\\n";',
      '        add_header Content-Type text/plain;',
      '    }',
      '',
      '    location / {',
      '        proxy_pass http://localhost:5000;',
      '        proxy_http_version 1.1;',
      '        proxy_set_header Upgrade \\$http_upgrade;',
      '        proxy_set_header Connection "upgrade";',
      '        proxy_set_header Host \\$host;',
      '        proxy_set_header X-Real-IP \\$remote_addr;',
      '        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;',
      '        proxy_set_header X-Forwarded-Proto \\$scheme;',
      '        proxy_cache_bypass \\$http_upgrade;',
      '    }',
      '}',
      'NGINXEOF',
      '',
      'ln -sf /etc/nginx/sites-available/pmo-dashboard /etc/nginx/sites-enabled/',
      'rm -f /etc/nginx/sites-enabled/default',
      'nginx -t && systemctl restart nginx',
      'systemctl enable nginx',
      '',
      '# Create backup script',
      'cat > /root/backup-to-s3.sh <<BACKUPEOF',
      '#!/bin/bash',
      'DATE=\\$(date +%Y%m%d_%H%M%S)',
      'BACKUP_DIR="/tmp/mongodb-backup-\\$DATE"',
      'mongodump --uri="mongodb://pmo_admin:' + this.generateRandomPassword() + '@localhost:27017/pmo_db" --out="\\$BACKUP_DIR"',
      'tar -czf /tmp/backup-\\$DATE.tar.gz -C /tmp mongodb-backup-\\$DATE',
      'aws s3 cp /tmp/backup-\\$DATE.tar.gz s3://' + backupBucket.bucketName + '/mongodb/',
      'rm -rf \\$BACKUP_DIR /tmp/backup-\\$DATE.tar.gz',
      'echo "Backup completed: \\$DATE"',
      'BACKUPEOF',
      '',
      'chmod +x /root/backup-to-s3.sh',
      '',
      '# Schedule daily backups',
      '(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-to-s3.sh") | crontab -',
      '',
      '# Install CloudWatch agent',
      'wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb',
      'dpkg -i -E ./amazon-cloudwatch-agent.deb',
      '',
      '# Signal completion',
      'echo "User data script completed successfully" > /var/log/user-data-complete.log'
    );

    // Launch Template
    const launchTemplate = new ec2.LaunchTemplate(this, 'LaunchTemplate', {
      instanceType: new ec2.InstanceType(config.instanceType),
      machineImage: ec2.MachineImage.lookup({
        name: 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
        owners: ['099720109477'], // Canonical
      }),
      securityGroup: instanceSecurityGroup,
      role: instanceRole,
      userData: userData,
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume: ec2.BlockDeviceVolume.ebs(30, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
          }),
        },
      ],
    });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.INSTANCE,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Listener
    const listener = alb.addListener('HttpListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup],
    });

    // Auto Scaling Group
    const asg = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      vpc,
      launchTemplate: launchTemplate,
      minCapacity: config.minCapacity,
      maxCapacity: config.maxCapacity,
      desiredCapacity: config.desiredCapacity,
      healthCheck: autoscaling.HealthCheck.elb({
        grace: cdk.Duration.minutes(5),
      }),
      updatePolicy: autoscaling.UpdatePolicy.rollingUpdate({
        maxBatchSize: 1,
        minInstancesInService: 1,
        pauseTime: cdk.Duration.minutes(5),
      }),
    });

    // Attach ASG to Target Group
    asg.attachToApplicationTargetGroup(targetGroup);

    // Auto Scaling Policies
    asg.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      cooldown: cdk.Duration.minutes(5),
    });

    asg.scaleOnRequestCount('RequestScaling', {
      targetRequestsPerMinute: 1000,
    });

    // SNS Topic for Alarms
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'PMO Dashboard Alarms',
    });

    if (config.alertEmail) {
      alarmTopic.addSubscription(
        new subscriptions.EmailSubscription(config.alertEmail)
      );
    }

    // CloudWatch Alarms
    const cpuMetric = new cloudwatch.Metric({
      namespace: 'AWS/EC2',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        AutoScalingGroupName: asg.autoScalingGroupName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const cpuAlarm = new cloudwatch.Alarm(this, 'HighCpuAlarm', {
      metric: cpuMetric,
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      alarmDescription: 'Alert when CPU exceeds 80%',
    });

    const unhealthyHostAlarm = new cloudwatch.Alarm(this, 'UnhealthyHostAlarm', {
      metric: targetGroup.metricUnhealthyHostCount(),
      threshold: 1,
      evaluationPeriods: 2,
      alarmDescription: 'Alert when instances are unhealthy',
    });
    unhealthyHostAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alarmTopic));

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: alb.loadBalancerDnsName,
      description: 'Application Load Balancer DNS',
      exportName: 'PmoDashboard-ALB-DNS',
    });

    new cdk.CfnOutput(this, 'BackupBucketName', {
      value: backupBucket.bucketName,
      description: 'S3 Bucket for backups',
      exportName: 'PmoDashboard-Backup-Bucket',
    });

    new cdk.CfnOutput(this, 'ApplicationURL', {
      value: `http://${alb.loadBalancerDnsName}`,
      description: 'Application URL',
    });
  }

  private generateRandomPassword(length: number = 24): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
