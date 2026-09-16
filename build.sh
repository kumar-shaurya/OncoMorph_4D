#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Building React Frontend..."
cd frontend-brain2
npm install
npm run build
cd ..

echo "Installing Python Dependencies..."
pip install -r requirements.txt