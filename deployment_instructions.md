# MUDUTECH Server Deployment & Subdirectory Setup Guide

This guide contains the credentials and scripts necessary to deploy a new project to a subdirectory on the `mudutech.com` server (e.g., `mudutech.com/anket`). 

> [!WARNING]
> Always verify the `REMOTE_DIR` target directory in your upload script. If left empty, you risk overwriting the main website (`mudutech.com`) files at the root directory.

---

## 1. Server FTP Connection Credentials

| Parameter | Value | Note |
| :--- | :--- | :--- |
| **FTP Host** | `35.159.104.36` | Production Server IP |
| **FTP User** | `mudutechfestcom` | Username |
| **FTP Pass** | `DTdREjPee6c25Fpe` | Password |
| **Protocol** | Standard FTP | Port 21 |
| **Target Directory** | `anket/` | Maps to `mudutech.com/anket` |

---

## 2. Deploying to a Subdirectory

To place your new page at `mudutech.com/anket`, a folder named `anket` must be created on the FTP server root, and all project files must be uploaded inside it.

Below is the automated bash deployment script. You can save this as `deploy.sh` in the root of your new project.

### Deployment Script (`deploy.sh`)

```bash
#!/bin/bash

# Server Connection Parameters
HOST="35.159.104.36"
USER="mudutechfestcom"
PASS="DTdREjPee6c25Fpe"

# TARGET SUBDIRECTORY (CRITICAL: MUST NOT BE EMPTY)
REMOTE_DIR="anket"

MARKER_FILE=".last_deploy"

# Colors for terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📦 1/2: Compiling new project...${NC}"
# Adjust this build command depending on your project type (e.g., Vite, Next.js, or static build)
npm run build

echo -e "${BLUE}📤 2/2: Deploying files to mudutech.com/${REMOTE_DIR}...${NC}"

# Enter compilation output folder (Vite standard is "dist")
cd dist

# Find files changed since last deployment
if [ -f "../$MARKER_FILE" ]; then
    FILES=$(find . -type f -newer "../$MARKER_FILE")
else
    FILES=$(find . -type f)
fi

if [ -z "$FILES" ]; then
    echo -e "${YELLOW}ℹ️ No files changed, skipping upload.${NC}"
else
    for FILE in $FILES; do
        # Clean leading "./"
        CLEAN_FILE=${FILE#./}
        echo -e "${YELLOW}📤 Uploading: ${CLEAN_FILE} -> ${REMOTE_DIR}/${CLEAN_FILE}${NC}"
        
        # Upload via curl FTP (creates remote subdirectories automatically)
        curl -s -S -u "$USER:$PASS" --ftp-create-dirs -T "$CLEAN_FILE" "ftp://$HOST/$REMOTE_DIR/$CLEAN_FILE" -P -
    done
    echo -e "${GREEN}✨ Project successfully deployed to https://mudutech.com/${REMOTE_DIR}${NC}"
fi

# Update marker timestamp
cd ..
touch "$MARKER_FILE"
```

---

## 3. Deployment Steps for the AI Assistant

If you are starting a new chat with another AI to build the `/anket` project:
1. Provide the AI with this `deployment_instructions.md` file.
2. Instruct the AI to structure the build folder so that the assets are correctly mapped relative to the `/anket/` subdirectory (for instance, in a Vite project, set `base: '/anket/'` in `vite.config.js`).
3. Have the AI run `bash deploy.sh` after compilation.
