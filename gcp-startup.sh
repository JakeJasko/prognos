#!/usr/bin/env bash
set -euo pipefail

echo "=== [Prognos GCP Free Tier VM Setup Starting] ==="

# 1. Configure 2GB Swap space (crucial for 1GB e2-micro stability)
if [ ! -f /swapfile ]; then
  echo "--> Setting up 2GB swap space..."
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "vm.swappiness=15" >> /etc/sysctl.conf
  sysctl -p
fi

# 2. Update packages and install Node.js 22 LTS
echo "--> Installing Node.js 22 and build essentials..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git

if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Create dedicated application user & directory
if ! id -u prognos &>/dev/null; then
  useradd -m -s /bin/bash prognos
fi

mkdir -p /opt/prognos
mkdir -p /opt/prognos/data
chown -R prognos:prognos /opt/prognos

# 4. Create Systemd Service Unit with port 80 permission
echo "--> Creating systemd service unit (/etc/systemd/system/prognos.service)..."
cat << 'EOF' > /etc/systemd/system/prognos.service
[Unit]
Description=Prognos Observatory - Autonomous Forecasting Platform
After=network.target

[Service]
Type=simple
User=prognos
WorkingDirectory=/opt/prognos
Environment=NODE_ENV=production
Environment=PORT=80
AmbientCapabilities=CAP_NET_BIND_SERVICE
ExecStart=/usr/bin/npx tsx server/index.ts
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable prognos.service

# If application code is already present, install dependencies, build, and start
if [ -f /opt/prognos/package.json ]; then
  echo "--> Initializing Prognos application..."
  cd /opt/prognos
  npm install
  npm run build
  systemctl restart prognos.service
fi

echo "=== [Prognos GCP Free Tier VM Setup Complete] ==="
