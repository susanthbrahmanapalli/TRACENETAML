#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "=========================================="
echo "Starting TraceNet Unified Production Build"
echo "=========================================="

# 1. Build React Frontend SPA
echo "1/3. Building Frontend SPA with Vite..."
cd src/frontend
npm install
npm run build
cd ../..

# 2. Install Python Dependencies
echo "2/3. Installing Python Backend Dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 3. Seed Database
echo "3/3. Initializing SQLite Database & Demo Data..."
python -m src.backend.data_generator

echo "=========================================="
echo "TraceNet Build Succeeded!"
echo "=========================================="
