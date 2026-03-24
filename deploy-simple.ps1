# Simple deployment script for PMO Dashboard
$INSTANCE_IP = "54.91.119.157"
$INSTANCE_ID = "i-0d7a4563fc4fd3d3e"

Write-Host "=== PMO Dashboard Deployment ===" -ForegroundColor Cyan
Write-Host "Instance IP: $INSTANCE_IP" -ForegroundColor Gray
Write-Host ""

# Deploy using AWS Systems Manager
Write-Host "Deploying application via AWS Systems Manager..." -ForegroundColor Yellow

$bashScript = @'
cd /opt/pmo-dashboard
if [ -d ".git" ]; then
  git pull origin master
else
  cd /opt && rm -rf pmo-dashboard && git clone https://github.com/lalithgalizap/DASHBOARD.git pmo-dashboard && cd pmo-dashboard
fi
npm install --production
cd client && npm install && npm run build && cd ..
mkdir -p uploads project-documents logs
chmod 755 uploads project-documents
pm2 restart pmo-dashboard || pm2 start ecosystem.config.js
pm2 save
echo "Deployment complete!"
'@

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunShellScript" `
    --parameters commands="$bashScript" `
    --query 'Command.CommandId' `
    --output text

Write-Host "Command sent: $commandId" -ForegroundColor Green
Write-Host ""
Write-Host "Waiting for deployment to complete (this may take 3-5 minutes)..." -ForegroundColor Yellow

Start-Sleep -Seconds 10

# Check status
$status = "InProgress"
$maxWait = 300
$waited = 0

while ($status -eq "InProgress" -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 10
    $waited += 10
    $status = aws ssm get-command-invocation --command-id $commandId --instance-id $INSTANCE_ID --query 'Status' --output text 2>$null
    Write-Host "Status: $status - Elapsed: $waited seconds" -ForegroundColor Gray
}

Write-Host ""
if ($status -eq "Success") {
    Write-Host "✓ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application URL: http://$INSTANCE_IP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Default Login:" -ForegroundColor Yellow
    Write-Host "  Username: admin" -ForegroundColor White
    Write-Host "  Password: admin123" -ForegroundColor White
} else {
    Write-Host "Deployment status: $status" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Getting output..." -ForegroundColor Gray
    aws ssm get-command-invocation --command-id $commandId --instance-id $INSTANCE_ID --query 'StandardOutputContent' --output text
    Write-Host ""
    Write-Host 'Errors (if any):' -ForegroundColor Red
    aws ssm get-command-invocation --command-id $commandId --instance-id $INSTANCE_ID --query 'StandardErrorContent' --output text
}
