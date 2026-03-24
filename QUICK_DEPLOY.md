# Quick Deployment Commands - PMO Dashboard on AWS EC2

This is a condensed command reference for deploying the PMO Dashboard. For detailed explanations, see `AWS_DEPLOYMENT_GUIDE.md`.

## 1. Launch EC2 Instance

**Via AWS Console:**
- AMI: Ubuntu 22.04 LTS
- Instance Type: t3.small (minimum)
- Storage: 20 GB gp3
- Security Group: Allow ports 22, 80, 443

**Or via AWS CLI:**
```bash
aws ec2 run-instances \
  --image-id ami-0c7217cdde317cfec \
  --instance-type t3.small \
  --key-name your-key-name \
  --security-group-ids sg-xxxxxxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=pmo-dashboard}]'
```

## 2. Connect to EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

## 3. Install MongoDB

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

## 4. Setup MongoDB Database

```bash
mongosh
```

```javascript
use pmo_db
db.createUser({
  user: "pmo_admin",
  pwd: "CHANGE_THIS_PASSWORD",
  roles: [{ role: "readWrite", db: "pmo_db" }]
})
exit
```

## 5. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git
```

## 6. Upload Application

**Option A - SCP from local machine:**
```bash
scp -i your-key.pem -r /path/to/DASHBOARD ubuntu@your-ec2-ip:/home/ubuntu/pmo-dashboard
```

**Option B - Git clone:**
```bash
cd /home/ubuntu
git clone https://your-repo-url/pmo-dashboard.git
```

## 7. Install Dependencies & Build

```bash
cd /home/ubuntu/pmo-dashboard
npm install
cd client && npm install && npm run build && cd ..
```

## 8. Configure Environment

```bash
nano .env
```

```env
MONGODB_URI=mongodb://pmo_admin:YOUR_PASSWORD@localhost:27017/pmo_db
PORT=5000
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NODE_ENV=production
```

## 9. Create Directories

```bash
mkdir -p uploads project-documents logs
chmod 755 uploads project-documents
```

## 10. Install & Configure PM2

```bash
sudo npm install -g pm2

cat > ecosystem.config.js << 'EOF'
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
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

## 11. Install & Configure Nginx

```bash
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/pmo-dashboard > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;

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
EOF

sudo ln -s /etc/nginx/sites-available/pmo-dashboard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 12. Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## 13. Setup SSL (Optional)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 14. Create Backup Script

```bash
cat > /home/ubuntu/backup-mongodb.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://pmo_admin:YOUR_PASSWORD@localhost:27017/pmo_db" --out="$BACKUP_DIR/backup_$DATE"
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} + 2>/dev/null
echo "Backup completed: $DATE"
EOF

chmod +x /home/ubuntu/backup-mongodb.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-mongodb.sh") | crontab -
```

## 15. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs pmo-dashboard --lines 50

# Test application
curl http://localhost:5000/api/projects

# Check Nginx
sudo systemctl status nginx

# Check MongoDB
sudo systemctl status mongod
```

## Quick Commands Reference

```bash
# Restart application
pm2 restart pmo-dashboard

# View logs
pm2 logs pmo-dashboard

# Monitor resources
pm2 monit

# Restart Nginx
sudo systemctl restart nginx

# Check disk space
df -h

# View application directory size
du -sh /home/ubuntu/pmo-dashboard/*

# Backup MongoDB manually
/home/ubuntu/backup-mongodb.sh

# Update application (if using Git)
cd /home/ubuntu/pmo-dashboard
git pull
npm install
cd client && npm install && npm run build && cd ..
pm2 restart pmo-dashboard
```

## Access Application

- **URL:** `http://your-ec2-ip` or `http://your-domain.com`
- **Default Login:** 
  - Username: `admin`
  - Password: `admin123`

**⚠️ Change default password immediately!**

## Troubleshooting

```bash
# Application won't start
pm2 logs pmo-dashboard --lines 100
sudo lsof -i :5000

# MongoDB connection failed
sudo systemctl status mongod
sudo tail -f /var/log/mongodb/mongod.log

# Nginx errors
sudo nginx -t
sudo tail -f /var/log/nginx/error.log

# Fix permissions
chmod 755 /home/ubuntu/pmo-dashboard/uploads
chmod 755 /home/ubuntu/pmo-dashboard/project-documents
```

## Security Checklist

- [ ] Changed default admin password
- [ ] Generated strong JWT_SECRET
- [ ] MongoDB authentication enabled
- [ ] UFW firewall enabled
- [ ] .env file permissions set to 600
- [ ] SSL certificate installed (if using domain)
- [ ] Regular backups scheduled
- [ ] Security group properly configured

## Cost Estimate

- t3.small instance: ~$15/month
- 20 GB storage: ~$2/month
- **Total: ~$17-20/month**
