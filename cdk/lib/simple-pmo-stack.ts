import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class SimplePmoDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for backups only
    const backupBucket = new s3.Bucket(this, 'BackupBucket', {
      bucketName: `pmo-dashboard-backups-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteOldBackups',
          enabled: true,
          expiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Use default VPC (simpler and free)
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    // Security Group
    const securityGroup = new ec2.SecurityGroup(this, 'InstanceSG', {
      vpc,
      description: 'Security group for PMO Dashboard instance',
      allowAllOutbound: true,
    });

    // Allow HTTP from anywhere
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );

    // Allow HTTPS from anywhere (for future SSL)
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    // Allow SSH from anywhere (restrict to your IP in production)
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access'
    );

    // IAM Role for EC2
    const role = new iam.Role(this, 'InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Grant S3 access for backups
    backupBucket.grantReadWrite(role);

    // User Data script
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      'exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1',
      '',
      'echo "Starting PMO Dashboard setup..."',
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
      '# Start MongoDB',
      'systemctl start mongod',
      'systemctl enable mongod',
      'sleep 10',
      '',
      '# Create MongoDB user',
      `MONGO_PASSWORD="${this.generatePassword()}"`,
      'mongosh <<EOF',
      'use pmo_db',
      'db.createUser({',
      '  user: "pmo_admin",',
      '  pwd: process.env.MONGO_PASSWORD,',
      '  roles: [{ role: "readWrite", db: "pmo_db" }]',
      '})',
      'exit',
      'EOF',
      '',
      '# Install Node.js 18.x',
      'curl -fsSL https://deb.nodesource.com/setup_18.x | bash -',
      'apt-get install -y nodejs git',
      '',
      '# Install PM2',
      'npm install -g pm2',
      '',
      '# Create application directory',
      'mkdir -p /opt/pmo-dashboard',
      'cd /opt/pmo-dashboard',
      'mkdir -p uploads project-documents logs',
      'chmod 755 uploads project-documents',
      '',
      '# Create .env file',
      `JWT_SECRET="${this.generatePassword(32)}"`,
      'cat > /opt/pmo-dashboard/.env <<ENVEOF',
      'MONGODB_URI=mongodb://pmo_admin:$MONGO_PASSWORD@localhost:27017/pmo_db',
      'PORT=5000',
      'JWT_SECRET=$JWT_SECRET',
      'NODE_ENV=production',
      'ENVEOF',
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
      '# Install Nginx',
      'apt-get install -y nginx',
      '',
      '# Configure Nginx',
      'cat > /etc/nginx/sites-available/pmo-dashboard <<NGINXEOF',
      'server {',
      '    listen 80 default_server;',
      '    server_name _;',
      '    client_max_body_size 50M;',
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
      '    }',
      '}',
      'NGINXEOF',
      '',
      'rm -f /etc/nginx/sites-enabled/default',
      'ln -sf /etc/nginx/sites-available/pmo-dashboard /etc/nginx/sites-enabled/',
      'nginx -t && systemctl restart nginx',
      'systemctl enable nginx',
      '',
      '# Create backup script',
      'cat > /root/backup-to-s3.sh <<BACKUPEOF',
      '#!/bin/bash',
      'DATE=\\$(date +%Y%m%d_%H%M%S)',
      'BACKUP_DIR="/tmp/mongodb-backup-\\$DATE"',
      'mongodump --uri="mongodb://pmo_admin:$MONGO_PASSWORD@localhost:27017/pmo_db" --out="\\$BACKUP_DIR"',
      'tar -czf /tmp/backup-\\$DATE.tar.gz -C /tmp mongodb-backup-\\$DATE',
      `aws s3 cp /tmp/backup-\\$DATE.tar.gz s3://${backupBucket.bucketName}/mongodb/`,
      'rm -rf \\$BACKUP_DIR /tmp/backup-\\$DATE.tar.gz',
      'echo "Backup completed: \\$DATE"',
      'BACKUPEOF',
      'chmod +x /root/backup-to-s3.sh',
      '',
      '# Schedule daily backups at 2 AM',
      '(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-to-s3.sh") | crontab -',
      '',
      '# Create deployment helper script',
      'cat > /root/deploy-app.sh <<DEPLOYEOF',
      '#!/bin/bash',
      'cd /opt/pmo-dashboard',
      'echo "Pulling latest code..."',
      '# git pull origin main  # Uncomment when using Git',
      'echo "Installing dependencies..."',
      'npm install',
      'cd client && npm install && npm run build && cd ..',
      'echo "Restarting application..."',
      'pm2 restart pmo-dashboard || pm2 start ecosystem.config.js',
      'pm2 save',
      'echo "Deployment complete!"',
      'DEPLOYEOF',
      'chmod +x /root/deploy-app.sh',
      '',
      'echo "Setup complete! Ready for code deployment."',
      'echo "MongoDB Password: $MONGO_PASSWORD" > /root/credentials.txt',
      'echo "JWT Secret: $JWT_SECRET" >> /root/credentials.txt',
      'chmod 600 /root/credentials.txt'
    );

    // EC2 Instance
    const instance = new ec2.Instance(this, 'Instance', {
      vpc,
      instanceType: new ec2.InstanceType('t3.small'),
      machineImage: ec2.MachineImage.lookup({
        name: 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
        owners: ['099720109477'],
      }),
      securityGroup: securityGroup,
      role: role,
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
      keyName: undefined, // Use Systems Manager instead of SSH keys
    });

    // Elastic IP for static IP address
    const eip = new ec2.CfnEIP(this, 'ElasticIP', {
      instanceId: instance.instanceId,
    });

    // Outputs
    new cdk.CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
      description: 'EC2 Instance ID',
    });

    new cdk.CfnOutput(this, 'PublicIP', {
      value: eip.ref,
      description: 'Public IP Address (Elastic IP)',
    });

    new cdk.CfnOutput(this, 'ApplicationURL', {
      value: `http://${eip.ref}`,
      description: 'Application URL',
    });

    new cdk.CfnOutput(this, 'BackupBucketName', {
      value: backupBucket.bucketName,
      description: 'S3 Backup Bucket',
    });

    new cdk.CfnOutput(this, 'SSHCommand', {
      value: `aws ssm start-session --target ${instance.instanceId}`,
      description: 'Connect via Systems Manager (no SSH key needed)',
    });
  }

  private generatePassword(length: number = 24): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
