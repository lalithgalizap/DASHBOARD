# Manual EC2 Setup Guide for PMO Dashboard

## Step 1: Launch EC2 Instance

1. Go to AWS Console: https://console.aws.amazon.com/ec2/
2. Click **"Launch Instance"**
3. Configure:
   - **Name:** `PMO-Dashboard`
   - **AMI:** Ubuntu Server 22.04 LTS (64-bit x86)
   - **Instance Type:** `t3.small`
   - **Key Pair:** Create new or select existing (you'll need this to connect)
   - **Network Settings:**
     - VPC: Default VPC
     - Auto-assign public IP: **Enable**
     - Security Group: Create new with these rules:
       - SSH (22) - Your IP only
       - HTTP (80) - Anywhere (0.0.0.0/0)
       - HTTPS (443) - Anywhere (0.0.0.0/0)
   - **Storage:** 30 GB gp3
4. Click **"Launch Instance"**

## Step 2: Allocate Elastic IP

1. In EC2 Console, go to **"Elastic IPs"** (left sidebar)
2. Click **"Allocate Elastic IP address"**
3. Click **"Allocate"**
4. Select the new Elastic IP
5. Click **"Actions" → "Associate Elastic IP address"**
6. Select your PMO-Dashboard instance
7. Click **"Associate"**
8. **Note the Elastic IP address** - this is your application URL

## Step 3: Connect to EC2 Instance

### Option A: AWS Systems Manager (No key needed)
```bash
aws ssm start-session --target <INSTANCE-ID>
```

### Option B: SSH (Using key pair)
```bash
ssh -i your-key.pem ubuntu@<ELASTIC-IP>
```

## Step 4: Install Required Software

Once connected to EC2, run these commands:

```bash
# Update system
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Install MongoDB 7.0
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx
```

## Step 5: Configure Nginx

```bash
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
sudo systemctl enable nginx
```

## Step 6: Deploy Application

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/lalithgalizap/DASHBOARD.git pmo-dashboard
sudo chown -R ubuntu:ubuntu /opt/pmo-dashboard
cd /opt/pmo-dashboard

# Create .env file
cat > .env <<'EOF'
MONGODB_URI=mongodb://localhost:27017/pmo_db
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=production
EOF

# Install backend dependencies
npm install --production

# Build frontend
cd client
npm install
npm run build
cd ..

# Create directories
mkdir -p uploads project-documents logs
chmod 755 uploads project-documents
```

## Step 7: Setup Database

```bash
cd /opt/pmo-dashboard
node setup-db-complete.js
```

You should see:
```
=== Setup Complete ===
Login credentials:
  Username: admin
  Password: admin123
```

## Step 8: Start Application

```bash
cd /opt/pmo-dashboard
pm2 start server/index.js --name pmo-dashboard
pm2 save
pm2 startup
# Run the command that PM2 outputs
```

## Step 9: Verify Application

Open in browser: `http://<YOUR-ELASTIC-IP>`

Login with:
- Username: `admin`
- Password: `admin123`

---

## Future Updates

When you make code changes:

**On your local machine:**
```bash
git add .
git commit -m "Your changes"
git push origin master
```

**On EC2:**
```bash
cd /opt/pmo-dashboard
git pull origin master
npm install --production
cd client && npm install && npm run build && cd ..
pm2 restart pmo-dashboard
```

---

## Troubleshooting

### Check application status
```bash
pm2 status
pm2 logs pmo-dashboard
```

### Check MongoDB
```bash
sudo systemctl status mongod
```

### Check Nginx
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Restart everything
```bash
sudo systemctl restart mongod
sudo systemctl restart nginx
pm2 restart pmo-dashboard
```
