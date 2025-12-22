#!/bin/bash
set -e

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 24


echo "🚀 Deploying Angular app..."

echo "📥 Pulling latest code..."
git pull origin main

# echo "📦 Installing dependencies..."
# npm ci

echo "🏗️ Building Angular app..."
npm run build:prod

echo "🔄 Reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Angular deployment completed"
