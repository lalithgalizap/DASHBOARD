# Deploy PMO Dashboard on EC2 Instance

## Connect to EC2 Instance

```bash
# Option 1: Using AWS Systems Manager (no SSH key needed)
aws ssm start-session --target i-0d7a4563fc4fd3d3e

# Option 2: Using SSH (if you have a key)
ssh -i your-key.pem ubuntu@54.91.119.157
```

## Run These Commands on EC2 Instance

Copy and paste these commands one by one:

```bash
# 1. Navigate to application directory
cd /opt/pmo-dashboard

# 2. Clone the repository (first time)
sudo rm -rf /opt/pmo-dashboard
sudo git clone https://github.com/lalithgalizap/DASHBOARD.git /opt/pmo-dashboard
cd /opt/pmo-dashboard

# 3. Install backend dependencies
npm install --production

# 4. Install frontend dependencies and build
cd client
npm install
npm run build
cd ..

# 5. Create required directories
mkdir -p uploads project-documents logs
chmod 755 uploads project-documents

# 6. Set HOME environment variable for PM2
export HOME=/root

# 7. Stop any existing PM2 processes
pm2 delete all

# 8. Start the application with PM2
pm2 start server/index.js --name pmo-dashboard

# 9. Save PM2 configuration
pm2 save

# 10. Setup PM2 to start on boot
pm2 startup

# 11. Check if application is running
pm2 list
pm2 logs pmo-dashboard --lines 20
```

## Verify Application is Running

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs pmo-dashboard

# Test locally on EC2
curl http://localhost:5000

# Check Nginx status
sudo systemctl status nginx
```

## Access Your Application

Open in browser: **http://54.91.119.157**

**Default Login:**
- Username: `admin`
- Password: `admin123`

## Future Updates (Git-based)

When you make code changes:

```bash
# On your local machine
git add .
git commit -m "Your changes"
git push origin master

# On EC2 instance
cd /opt/pmo-dashboard
git pull origin master
npm install --production
cd client && npm install && npm run build && cd ..
pm2 restart pmo-dashboard
```

## Troubleshooting

### If PM2 fails to start:

```bash
# Check if Node.js is installed
node --version

# Check if the server file exists
ls -la /opt/pmo-dashboard/server/index.js

# Check .env file
cat /opt/pmo-dashboard/.env

# Try starting manually
cd /opt/pmo-dashboard
node server/index.js
```

### If Nginx isn't working:

```bash
# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx configuration
sudo nginx -t
```

### Check MongoDB:

```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB if needed
sudo systemctl restart mongod
```

## Instance Information

- **Instance ID:** i-0d7a4563fc4fd3d3e
- **Public IP:** 54.91.119.157
- **Region:** us-east-1
- **Git Repository:** https://github.com/lalithgalizap/DASHBOARD.git
- **Application Directory:** /opt/pmo-dashboard
