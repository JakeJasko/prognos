<#
.SYNOPSIS
  Automated deployment of Prognos Observatory to GCP Free Tier e2-micro VM.
#>

param(
  [string]$Project = "nebulous-space",
  [string]$Account = "jakejasko@gmail.com",
  [string]$Zone = "us-central1-a",
  [string]$InstanceName = "prognos-vm"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  🌌 Prognos GCP Free Tier Automated Deployment Script" -ForegroundColor Cyan
Write-Host "  Project: $Project | Account: $Account | Zone: $Zone" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check gcloud CLI
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Error "gcloud CLI is not installed or not in PATH."
}

# 2. Check Authentication
Write-Host "[1/7] Verifying GCP Authentication..." -ForegroundColor Yellow
$authAccounts = @(gcloud auth list --format="value(account)")
if ($authAccounts -notcontains $Account) {
  Write-Host "Account $Account is not yet authenticated in gcloud." -ForegroundColor Red
  Write-Host "Please authenticate by running the following command:" -ForegroundColor Yellow
  Write-Host "  gcloud auth login $Account" -ForegroundColor Green
  exit 1
}

Write-Host "Setting active account to $Account..." -ForegroundColor Gray
gcloud config set account $Account
gcloud config set project $Project

# 3. Enable Compute Engine API
Write-Host "[2/7] Enabling Compute Engine API in project $Project..." -ForegroundColor Yellow
gcloud services enable compute.googleapis.com --project=$Project

# 4. Configure Firewall Rules (HTTP, HTTPS, 3000)
Write-Host "[3/7] Ensuring Firewall rules exist..." -ForegroundColor Yellow
$fwCheck = gcloud compute firewall-rules list --filter="name=allow-prognos-web" --format="value(name)" --project=$Project 2>&1
if (-not $fwCheck) {
  Write-Host "Creating firewall rule 'allow-prognos-web'..." -ForegroundColor Gray
  gcloud compute firewall-rules create allow-prognos-web `
    "--allow=tcp:80,tcp:443,tcp:3000" `
    --target-tags=prognos-server `
    --description="Allow HTTP, HTTPS, and port 3000 for Prognos" `
    --project=$Project
} else {
  Write-Host "Firewall rule 'allow-prognos-web' is already active." -ForegroundColor Gray
}

# 5. Check or Create e2-micro VM
Write-Host "[4/7] Checking for VM instance '$InstanceName'..." -ForegroundColor Yellow
$vmCheck = gcloud compute instances list --filter="name=$InstanceName AND zone:($Zone)" --format="value(name)" --project=$Project 2>&1
if (-not $vmCheck) {
  Write-Host "Creating GCP Free-Tier instance '$InstanceName' (e2-micro, 30GB pd-standard)..." -ForegroundColor Yellow
  gcloud compute instances create $InstanceName `
    --project=$Project `
    --zone=$Zone `
    --machine-type=e2-micro `
    --image-family=ubuntu-2404-lts-amd64 `
    --image-project=ubuntu-os-cloud `
    --boot-disk-size=30GB `
    --boot-disk-type=pd-standard `
    "--tags=prognos-server,http-server,https-server" `
    --metadata-from-file=startup-script=gcp-startup.sh
} else {
  Write-Host "VM instance '$InstanceName' already exists." -ForegroundColor Gray
}

# 6. Retrieve External IP
Write-Host "[5/7] Querying VM External IP Address..." -ForegroundColor Yellow
$externalIp = gcloud compute instances describe $InstanceName `
  --zone=$Zone `
  --project=$Project `
  --format="value(networkInterfaces[0].accessConfigs[0].natIP)"
Write-Host "Instance Public IP: $externalIp" -ForegroundColor Green

# Wait for VM SSH availability
Write-Host "Waiting for VM to complete startup and be ready for SSH..." -ForegroundColor Gray
$sshReady = $false
for ($i = 1; $i -le 30; $i++) {
  $test = gcloud compute ssh $InstanceName --zone=$Zone --project=$Project --command="echo ready" --quiet 2>&1
  if ($test -match "ready") {
    $sshReady = $true
    Write-Host "VM is ready for SSH connection!" -ForegroundColor Green
    break
  }
  Write-Host "Waiting for SSH ($i/30)..." -ForegroundColor Gray
  Start-Sleep -Seconds 6
}

# 7. Package and Deploy Application Source
Write-Host "[6/7] Preparing application bundle for remote transfer..." -ForegroundColor Yellow
$tempArchive = "$PSScriptRoot\prognos-bundle.tar.gz"
if (Test-Path $tempArchive) { Remove-Item -Force $tempArchive }

tar --exclude="node_modules" --exclude="dist" --exclude="data" --exclude=".git" --exclude="*.tar.gz" -czf $tempArchive package.json tsconfig.json vite.config.ts index.html public src server .env

Write-Host "Transferring application bundle to $InstanceName..." -ForegroundColor Gray
gcloud compute scp --zone=$Zone --project=$Project --quiet $tempArchive "${InstanceName}:/tmp/prognos-bundle.tar.gz"

Write-Host "[7/7] Unpacking, installing dependencies, and launching Prognos service..." -ForegroundColor Yellow
$remoteScript = @'
sudo mkdir -p /opt/prognos
sudo tar -xzf /tmp/prognos-bundle.tar.gz -C /opt/prognos
sudo chown -R prognos:prognos /opt/prognos
cd /opt/prognos
sudo -u prognos npm install
sudo -u prognos npm run build
sudo systemctl daemon-reload
sudo systemctl restart prognos.service
sudo systemctl status prognos.service --no-pager
'@

gcloud compute ssh $InstanceName --zone=$Zone --project=$Project --quiet --command="$remoteScript"

if (Test-Path $tempArchive) { Remove-Item -Force $tempArchive }

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  ✨ Prognos is now deployed and running on GCP! ✨" -ForegroundColor Green
Write-Host "  ➜ Public HTTP URL: http://$externalIp" -ForegroundColor Cyan
Write-Host "  ➜ Direct Port URL: http://${externalIp}:3000" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
