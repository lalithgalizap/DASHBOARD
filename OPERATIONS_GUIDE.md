# PMO Dashboard - Operations Guide

## 🔴 How to Stop the EC2 Instance (When Not in Use)

Stopping the instance saves money - you only pay for storage (~$3/month) instead of compute+storage (~$17/month).

### Option 1: AWS Console (Easiest)
1. Go to: https://console.aws.amazon.com/ec2/
2. Select your **PMO-Dashboard** instance (`i-0da8f3c0744497ddc`)
3. Click **"Instance state" → "Stop instance"**
4. Confirm the action

### Option 2: AWS CLI
```bash
aws ec2 stop-instances --instance-ids i-0da8f3c0744497ddc
```

**Note:** Your Elastic IP (44.209.71.221) will remain associated and won't change.

---

## 🟢 How to Start the EC2 Instance (When You Need It)

### Option 1: AWS Console
1. Go to: https://console.aws.amazon.com/ec2/
2. Select your **PMO-Dashboard** instance
3. Click **"Instance state" → "Start instance"**
4. Wait 1-2 minutes for the instance to start
5. Access your app at: http://44.209.71.221

### Option 2: AWS CLI
```bash
aws ec2 start-instances --instance-ids i-0da8f3c0744497ddc
```

**After starting:**
- All services (MongoDB, Node.js, PM2, Nginx) will auto-start
- Application will be available at http://44.209.71.221
- All your data is preserved

---

## 🔄 How to Deploy Code Updates from Local to Production

### Step 1: Make Changes Locally
Edit your code in VS Code or any editor.

### Step 2: Test Locally (Optional but Recommended)
```bash
# In your project folder
cd "C:\Users\Lalith Gali\Desktop\1\DASHBOARD"

# Start backend
npm run server

# In another terminal, start frontend
cd client
npm start
```

Test at http://localhost:3000

### Step 3: Commit and Push to GitHub
```bash
cd "C:\Users\Lalith Gali\Desktop\1\DASHBOARD"

# Check what changed
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Description of your changes"

# Push to GitHub
git push origin master
```

### Step 4: Deploy to EC2 Production Server

**Option A: Using SSH (Recommended)**
```bash
# Connect to EC2
ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221

# Navigate to app directory
cd /opt/pmo-dashboard

# Pull latest code from GitHub
git pull origin master

# Install any new backend dependencies
npm install --production

# Rebuild frontend
cd client
npm install
npm run build
cd ..

# Restart application
pm2 restart pmo-dashboard

# Check status
pm2 status

# Exit SSH
exit
```

**Option B: Quick Update Script**

Create a file `update-production.sh` on your local machine:
```bash
#!/bin/bash
ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221 << 'EOF'
cd /opt/pmo-dashboard
git pull origin master
npm install --production
cd client && npm install && npm run build && cd ..
pm2 restart pmo-dashboard
pm2 status
EOF
```

Then run:
```bash
bash update-production.sh
```

### Step 5: Verify Deployment
1. Open http://44.209.71.221 in your browser
2. Test your changes
3. Check for any errors

---

## 📊 Monitoring Your Application

### Check Application Status
```bash
ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221

# Check PM2 status
pm2 status

# View application logs
pm2 logs pmo-dashboard

# View last 50 lines of logs
pm2 logs pmo-dashboard --lines 50

# Check MongoDB status
sudo systemctl status mongod

# Check Nginx status
sudo systemctl status nginx
```

### Restart Services if Needed
```bash
# Restart application
pm2 restart pmo-dashboard

# Restart MongoDB
sudo systemctl restart mongod

# Restart Nginx
sudo systemctl restart nginx
```

---

## 💾 Backup Your Data

### Manual Database Backup
```bash
ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221

# Create backup
mongodump --db=pmo_db --out=/home/ubuntu/backup-$(date +%Y%m%d)

# Download backup to your local machine (run from local PowerShell)
scp -i "C:\Users\Lalith Gali\Downloads\PMO.pem" -r ubuntu@44.209.71.221:/home/ubuntu/backup-* "C:\Users\Lalith Gali\Desktop\backups\"
```

### Restore Database from Backup
```bash
ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221

# Restore from backup
mongorestore --db=pmo_db /home/ubuntu/backup-20260324/pmo_db
```

---

## 💰 Cost Management

### Current Costs
- **Running 24/7:** ~$17/month
  - EC2 t3.small: ~$15/month
  - Storage: ~$2/month
  
- **Stopped (only storage):** ~$3/month
  - Storage: ~$3/month
  - Elastic IP: Free (while associated)

### Cost-Saving Tips
1. **Stop instance when not in use** (nights, weekends)
   - Saves ~$0.50/day when stopped
   - ~$15/month savings if stopped 50% of the time

2. **Use a schedule**
   - Start: 9 AM weekdays
   - Stop: 6 PM weekdays
   - Stopped: All weekend
   - Potential savings: ~$10/month

3. **Delete old backups** to save storage costs

---

## 🔒 Security Best Practices

### Change Default Password
1. Login to http://44.209.71.221
2. Go to User Management
3. Change admin password from `admin123` to something strong

### Update JWT Secret
```bash
ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221
cd /opt/pmo-dashboard
nano .env

# Change JWT_SECRET to a random string
# Save and exit (Ctrl+X, Y, Enter)

pm2 restart pmo-dashboard
```

### Keep Software Updated
```bash
ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Update Node.js packages
cd /opt/pmo-dashboard
npm update
cd client && npm update && cd ..
```

---

## 🆘 Troubleshooting

### Application Not Loading
```bash
# Check if instance is running
aws ec2 describe-instances --instance-ids i-0da8f3c0744497ddc --query "Reservations[0].Instances[0].State.Name"

# Check PM2 status
ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221
pm2 status

# Restart if needed
pm2 restart pmo-dashboard
```

### Database Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# View MongoDB logs
sudo journalctl -u mongod -n 50
```

### Port Already in Use
```bash
# Kill all node processes
pm2 delete all
pm2 kill
sudo pkill -f node

# Restart application
cd /opt/pmo-dashboard
pm2 start server/index.js --name pmo-dashboard
pm2 save
```

---

## 📞 Quick Reference

**Instance Details:**
- Instance ID: `i-0da8f3c0744497ddc`
- Elastic IP: `44.209.71.221`
- Region: `us-east-1`
- Application URL: http://44.209.71.221

**SSH Connection:**
```bash
ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221
```

**Application Directory:**
```
/opt/pmo-dashboard
```

**Important Files:**
- Environment: `/opt/pmo-dashboard/.env`
- Nginx Config: `/etc/nginx/sites-available/pmo-dashboard`
- PM2 Config: `/home/ubuntu/.pm2/`
- MongoDB Data: `/var/lib/mongodb/`

**Default Login:**
- Username: `admin`
- Password: `admin123` (CHANGE THIS!)

---

## 🎯 Common Tasks Cheat Sheet

| Task | Command |
|------|---------|
| Stop instance | `aws ec2 stop-instances --instance-ids i-0da8f3c0744497ddc` |
| Start instance | `aws ec2 start-instances --instance-ids i-0da8f3c0744497ddc` |
| Connect via SSH | `ssh -i "C:\Users\Lalith Gali\Downloads\PMO.pem" ubuntu@44.209.71.221` |
| Check app status | `pm2 status` |
| View app logs | `pm2 logs pmo-dashboard` |
| Restart app | `pm2 restart pmo-dashboard` |
| Pull latest code | `cd /opt/pmo-dashboard && git pull origin master` |
| Rebuild frontend | `cd /opt/pmo-dashboard/client && npm run build` |
| Full update | See "Deploy Code Updates" section above |

---

**Your PMO Dashboard is ready! Use this guide for day-to-day operations.** 📚
