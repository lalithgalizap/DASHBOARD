#!/bin/bash
set -e

echo "=== Installing MongoDB 7.0 ==="
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

echo "=== Installing Node.js 18 ==="
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "=== Installing PM2 ==="
sudo npm install -g pm2

echo "=== Installing Nginx ==="
sudo apt-get install -y nginx

echo "=== Configuring Nginx ==="
sudo tee /etc/nginx/sites-available/pmo-dashboard > /dev/null <<'EOF'
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 50M;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/pmo-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "=== Deploying Application ==="
cd /opt
sudo git clone https://github.com/lalithgalizap/DASHBOARD.git pmo-dashboard
sudo chown -R ubuntu:ubuntu /opt/pmo-dashboard
cd /opt/pmo-dashboard

cat > .env <<'EOF'
MONGODB_URI=mongodb://localhost:27017/pmo_db
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
EOF

npm install --production
cd client
npm install
npm run build
cd ..
mkdir -p uploads project-documents logs
chmod 755 uploads project-documents

echo "=== Setting up Database ==="
node setup-db-complete.js

echo "=== Starting Application ==="
pm2 start server/index.js --name pmo-dashboard
pm2 save
pm2 startup

echo "=== DEPLOYMENT COMPLETE ==="
echo "Application URL: http://44.209.71.221"
echo "Login: admin / admin123"
