#!/bin/bash

# Nginx Setup Script for Angular Admin App
# Run this on VPS after deploying the admin app
# Usage: sudo bash scripts/setup-nginx.sh
# Or: cd /home/ubuntu/mah/admin && sudo bash scripts/setup-nginx.sh

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ADMIN_PATH="/home/ubuntu/mah/admin/browser"
NGINX_SITE="my-authors-hub-admin"

echo -e "${BLUE}Nginx Setup for Angular Admin App${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}This script must be run with sudo${NC}"
    echo "Usage: sudo bash scripts/setup-nginx.sh"
    exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx is not installed. Installing...${NC}"
    apt-get update
    apt-get install -y nginx
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install nginx${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Nginx installed${NC}"
fi

# Check if admin app directory exists
if [ ! -d "$ADMIN_PATH" ]; then
    echo -e "${RED}Admin app directory not found: $ADMIN_PATH${NC}"
    echo "Please deploy the admin app first using: npm run deploy:vps"
    exit 1
fi

# Create nginx configuration
echo -e "${GREEN}Creating nginx configuration...${NC}"

# Ask for domain or IP
read -p "Enter your domain name or IP address (or press Enter for default): " DOMAIN
DOMAIN=${DOMAIN:-"_"}

# Create nginx config file
cat > /etc/nginx/sites-available/${NGINX_SITE} << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    
    root ${ADMIN_PATH};
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Angular routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache HTML files
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Create symlink if it doesn't exist
if [ ! -L /etc/nginx/sites-enabled/${NGINX_SITE} ]; then
    ln -s /etc/nginx/sites-available/${NGINX_SITE} /etc/nginx/sites-enabled/
    echo -e "${GREEN}✓ Created symlink${NC}"
fi

# Test nginx configuration
echo -e "${YELLOW}Testing nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    
    # Reload nginx
    systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Nginx setup completed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Admin app is now accessible at:${NC}"
    if [ "$DOMAIN" != "_" ]; then
        echo -e "${GREEN}  http://${DOMAIN}${NC}"
    else
        echo -e "${GREEN}  http://$(hostname -I | awk '{print $1}')${NC}"
    fi
    echo ""
    echo -e "${YELLOW}To enable HTTPS (SSL), use Let's Encrypt:${NC}"
    echo "  sudo apt-get install certbot python3-certbot-nginx"
    echo "  sudo certbot --nginx -d your-domain.com"
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    exit 1
fi

