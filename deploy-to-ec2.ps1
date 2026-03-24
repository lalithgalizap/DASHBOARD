# PMO Dashboard - Deploy to EC2 from Git
# This script deploys the application to EC2 instance from GitHub

$INSTANCE_IP = "54.91.119.157"
$INSTANCE_ID = "i-0d7a4563fc4fd3d3e"
$GIT_REPO = "https://github.com/lalithgalizap/DASHBOARD.git"

Write-Host "=== PMO Dashboard Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if instance is running
Write-Host "1. Checking EC2 instance status..." -ForegroundColor Yellow
$instanceState = aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].State.Name' --output text
Write-Host "   Instance state: $instanceState" -ForegroundColor Green

if ($instanceState -ne "running") {
    Write-Host "   ERROR: Instance is not running!" -ForegroundColor Red
    exit 1
}

# Wait for instance to be fully initialized (check if user-data script completed)
Write-Host ""
Write-Host "2. Waiting for instance initialization to complete..." -ForegroundColor Yellow
Write-Host "   This may take 5-10 minutes for first deployment..." -ForegroundColor Gray

$maxAttempts = 30
$attempt = 0
$initialized = $false

while ($attempt -lt $maxAttempts -and -not $initialized) {
    $attempt++
    Write-Host "   Attempt $attempt/$maxAttempts - Checking if Nginx is running..." -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "http://$INSTANCE_IP" -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 502 -or $response.StatusCode -eq 404) {
            $initialized = $true
            Write-Host "   ✓ Instance is ready!" -ForegroundColor Green
        }
    } catch {
        $elapsed = $attempt * 10
        Write-Host "   Waiting... $elapsed seconds elapsed" -ForegroundColor Gray
        Start-Sleep -Seconds 10
    }
}

if (-not $initialized) {
    Write-Host "   WARNING: Instance may still be initializing. Proceeding anyway..." -ForegroundColor Yellow
}

# Create deployment commands
$deployCommands = @"
#!/bin/bash
set -e

echo '=== Starting Deployment ==='

# Navigate to application directory
cd /opt/pmo-dashboard

# Clone or pull latest code from Git
if [ -d ".git" ]; then
    echo 'Pulling latest code from Git...'
    git pull origin master
else
    echo 'Cloning repository from Git...'
    cd /opt
    rm -rf pmo-dashboard
    git clone $GIT_REPO pmo-dashboard
    cd pmo-dashboard
fi

# Install backend dependencies
echo 'Installing backend dependencies...'
npm install --production

# Install frontend dependencies and build
echo 'Building frontend...'
cd client
npm install
npm run build
cd ..

# Ensure directories exist
mkdir -p uploads project-documents logs
chmod 755 uploads project-documents

# Start or restart application with PM2
echo 'Starting application with PM2...'
pm2 restart pmo-dashboard || pm2 start ecosystem.config.js
pm2 save

echo '=== Deployment Complete ==='
echo 'Application is running at: http://$INSTANCE_IP'
"@

# Save deployment script to temp file
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$deployCommands | Out-File -FilePath $tempScript -Encoding ASCII

Write-Host ""
Write-Host "3. Uploading deployment script to EC2..." -ForegroundColor Yellow

# Use AWS Systems Manager to execute commands (no SSH key needed)
Write-Host "   Executing deployment via AWS Systems Manager..." -ForegroundColor Gray

$commandId = aws ssm send-command `
    --instance-ids $INSTANCE_ID `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$deployCommands]" `
    --query 'Command.CommandId' `
    --output text

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Deployment command sent (ID: $commandId)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "4. Waiting for deployment to complete..." -ForegroundColor Yellow
    
    # Wait for command to complete
    $maxWait = 60
    $waited = 0
    $status = "InProgress"
    
    while ($waited -lt $maxWait -and $status -eq "InProgress") {
        Start-Sleep -Seconds 5
        $waited += 5
        $status = aws ssm get-command-invocation --command-id $commandId --instance-id $INSTANCE_ID --query 'Status' --output text
        Write-Host "   Status: $status (${waited}s elapsed)" -ForegroundColor Gray
    }
    
    if ($status -eq "Success") {
        Write-Host "   ✓ Deployment completed successfully!" -ForegroundColor Green
        
        # Get command output
        Write-Host ""
        Write-Host "5. Deployment output:" -ForegroundColor Yellow
        aws ssm get-command-invocation --command-id $commandId --instance-id $INSTANCE_ID --query 'StandardOutputContent' --output text
    } else {
        Write-Host "   ⚠ Deployment status: $status" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Error output:" -ForegroundColor Red
        aws ssm get-command-invocation --command-id $commandId --instance-id $INSTANCE_ID --query 'StandardErrorContent' --output text
    }
} else {
    Write-Host "   ERROR: Failed to send deployment command" -ForegroundColor Red
    exit 1
}

# Clean up temp file
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Deployment Summary ===" -ForegroundColor Cyan
Write-Host "Application URL: http://$INSTANCE_IP" -ForegroundColor Green
Write-Host "Instance ID: $INSTANCE_ID" -ForegroundColor Gray
Write-Host "Git Repository: $GIT_REPO" -ForegroundColor Gray
Write-Host ""
Write-Host "Default Login:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "⚠ IMPORTANT: Change the default password after first login!" -ForegroundColor Red
Write-Host ""
Write-Host "To update the application in future:" -ForegroundColor Cyan
Write-Host "  1. Make changes to code locally" -ForegroundColor White
Write-Host "  2. Commit and push to Git: git push origin master" -ForegroundColor White
Write-Host "  3. Run this script again: .\deploy-to-ec2.ps1" -ForegroundColor White
