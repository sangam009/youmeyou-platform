#!/bin/bash

# Change to the frontend directory
cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install

echo "Starting the React application..."
npm start 