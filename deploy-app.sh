#!/bin/bash
set -e

echo "=== PMO Dashboard Deployment ==="
echo ""

# Navigate to application directory
cd /opt/pmo-dashboard

# Clone or pull latest code from Git
if [ -d ".git" ]; then
    echo "Pulling latest code from Git..."
    git pull origin master
else
    echo "Cloning repository from Git..."
    cd /opt
    rm -rf pmo-dashboard
    git clone https://github.com/lalithgalizap/DASHBOARD.git pmo-dashboard
    cd pmo-dashboard
fi

# Install backend dependencies
echo "Installing backend dependencies..."
npm install --production

# Install frontend dependencies and build
echo "Building frontend..."
cd client
npm install
npm run build
cd ..

# Ensure directories exist
mkdir -p uploads project-documents logs
chmod 755 uploads project-documents

# Start or restart application with PM2
echo "Starting application with PM2..."
pm2 restart pmo-dashboard || pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=== Deployment Complete ==="
echo "Application is running!"
