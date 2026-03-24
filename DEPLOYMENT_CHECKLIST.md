# AWS EC2 Deployment Checklist - PMO Dashboard

Use this checklist to ensure all deployment steps are completed correctly.

## Pre-Deployment

- [ ] Review application requirements
- [ ] Confirm AWS account access and permissions
- [ ] Generate SSH key pair for EC2 access
- [ ] Decide on instance size (t3.small minimum recommended)
- [ ] Decide on MongoDB hosting (same EC2 vs Atlas)
- [ ] Prepare domain name (if using custom domain)

## AWS Infrastructure Setup

- [ ] Launch EC2 instance (Ubuntu 22.04 LTS)
- [ ] Configure instance type (t3.small or larger)
- [ ] Allocate 20+ GB storage (gp3)
- [ ] Create/configure security group:
  - [ ] Port 22 (SSH) - Your IP only
  - [ ] Port 80 (HTTP) - 0.0.0.0/0
  - [ ] Port 443 (HTTPS) - 0.0.0.0/0
  - [ ] Port 27017 (MongoDB) - 127.0.0.1 only
- [ ] Allocate and associate Elastic IP
- [ ] Tag instance appropriately (Name: pmo-dashboard)
- [ ] Test SSH connection to instance

## System Setup

- [ ] Update system packages (`sudo apt update && sudo apt upgrade -y`)
- [ ] Install MongoDB 7.0
- [ ] Start and enable MongoDB service
- [ ] Configure MongoDB to bind to localhost only
- [ ] Create MongoDB database and user
- [ ] Test MongoDB connection
- [ ] Install Node.js 18.x LTS
- [ ] Install Git
- [ ] Verify Node.js and npm versions

## Application Deployment

- [ ] Upload/clone application code to `/home/ubuntu/pmo-dashboard`
- [ ] Install backend dependencies (`npm install`)
- [ ] Install frontend dependencies (`cd client && npm install`)
- [ ] Build frontend production files (`npm run build`)
- [ ] Create `.env` file with production settings:
  - [ ] Set MONGODB_URI with authentication
  - [ ] Generate and set strong JWT_SECRET
  - [ ] Set PORT=5000
  - [ ] Set NODE_ENV=production
- [ ] Create required directories:
  - [ ] `uploads/`
  - [ ] `project-documents/`
  - [ ] `logs/`
- [ ] Set proper directory permissions (755)
- [ ] Secure `.env` file permissions (600)

## Process Management (PM2)

- [ ] Install PM2 globally (`sudo npm install -g pm2`)
- [ ] Copy `ecosystem.config.js` to application directory
- [ ] Update paths in ecosystem.config.js if needed
- [ ] Start application with PM2 (`pm2 start ecosystem.config.js`)
- [ ] Verify application is running (`pm2 status`)
- [ ] Check logs for errors (`pm2 logs pmo-dashboard`)
- [ ] Save PM2 process list (`pm2 save`)
- [ ] Configure PM2 startup script (`pm2 startup systemd`)
- [ ] Run the generated startup command
- [ ] Test application locally (`curl http://localhost:5000`)

## Web Server (Nginx)

- [ ] Install Nginx
- [ ] Copy nginx configuration to `/etc/nginx/sites-available/pmo-dashboard`
- [ ] Update server_name in nginx config (domain or IP)
- [ ] Create symlink to sites-enabled
- [ ] Remove default site symlink
- [ ] Test Nginx configuration (`sudo nginx -t`)
- [ ] Restart Nginx service
- [ ] Enable Nginx to start on boot
- [ ] Test application via Nginx (`curl http://your-ec2-ip`)

## SSL/HTTPS Setup (If Using Domain)

- [ ] Point domain DNS to EC2 Elastic IP
- [ ] Wait for DNS propagation (can take up to 48 hours)
- [ ] Install Certbot and Nginx plugin
- [ ] Run Certbot to obtain SSL certificate
- [ ] Verify SSL certificate installation
- [ ] Test HTTPS access
- [ ] Verify auto-renewal is configured (`sudo certbot renew --dry-run`)

## Security Hardening

- [ ] Enable UFW firewall
- [ ] Configure UFW rules (SSH, Nginx Full)
- [ ] Enable MongoDB authentication
- [ ] Secure .env file permissions
- [ ] Change default admin password in application
- [ ] Review and update JWT_SECRET
- [ ] Disable root SSH login (optional but recommended)
- [ ] Configure fail2ban (optional but recommended)

## Backup Configuration

- [ ] Create backup directory (`/home/ubuntu/backups/mongodb`)
- [ ] Create backup script (`backup-mongodb.sh`)
- [ ] Update MongoDB password in backup script
- [ ] Make backup script executable
- [ ] Test backup script manually
- [ ] Schedule daily backups via cron (2 AM)
- [ ] Verify backup files are created
- [ ] Test backup restoration process

## Monitoring Setup

- [ ] Configure CloudWatch monitoring (optional)
- [ ] Set up disk space alerts
- [ ] Set up CPU/Memory alerts
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Set up log rotation for application logs
- [ ] Set up log rotation for Nginx logs

## Testing & Validation

- [ ] Access application via browser
- [ ] Test login with default credentials
- [ ] Change default admin password
- [ ] Create test project
- [ ] Upload test Excel document
- [ ] Create test weekly update
- [ ] Create test user
- [ ] Test all CRUD operations
- [ ] Verify file uploads work correctly
- [ ] Test application on mobile device
- [ ] Check browser console for errors
- [ ] Review PM2 logs for any warnings
- [ ] Review Nginx access/error logs
- [ ] Test application restart (`pm2 restart pmo-dashboard`)
- [ ] Test server reboot (application should auto-start)

## Documentation

- [ ] Document EC2 instance details (ID, IP, region)
- [ ] Document Elastic IP address
- [ ] Document domain name (if applicable)
- [ ] Document MongoDB credentials (store securely)
- [ ] Document application admin credentials
- [ ] Document backup location and schedule
- [ ] Update README.md with deployment information
- [ ] Create runbook for common operations
- [ ] Document troubleshooting steps

## Post-Deployment

- [ ] Notify team of deployment completion
- [ ] Provide access credentials to authorized users
- [ ] Schedule first backup verification
- [ ] Schedule security review (1 week post-deployment)
- [ ] Plan for regular maintenance windows
- [ ] Set up monitoring alerts
- [ ] Create incident response plan

## Regular Maintenance (Schedule)

### Daily
- [ ] Check PM2 status
- [ ] Review application logs for errors
- [ ] Monitor disk space usage

### Weekly
- [ ] Review backup logs
- [ ] Check for security updates
- [ ] Review application performance metrics
- [ ] Test backup restoration (monthly, not weekly)

### Monthly
- [ ] Apply system security updates
- [ ] Review and update dependencies
- [ ] Rotate JWT secrets (quarterly, not monthly)
- [ ] Review user access and permissions
- [ ] Test disaster recovery procedures

### Quarterly
- [ ] Review AWS costs and optimize
- [ ] Update Node.js and npm if needed
- [ ] Security audit
- [ ] Performance optimization review

## Rollback Plan

In case deployment fails:

- [ ] Document current state before changes
- [ ] Keep previous version backup
- [ ] Test rollback procedure:
  1. Stop PM2 application
  2. Restore previous code version
  3. Restore previous database backup
  4. Restart application
  5. Verify functionality

## Emergency Contacts

- **AWS Support:** _________________
- **System Administrator:** _________________
- **Database Administrator:** _________________
- **Application Owner:** _________________

## Deployment Information

- **Deployment Date:** _________________
- **Deployed By:** _________________
- **EC2 Instance ID:** _________________
- **EC2 Region:** _________________
- **Elastic IP:** _________________
- **Domain Name:** _________________
- **MongoDB Version:** _________________
- **Node.js Version:** _________________
- **Application Version:** _________________

## Notes

_Use this space for deployment-specific notes, issues encountered, or special configurations:_

---

**Status:** ☐ Not Started | ☐ In Progress | ☐ Completed | ☐ Failed

**Completion Date:** _________________

**Verified By:** _________________
