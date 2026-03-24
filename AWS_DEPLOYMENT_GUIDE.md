# AWS EC2 Deployment Guide - PMO Dashboard

This guide provides step-by-step instructions to deploy the PMO Dashboard application on AWS EC2 without affecting other applications in your environment.

## Table of Contents
1. [Application Overview](#application-overview)
2. [Prerequisites](#prerequisites)
3. [EC2 Instance Setup](#ec2-instance-setup)
4. [MongoDB Setup](#mongodb-setup)
5. [Application Deployment](#application-deployment)
6. [Process Management with PM2](#process-management-with-pm2)
7. [Nginx Reverse Proxy Setup](#nginx-reverse-proxy-setup)
8. [Security Configuration](#security-configuration)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Application Overview

**Technology Stack:**
- **Backend:** Node.js + Express (Port 5000)
- **Frontend:** React (Built static files served by backend)
- **Database:** MongoDB
- **File Storage:** Local filesystem (`project-documents/`, `uploads/`)

**Key Dependencies:**
- Node.js v14+ required
- MongoDB v4.4+
- npm packages: express, mongoose, bcryptjs, jsonwebtoken, multer, xlsx

---

## Prerequisites

### 1. AWS Account Access
- IAM user with EC2 permissions
- Access to create Security Groups
- SSH key pair for EC2 access

### 2. Domain/DNS (Optional)
- Domain name for production access
- Route 53 or external DNS provider

---

## EC2 Instance Setup

### Step 1: Launch EC2 Instance

**Recommended Instance Type:**
- **Development/Testing:** t3.small (2 vCPU, 2 GB RAM)
- **Production:** t3.medium or larger (2 vCPU, 4 GB RAM)

**AMI Selection:**
- Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
- OR Amazon Linux 2023

**Storage:**
- Root volume: 20 GB minimum (gp3)
- Additional volume for MongoDB data (optional): 50+ GB

**Instance Configuration:**
```
Name: pmo-dashboard-app
Instance Type: t3.small (or as needed)
AMI: Ubuntu 22.04 LTS
Storage: 20 GB gp3
```

### Step 2: Configure Security Group

Create a new security group specifically for this application:

**Security Group Name:** `pmo-dashboard-sg`

**Inbound Rules:**
```
Type            Protocol    Port Range    Source              Description
SSH             TCP         22            Your IP/VPN         SSH access
HTTP            TCP         80            0.0.0.0/0           HTTP access
HTTPS           TCP         443           0.0.0.0/0           HTTPS access (if using SSL)
Custom TCP      TCP         5000          Your IP (testing)   Backend API (testing only)
MongoDB         TCP         27017         127.0.0.1/32        MongoDB (localhost only)
```

**Outbound Rules:**
```
All traffic     All         All           0.0.0.0/0           Allow all outbound
```

**Important:** Do NOT expose port 27017 to the internet. MongoDB should only be accessible from localhost.

### Step 3: Allocate Elastic IP (Recommended)

To avoid IP changes on instance restart:
```bash
# In AWS Console:
1. Navigate to EC2 > Elastic IPs
2. Allocate new Elastic IP
3. Associate with your EC2 instance
```

---

## MongoDB Setup

### Option 1: MongoDB on Same EC2 Instance (Recommended for Small Apps)

**Install MongoDB:**
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

**Configure MongoDB:**
```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf

# Ensure these settings:
net:
  port: 27017
  bindIp: 127.0.0.1  # Only allow localhost connections

# Restart MongoDB
sudo systemctl restart mongod
```

**Create Database and User:**
```bash
mongosh

# In MongoDB shell:
use pmo_db

# Create admin user
db.createUser({
  user: "pmo_admin",
  pwd: "CHANGE_THIS_STRONG_PASSWORD",
  roles: [
    { role: "readWrite", db: "pmo_db" }
  ]
})

exit
```

### Option 2: MongoDB Atlas (Managed Cloud Database)

If you prefer a managed solution:
1. Create MongoDB Atlas account
2. Create a cluster (free tier available)
3. Whitelist your EC2 instance IP
4. Get connection string
5. Update `.env` with Atlas connection string

---

## Application Deployment

### Step 1: Install Node.js

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show v9.x.x or higher
```

### Step 2: Install Git

```bash
sudo apt install -y git
```

### Step 3: Clone or Upload Application

**Option A: Using Git (if you have a repository):**
```bash
cd /home/ubuntu
git clone https://github.com/your-repo/pmo-dashboard.git
cd pmo-dashboard
```

**Option B: Upload via SCP:**
```bash
# From your local machine:
scp -i your-key.pem -r /path/to/DASHBOARD ubuntu@your-ec2-ip:/home/ubuntu/pmo-dashboard
```

### Step 4: Install Dependencies

```bash
cd /home/ubuntu/pmo-dashboard

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### Step 5: Build Frontend

```bash
cd client
npm run build
cd ..
```

This creates optimized production files in `client/build/`

### Step 6: Configure Environment Variables

```bash
cd /home/ubuntu/pmo-dashboard

# Create production .env file
nano .env
```

**Production .env Configuration:**
```env
# MongoDB Configuration
MONGODB_URI=mongodb://pmo_admin:YOUR_STRONG_PASSWORD@localhost:27017/pmo_db

# Server Configuration
PORT=5000

# JWT Secret (MUST change this to a strong random string)
JWT_SECRET=GENERATE_A_STRONG_RANDOM_SECRET_HERE_MIN_32_CHARS

# Node Environment
NODE_ENV=production
```

**Generate Strong JWT Secret:**
```bash
# Generate a random 64-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 7: Create Required Directories

```bash
cd /home/ubuntu/pmo-dashboard

# Create upload directories
mkdir -p uploads
mkdir -p project-documents

# Set proper permissions
chmod 755 uploads project-documents
```

### Step 8: Serve Frontend from Backend

Update `server/index.js` to serve the built React app (already configured):

The application is already set up to serve static files. Verify at the end of `server/index.js`:

```javascript
// Serve static files from React build (should already exist)
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});
```

---

## Process Management with PM2

PM2 ensures your application stays running and restarts automatically.

### Step 1: Install PM2 Globally

```bash
sudo npm install -g pm2
```

### Step 2: Create PM2 Ecosystem File

```bash
cd /home/ubuntu/pmo-dashboard
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'pmo-dashboard',
    script: 'server/index.js',
    cwd: '/home/ubuntu/pmo-dashboard',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/home/ubuntu/pmo-dashboard/logs/err.log',
    out_file: '/home/ubuntu/pmo-dashboard/logs/out.log',
    log_file: '/home/ubuntu/pmo-dashboard/logs/combined.log',
    time: true
  }]
};
```

### Step 3: Create Logs Directory

```bash
mkdir -p /home/ubuntu/pmo-dashboard/logs
```

### Step 4: Start Application with PM2

```bash
cd /home/ubuntu/pmo-dashboard

# Start the application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Follow the command it outputs (will be something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Verify application is running
pm2 status
pm2 logs pmo-dashboard
```

### PM2 Useful Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs pmo-dashboard

# Restart application
pm2 restart pmo-dashboard

# Stop application
pm2 stop pmo-dashboard

# Monitor resources
pm2 monit
```

---

## Nginx Reverse Proxy Setup

Use Nginx to serve your application on port 80/443 and handle SSL.

### Step 1: Install Nginx

```bash
sudo apt install -y nginx
```

### Step 2: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/pmo-dashboard
```

**Basic Configuration (HTTP only):**
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or use EC2 public IP

    client_max_body_size 50M;  # Allow large Excel file uploads

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 3: Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/pmo-dashboard /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 4: SSL Setup with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will automatically update your Nginx config
# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Security Configuration

### 1. Firewall Setup (UFW)

```bash
# Enable UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verify rules
sudo ufw status
```

### 2. Secure MongoDB

```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf

# Enable authentication
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

### 3. Environment Variables Security

```bash
# Secure .env file
chmod 600 /home/ubuntu/pmo-dashboard/.env
```

### 4. Regular Updates

```bash
# Create update script
nano /home/ubuntu/update-system.sh
```

```bash
#!/bin/bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
```

```bash
chmod +x /home/ubuntu/update-system.sh

# Run weekly via cron
crontab -e
# Add: 0 2 * * 0 /home/ubuntu/update-system.sh
```

---

## Monitoring and Maintenance

### 1. Application Logs

```bash
# PM2 logs
pm2 logs pmo-dashboard

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### 2. Database Backup

Create automated backup script:

```bash
nano /home/ubuntu/backup-mongodb.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

mongodump --uri="mongodb://pmo_admin:YOUR_PASSWORD@localhost:27017/pmo_db" \
  --out="$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days of backups
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
```

```bash
chmod +x /home/ubuntu/backup-mongodb.sh

# Schedule daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-mongodb.sh
```

### 3. Disk Space Monitoring

```bash
# Check disk usage
df -h

# Check application directory size
du -sh /home/ubuntu/pmo-dashboard/*
```

### 4. Application Health Check

```bash
# Check if application is responding
curl http://localhost:5000/api/projects

# Check PM2 status
pm2 status
```

---

## Deployment Checklist

- [ ] EC2 instance launched with appropriate size
- [ ] Security group configured (ports 22, 80, 443)
- [ ] Elastic IP allocated and associated
- [ ] MongoDB installed and secured
- [ ] Node.js 18.x installed
- [ ] Application code uploaded
- [ ] Dependencies installed (`npm install`)
- [ ] Frontend built (`npm run build`)
- [ ] `.env` file configured with production values
- [ ] Required directories created (`uploads`, `project-documents`)
- [ ] PM2 installed and configured
- [ ] Application started with PM2
- [ ] PM2 startup configured
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained (if using domain)
- [ ] UFW firewall enabled
- [ ] MongoDB authentication enabled
- [ ] Backup script created and scheduled
- [ ] Application tested and accessible

---

## Accessing the Application

**After deployment, access your application at:**
- HTTP: `http://your-ec2-public-ip` or `http://your-domain.com`
- HTTPS: `https://your-domain.com` (if SSL configured)

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT:** Change the default admin password immediately after first login!

---

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs pmo-dashboard --lines 100

# Check if port 5000 is in use
sudo lsof -i :5000

# Restart application
pm2 restart pmo-dashboard
```

### MongoDB Connection Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh mongodb://localhost:27017/pmo_db
```

### Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx
```

### File Upload Issues

```bash
# Check directory permissions
ls -la /home/ubuntu/pmo-dashboard/uploads
ls -la /home/ubuntu/pmo-dashboard/project-documents

# Fix permissions if needed
chmod 755 /home/ubuntu/pmo-dashboard/uploads
chmod 755 /home/ubuntu/pmo-dashboard/project-documents
```

---

## Updating the Application

When you need to deploy updates:

```bash
# 1. Pull latest code (if using Git)
cd /home/ubuntu/pmo-dashboard
git pull origin main

# 2. Install any new dependencies
npm install
cd client && npm install && cd ..

# 3. Rebuild frontend
cd client && npm run build && cd ..

# 4. Restart application
pm2 restart pmo-dashboard

# 5. Verify
pm2 logs pmo-dashboard
```

---

## Cost Optimization

**Estimated Monthly Costs (us-east-1):**
- t3.small EC2 instance: ~$15/month
- 20 GB gp3 storage: ~$2/month
- Data transfer: ~$1-5/month (depending on usage)
- **Total: ~$18-22/month**

**To reduce costs:**
- Use Reserved Instances for 1-year commitment (30-40% savings)
- Stop instance during non-business hours if applicable
- Use MongoDB Atlas free tier instead of self-hosted

---

## Support and Maintenance

**Regular Maintenance Tasks:**
- Weekly: Check application logs and disk space
- Monthly: Review security updates and apply patches
- Monthly: Test backup restoration
- Quarterly: Review and rotate JWT secrets
- Quarterly: Update Node.js and npm packages

**Monitoring Recommendations:**
- Set up CloudWatch alarms for CPU/Memory usage
- Monitor disk space (alert at 80% usage)
- Set up uptime monitoring (e.g., UptimeRobot, Pingdom)

---

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MongoDB Production Notes](https://docs.mongodb.com/manual/administration/production-notes/)
- [AWS EC2 Best Practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-best-practices.html)

---

**Deployment Date:** _______________
**Deployed By:** _______________
**EC2 Instance ID:** _______________
**Elastic IP:** _______________
**Domain:** _______________
