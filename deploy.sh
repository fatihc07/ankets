#!/bin/bash

# Exit on error
set -e

echo "=== 1. Compiling Next.js project with basePath=/anket ==="
export NEXT_PUBLIC_BASE_PATH="/anket"
npm run build

echo "=== 2. Preparing standalone files ==="
mkdir -p .next/standalone/.next
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

echo "=== 3. Starting FTP deployment ==="
python3 deploy.py
