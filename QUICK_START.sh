#!/bin/bash
# Leanbot Multi-Robot Online System - Quick Start Guide

echo "🤖 Leanbot Multi-Robot Online System - Quick Start"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the webleanbot root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo ""
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build succeeded!"
echo ""
echo "=================================================="
echo "🚀 QUICK START:"
echo "=================================================="
echo ""
echo "Terminal 1 - Start Web Dev Server:"
echo "  npm run dev"
echo "  → Access: http://localhost:5173"
echo ""
echo "Terminal 2 - Start WebSocket Server:"
echo "  npx tsx server/robotNetworkServer.ts"
echo "  → Server: ws://localhost:8080"
echo ""
echo "=================================================="
echo "📚 USAGE:"
echo "=================================================="
echo ""
echo "1️⃣  ROBOT 1 (Browser Tab 1):"
echo "   - Click '➕ Create Room'"
echo "   - Copy Room ID (e.g., 'ABC123')"
echo "   - Run robot code"
echo ""
echo "2️⃣  ROBOT 2 (Browser Tab 2):"
echo "   - Click '🔗 Join Room'"
echo "   - Paste Room ID: 'ABC123'"
echo "   - Click 'Join'"
echo ""
echo "3️⃣  Both robots should now sync in real-time!"
echo ""
echo "=================================================="
echo "📖 DOCUMENTATION:"
echo "=================================================="
echo ""
echo "- Architecture: docs/MULTI_ROBOT_ONLINE.md"
echo "- Implementation: MULTI_ROBOT_IMPLEMENTATION.md"
echo "- Integration: src/student/MultiRobotIntegration.tsx"
echo ""
echo "=================================================="
echo "✨ Features:"
echo "=================================================="
echo ""
echo "✓ Fixed diagonal movement kinematics"
echo "✓ WebSocket multi-robot sync system"
echo "✓ Room creation with unique IDs"
echo "✓ Real-time state synchronization (20 FPS)"
echo "✓ Multi-robot rendering on same canvas"
echo "✓ Auto-reconnect on disconnect"
echo "✓ Peer discovery and notifications"
echo ""
echo "=================================================="
echo ""
