#!/bin/bash

# Deployment script for Angular Admin App to Hostinger VPS
# Usage: ./deploy-vps.sh [VPS_HOST] [VPS_USER]
# 
# Configuration priority (highest to lowest):
# 1. Command-line arguments
# 2. Environment variables
# 3. .env file

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to load VPS config from .env.production or .env file
load_env() {
    # Try .env.production first (for production deployment)
    ENV_FILE=""
    if [ -f .env.production ]; then
        ENV_FILE=".env.production"
        echo "Using .env.production for deployment configuration"
    elif [ -f .env ]; then
        ENV_FILE=".env"
        echo "Using .env for deployment configuration"
    fi
    
    if [ -n "$ENV_FILE" ]; then
        # Extract VPS_HOST from env file
        if [ -z "${VPS_HOST}" ]; then
            while IFS= read -r line || [ -n "$line" ]; do
                # Skip empty lines and comments
                case "$line" in
                    ""|\#*) continue ;;
                esac
                # Remove leading/trailing spaces from line
                line=$(echo "$line" | sed 's/^ *//;s/ *$//')
                # Check if line contains VPS_HOST=
                case "$line" in
                    VPS_HOST=*)
                        VPS_HOST="${line#VPS_HOST=}"
                        # Remove quotes
                        VPS_HOST="${VPS_HOST#\"}"
                        VPS_HOST="${VPS_HOST%\"}"
                        VPS_HOST="${VPS_HOST#\'}"
                        VPS_HOST="${VPS_HOST%\'}"
                        # Remove leading/trailing whitespace
                        VPS_HOST=$(echo "$VPS_HOST" | sed 's/^ *//;s/ *$//')
                        [ -n "$VPS_HOST" ] && export VPS_HOST
                        break
                        ;;
                esac
            done < "$ENV_FILE"
        fi
        
        # Extract VPS_USER from env file
        if [ -z "${VPS_USER}" ]; then
            while IFS= read -r line || [ -n "$line" ]; do
                # Skip empty lines and comments
                case "$line" in
                    ""|\#*) continue ;;
                esac
                # Remove leading/trailing spaces from line
                line=$(echo "$line" | sed 's/^ *//;s/ *$//')
                # Check if line contains VPS_USER=
                case "$line" in
                    VPS_USER=*)
                        VPS_USER="${line#VPS_USER=}"
                        # Remove quotes
                        VPS_USER="${VPS_USER#\"}"
                        VPS_USER="${VPS_USER%\"}"
                        VPS_USER="${VPS_USER#\'}"
                        VPS_USER="${VPS_USER%\'}"
                        # Remove leading/trailing whitespace
                        VPS_USER=$(echo "$VPS_USER" | sed 's/^ *//;s/ *$//')
                        [ -n "$VPS_USER" ] && export VPS_USER
                        break
                        ;;
                esac
            done < "$ENV_FILE"
        fi
    fi
}

# Load .env file if it exists
load_env

# Configuration - Priority: CLI args > Environment vars > .env file > defaults
VPS_HOST="${1:-${VPS_HOST}}"
VPS_USER="${2:-${VPS_USER:-ubuntu}}"
VPS_PATH="/home/${VPS_USER}/mah/admin"
LOCAL_PATH="$(pwd)"

# Check if VPS_HOST is provided
if [ -z "$VPS_HOST" ]; then
    echo -e "${RED}Error: VPS host is required${NC}"
    echo "Please provide VPS_HOST in one of the following ways:"
    echo "  1. Command-line argument: ./deploy-vps.sh your-vps-host"
    echo "  2. Environment variable: export VPS_HOST=your-vps-host"
    echo "  3. .env.production file: Add VPS_HOST=your-vps-host to .env.production (preferred)"
    echo "  4. .env file: Add VPS_HOST=your-vps-host to .env (fallback)"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Angular Admin App Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Starting deployment to VPS...${NC}"
echo -e "${YELLOW}VPS Host: ${VPS_HOST}${NC}"
echo -e "${YELLOW}VPS User: ${VPS_USER}${NC}"
echo -e "${YELLOW}VPS Path: ${VPS_PATH}${NC}"
echo ""

# Step 1: Check for .env.production file
echo -e "${GREEN}[1/5] Checking environment configuration...${NC}"
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Warning: .env.production file not found${NC}"
    echo -e "${YELLOW}The build will use default values.${NC}"
    echo -e "${YELLOW}Create .env.production with: apiUrl, O2AUTH_CLIENT_ID, VPS_HOST, VPS_USER, etc.${NC}"
    echo ""
else
    echo -e "${GREEN}✓ Found .env.production file${NC}"
    # Show which values will be used (without exposing secrets)
    if grep -q "^apiUrl=" .env.production 2>/dev/null; then
        API_URL=$(grep "^apiUrl=" .env.production | cut -d '=' -f2- | sed 's/^[ \t]*//;s/[ \t]*$//' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        echo -e "${YELLOW}  API URL: ${API_URL}${NC}"
    fi
    echo ""
fi

# Step 2: Build the Angular app locally
echo -e "${GREEN}[2/5] Building Angular app locally (production)...${NC}"

# Ensure .env.production exists and set NODE_ENV
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production file is required for production build${NC}"
    echo -e "${YELLOW}Please create .env.production with: apiUrl, O2AUTH_CLIENT_ID, etc.${NC}"
    exit 1
fi

# Explicitly set NODE_ENV=production and run setup:prod to use .env.production
echo -e "${YELLOW}Running setup:prod to load .env.production...${NC}"
NODE_ENV=production npm run setup:prod

if [ $? -ne 0 ]; then
    echo -e "${RED}Environment setup failed!${NC}"
    exit 1
fi

# Now build with production configuration
echo -e "${YELLOW}Building Angular app with production configuration...${NC}"
ng build --configuration production

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Copy _redirects file if it exists
if [ -f "_redirects" ]; then
    cp _redirects dist/my-authors-hub/ 2>/dev/null || true
    echo -e "${GREEN}✓ Copied _redirects file${NC}"
fi

echo -e "${GREEN}✓ Build completed using .env.production${NC}"
echo ""

# Step 3: Verify build output
BUILD_OUTPUT="dist/my-authors-hub/browser"
if [ ! -d "$BUILD_OUTPUT" ]; then
    echo -e "${RED}Error: Build output not found at $BUILD_OUTPUT${NC}"
    exit 1
fi

# Step 4: Create temporary directory for deployment files
echo -e "${GREEN}[3/5] Preparing deployment files...${NC}"
TEMP_DIR=$(mktemp -d)
DEPLOY_DIR="${TEMP_DIR}/deploy"

mkdir -p "${DEPLOY_DIR}"

# Copy only the browser folder (optimized static files)
cp -r "${BUILD_OUTPUT}" "${DEPLOY_DIR}/browser"
# Copy _redirects file if it exists
[ -f "_redirects" ] && cp "_redirects" "${DEPLOY_DIR}/" || true
# Copy scripts folder (for nginx setup and other utilities)
if [ -d "scripts" ]; then
    mkdir -p "${DEPLOY_DIR}/scripts"
    cp scripts/setup-nginx.sh "${DEPLOY_DIR}/scripts/" 2>/dev/null || true
    cp nginx-example.conf "${DEPLOY_DIR}/" 2>/dev/null || true
fi

echo -e "${GREEN}✓ Files prepared${NC}"
echo ""

# Step 5: Create deployment package
echo -e "${GREEN}[4/5] Creating deployment package...${NC}"
cd "${TEMP_DIR}"
tar -czf deploy.tar.gz deploy/
echo -e "${GREEN}✓ Package created${NC}"
echo ""

# Step 6: Transfer files to VPS
echo -e "${GREEN}[5/5] Transferring files to VPS...${NC}"

# Test connectivity first
echo -e "${YELLOW}Testing connection to ${VPS_HOST}...${NC}"
if ! ping -c 1 -W 2 "${VPS_HOST}" &> /dev/null; then
    echo -e "${RED}Cannot reach ${VPS_HOST}. Possible issues:${NC}"
    echo -e "${YELLOW}  1. VPS is down or IP address has changed${NC}"
    echo -e "${YELLOW}  2. Firewall is blocking ICMP/SSH${NC}"
    echo -e "${YELLOW}  3. Network connectivity issue${NC}"
    echo -e "${YELLOW}Please verify the VPS is running and the IP address is correct.${NC}"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Use SSH with BatchMode to avoid password prompts (forces key-based auth)
scp -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${TEMP_DIR}/deploy.tar.gz" "${VPS_USER}@${VPS_HOST}:/tmp/" 2>&1
SCP_EXIT_CODE=$?
if [ $SCP_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}File transfer failed!${NC}"
    echo -e "${YELLOW}Possible issues:${NC}"
    echo -e "${YELLOW}  1. SSH service is not running on VPS${NC}"
    echo -e "${YELLOW}  2. Firewall is blocking port 22${NC}"
    echo -e "${YELLOW}  3. SSH key authentication failed${NC}"
    echo -e "${YELLOW}  4. VPS IP address or hostname is incorrect${NC}"
    echo -e "${YELLOW}Test SSH connection manually: ssh ${VPS_USER}@${VPS_HOST}${NC}"
    rm -rf "${TEMP_DIR}"
    exit 1
fi
echo -e "${GREEN}✓ Files transferred${NC}"
echo ""

# Step 7: Extract and setup on VPS
echo -e "${GREEN}Setting up on VPS...${NC}"
# Use SSH with BatchMode to avoid password prompts (forces key-based auth)
ssh -o BatchMode=yes -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" << EOF
    set -e
    
    # Source profile to ensure npm and other tools are available
    [ -f ~/.bashrc ] && source ~/.bashrc 2>/dev/null || true
    [ -f ~/.bash_profile ] && source ~/.bash_profile 2>/dev/null || true
    [ -f ~/.profile ] && source ~/.profile 2>/dev/null || true
    [ -f ~/.nvm/nvm.sh ] && source ~/.nvm/nvm.sh 2>/dev/null || true
    
    # Ensure npm is in PATH
    if [ -d ~/.nvm/versions/node ]; then
        NVM_NODE_PATH=\$(ls -d ~/.nvm/versions/node/*/bin 2>/dev/null | head -1)
        [ -n "\$NVM_NODE_PATH" ] && export PATH="\$NVM_NODE_PATH:\$PATH"
    fi
    export PATH="/usr/local/bin:/usr/bin:/bin:\$PATH"
    
    # Create directory if it doesn't exist and ensure proper permissions
    mkdir -p "${VPS_PATH}"
    chown -R \$(whoami):\$(whoami) "${VPS_PATH}" 2>/dev/null || true
    chmod 755 "${VPS_PATH}"
    
    # Backup existing browser folder if it exists
    if [ -d "${VPS_PATH}/browser" ]; then
        echo "Backing up existing browser folder..."
        # Try to move it, if that fails due to permissions, just remove it
        if mv "${VPS_PATH}/browser" "${VPS_PATH}/browser.backup.\$(date +%Y%m%d_%H%M%S)" 2>/dev/null; then
            echo "✓ Browser folder backed up"
        else
            echo "Warning: Could not backup browser folder (permission issue), removing it..."
            rm -rf "${VPS_PATH}/browser" 2>/dev/null || sudo rm -rf "${VPS_PATH}/browser" 2>/dev/null || true
        fi
    fi
    
    # Extract deployment package to a temp location first, then move
    TEMP_EXTRACT=\$(mktemp -d)
    cd "\$TEMP_EXTRACT"
    tar -xzf /tmp/deploy.tar.gz
    
    if [ ! -d "deploy" ]; then
        echo "Error: deploy directory not found in archive"
        rm -rf "\$TEMP_EXTRACT"
        rm -f /tmp/deploy.tar.gz
        exit 1
    fi
    
    # Move to final location
    cd "${VPS_PATH}"
    
    # Move files from temp extract location
    # Remove existing browser if it exists (in case backup failed)
    [ -d "browser" ] && rm -rf browser 2>/dev/null || true
    
    # Move new files from deploy directory
    if [ -d "\$TEMP_EXTRACT/deploy/browser" ]; then
        mv "\$TEMP_EXTRACT/deploy/browser" . || cp -r "\$TEMP_EXTRACT/deploy/browser" . || {
            echo "Error: Failed to move browser folder"
            rm -rf "\$TEMP_EXTRACT"
            exit 1
        }
    fi
    
    [ -f "\$TEMP_EXTRACT/deploy/_redirects" ] && mv "\$TEMP_EXTRACT/deploy/_redirects" . 2>/dev/null || true
    
    # Move scripts folder if it exists
    if [ -d "\$TEMP_EXTRACT/deploy/scripts" ]; then
        [ -d "scripts" ] && rm -rf scripts 2>/dev/null || true
        mv "\$TEMP_EXTRACT/deploy/scripts" . 2>/dev/null || cp -r "\$TEMP_EXTRACT/deploy/scripts" . 2>/dev/null || true
        chmod +x scripts/*.sh 2>/dev/null || true
    fi
    
    [ -f "\$TEMP_EXTRACT/deploy/nginx-example.conf" ] && mv "\$TEMP_EXTRACT/deploy/nginx-example.conf" . 2>/dev/null || true
    
    # Cleanup temp extract directory
    rm -rf "\$TEMP_EXTRACT"
    
    # Set proper permissions (ensure ubuntu user owns the files)
    chown -R \$(whoami):\$(whoami) browser 2>/dev/null || true
    chmod -R 755 browser
    
    # Cleanup
    rm -f /tmp/deploy.tar.gz
    
    echo "✓ Setup completed on VPS"
    echo ""
    echo "Admin app deployed to: ${VPS_PATH}/browser"
    echo ""
    if [ -f "${VPS_PATH}/scripts/setup-nginx.sh" ]; then
        echo "To setup nginx (recommended):"
        echo "  cd ${VPS_PATH}"
        echo "  sudo bash scripts/setup-nginx.sh"
    fi
    echo ""
    echo "Other options to serve the app:"
    echo "  1. Use nginx (recommended for production) - see above"
    echo "  2. Use the API's serve-static module"
    echo "  3. Use a simple HTTP server: cd ${VPS_PATH} && npx serve browser"
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}VPS setup failed!${NC}"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Cleanup local temp directory
rm -rf "${TEMP_DIR}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Admin app is deployed to: ${VPS_PATH}/browser${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
if [ -f "scripts/setup-nginx.sh" ]; then
    echo -e "${YELLOW}  1. Setup nginx (recommended):${NC}"
    echo -e "${GREEN}     ssh ${VPS_USER}@${VPS_HOST}${NC}"
    echo -e "${GREEN}     cd ${VPS_PATH}${NC}"
    echo -e "${GREEN}     sudo bash scripts/setup-nginx.sh${NC}"
    echo ""
    echo -e "${YELLOW}  2. Or configure the API to serve static files${NC}"
    echo -e "${YELLOW}  3. Or use a simple server: cd ${VPS_PATH} && npx serve browser${NC}"
else
    echo -e "${YELLOW}  1. Configure nginx to serve the app (recommended)${NC}"
    echo -e "${YELLOW}  2. Or configure the API to serve static files${NC}"
    echo -e "${YELLOW}  3. Or use a simple server: cd ${VPS_PATH} && npx serve browser${NC}"
fi
echo ""

