@echo off
echo === PMO Dashboard Deployment ===
echo.
echo Instance IP: 54.91.119.157
echo Instance ID: i-0d7a4563fc4fd3d3e
echo.
echo Deploying application from Git...
echo This will take 3-5 minutes...
echo.

aws ssm send-command ^
  --instance-ids i-0d7a4563fc4fd3d3e ^
  --document-name "AWS-RunShellScript" ^
  --parameters commands="cd /opt/pmo-dashboard && git clone https://github.com/lalithgalizap/DASHBOARD.git . 2>/dev/null || git pull origin master && npm install --production && cd client && npm install && npm run build && cd .. && mkdir -p uploads project-documents logs && chmod 755 uploads project-documents && pm2 delete pmo-dashboard 2>/dev/null; pm2 start ecosystem.config.js && pm2 save && echo Deployment complete!" ^
  --output text ^
  --query "Command.CommandId"

echo.
echo Deployment command sent!
echo.
echo Wait 3-5 minutes, then access your application at:
echo http://54.91.119.157
echo.
echo Default Login:
echo   Username: admin
echo   Password: admin123
echo.
pause
