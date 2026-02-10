#!/bin/bash
# Script to start Chrome with remote debugging enabled for MCP testing

echo "Starting Chrome with remote debugging on port 9222..."

# Check if Chrome is already running
if pgrep -x "chrome" > /dev/null; then
    echo "Chrome is already running. Please close it first:"
    echo "  pkill chrome"
    echo ""
    read -p "Press Enter to continue after closing Chrome, or Ctrl+C to cancel..."
fi

# Start Chrome with remote debugging
# Adjust the path to Chrome based on your system
if command -v google-chrome &> /dev/null; then
    google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
elif command -v chromium-browser &> /dev/null; then
    chromium-browser --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
elif command -v chromium &> /dev/null; then
    chromium --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
else
    echo "Error: Chrome/Chromium not found in PATH"
    echo "Please install Chrome or Chromium, or update the script with the correct path"
    exit 1
fi

echo "Chrome started with remote debugging on port 9222"
echo "You can now use Chrome DevTools MCP to test the optimizations"
echo ""
echo "Verify connection:"
echo "  curl http://localhost:9222/json/version"
echo ""
echo "Then navigate to: http://localhost:3004/puzzles/100"

