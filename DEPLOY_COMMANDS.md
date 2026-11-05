# 🚀 DEPLOYMENT QUICK REFERENCE

## Your Current Status
```
✅ Frontend GitHub Actions: CONFIGURED
✅ Environment Variables: CONFIGURED  
✅ Backend Procfile: CONFIGURED
✅ Build Pipeline: VERIFIED ✓

⏳ Next: Deploy Backend + Update WebSocket URL
```

---

## 📋 Copy-Paste Commands

### STEP 1: Check GitHub Actions (No commands needed)
```
Visit: https://github.com/HoangTung108/webleanbot/actions
Wait for: GREEN ✅ checkmark (2-3 minutes)
```

---

### STEP 2A: Deploy on Render (RECOMMENDED)

**No terminal commands needed - all in browser:**

1. Go to: https://render.com
2. Sign up FREE (no credit card needed)
3. Click: "New +" → "Web Service"
4. Connect GitHub: Authorize & select `webleanbot`
5. Configuration:
   ```
   Name:           webleanbot-robot-server
   Runtime:        Node
   Build command:  npm install
   Start command:  npx tsx server/robotNetworkServer.ts
   Instance type:  Free
   ```
6. Click: "Create Web Service"
7. Wait 2 minutes → Get your URL like:
   ```
   webleanbot-robot-server.onrender.com
   ```

---

### STEP 2B: Deploy on Fly.io (Alternative)

```bash
# 1. Install Fly CLI (one time)
npm install -g flyctl

# 2. Login to Fly
flyctl auth login

# 3. Deploy (from your project directory)
cd /Users/nguyenhoangtung08102003/SourceCode/webleanbot
flyctl launch
  # App name: webleanbot-robot-server
  # Choose region closest to you
  # Skip database

# 4. Deploy
flyctl deploy

# 5. Get your URL
flyctl info
# Look for: webleanbot-robot-server.fly.dev
```

---

### STEP 2C: Deploy on Railway (Alternative)

**No terminal commands needed - all in browser:**

1. Go to: https://railway.app
2. Sign up with GitHub
3. New project → Deploy from GitHub
4. Select: `webleanbot`
5. Service type: Node
6. Start command: `npx tsx server/robotNetworkServer.ts`
7. Railway auto-deploys
8. Get URL from dashboard

---

### STEP 3: Update WebSocket URL

**Option A: Edit in VS Code**
```bash
# 1. Open .env.production in VS Code
# 2. Change this line:
VITE_WEBSOCKET_URL=wss://webleanbot-robot-server.onrender.com
#                       ↑ REPLACE with your backend URL

# 3. Save file
```

**Option B: Edit in terminal**
```bash
# Go to your project
cd /Users/nguyenhoangtung08102003/SourceCode/webleanbot

# Replace EXAMPLE.onrender.com with YOUR actual backend URL
sed -i '' 's|EXAMPLE.onrender.com|your-actual-backend-url|g' .env.production

# Verify it changed correctly
cat .env.production | grep VITE_WEBSOCKET_URL
```

---

### STEP 4: Push to GitHub

```bash
# Go to project directory
cd /Users/nguyenhoangtung08102003/SourceCode/webleanbot

# Add the changed file
git add .env.production

# Commit with message
git commit -m "Update production WebSocket URL"

# Push to GitHub (GitHub Actions auto-redeploys!)
git push origin main
```

---

### STEP 5: Test Frontend Loads

```bash
# In your browser, open:
https://HoangTung108.github.io/webleanbot

# Wait for page to load
# Check browser console for any WebSocket errors (F12 → Console)
# Should NOT see "connection refused" errors
```

---

### STEP 6: Test Multi-Robot Sync

**In Browser 1:**
```
1. Open: https://HoangTung108.github.io/webleanbot
2. Click: "➕ Create Room"
3. Copy: Room ID (appears in dialog)
4. Keep this tab open
```

**In Browser 2 (or second tab):**
```
1. Open: https://HoangTung108.github.io/webleanbot
2. Click: "🔗 Join Room"
3. Paste: Room ID from Browser 1
4. Click: "Join"

Expected result:
✅ Both tabs show "Connected"
✅ Both show same Room ID
✅ If you move robot in one tab, 
   you should see movement in other tab
```

---

## 🔍 Verify Everything Works

### Check GitHub Actions Status
```bash
# Terminal command to check git status
cd /Users/nguyenhoangtung08102003/SourceCode/webleanbot
git log --oneline -3

# Then visit in browser:
https://github.com/HoangTung108/webleanbot/actions
```

### Check Backend is Running
```bash
# For Render: Just visit dashboard
# Should show green "Live" status

# For Fly.io:
flyctl logs -f

# For Railway:
# Just check dashboard Logs tab
```

### Check WebSocket Connection
```bash
# Open browser console (F12 → Console tab)
# Type:
localStorage.getItem('robotNetworkDebug')

# Should show connection info, not errors
```

---

## 🆘 If Something Goes Wrong

### GitHub Actions Failed
```bash
# 1. Check what failed
Visit: https://github.com/HoangTung108/webleanbot/actions

# 2. Click on red ❌ workflow
# 3. Scroll down to see error message
# 4. Common issues:
#    - npm install failed → check package.json syntax
#    - Build error → check TypeScript errors
```

### Backend Won't Deploy
```bash
# 1. Check service dashboard (Render/Fly/Railway)
# 2. Look at Logs section
# 3. Common issues:
#    - Wrong start command
#    - Missing npm install
#    - Port conflict (should use 8080)

# 4. Try redeploy:
Render: Click "Redeploy" button
Fly.io: flyctl deploy
Railway: Trigger redeploy in UI
```

### WebSocket Connection Failed
```bash
# 1. Open browser console (F12 → Console)
# 2. Look for error message with URL
# 3. Check if URL matches your backend
# 4. Try these fixes:

# Fix 1: Verify .env.production
cat .env.production | grep VITE_WEBSOCKET_URL

# Fix 2: Check backend is running
# Render: Dashboard → should show "Live"
# Fly.io: flyctl status
# Railway: Check dashboard Logs

# Fix 3: Hard refresh browser (Cmd+Shift+R on Mac)
```

---

## 📊 Expected Behavior

### After Frontend Deploy
- ✅ Page loads in ~2-3 seconds
- ✅ See Leanbot IDE interface
- ✅ No major JavaScript errors (F12 console)
- ✅ May see WebSocket warnings if backend not yet deployed

### After Backend Deploy
- ✅ Backend service shows "Live" or "Running"
- ✅ Logs show "Server running on port 8080"

### After WebSocket URL Update
- ✅ Browser console shows WebSocket connected
- ✅ No "connection refused" errors
- ✅ Create Room button works

### After Full Setup
- ✅ Two browser tabs can sync robots
- ✅ Room ID works
- ✅ Multi-robot rendering visible
- ✅ Robot movement syncs between tabs

---

## ⚡ Fastest Path to Live

**Recommended timeline: 20-30 minutes**

1. **2-3 min**: Wait for GitHub Actions
   - Check: https://github.com/HoangTung108/webleanbot/actions

2. **5-10 min**: Deploy backend on Render
   - Visit: https://render.com
   - Create new Web Service
   - Get backend URL

3. **1 min**: Update .env.production
   - Edit file, add backend URL
   - `git add .env.production && git commit -m "Update URL" && git push`

4. **2-3 min**: Wait for GitHub Actions redeploy

5. **2 min**: Test
   - Open frontend URL
   - Test multi-robot in 2 tabs

**Total: 20-30 minutes ✓**

---

## 🎯 Success Criteria

- [ ] GitHub Actions shows green ✅
- [ ] Frontend loads at GitHub Pages URL
- [ ] Backend running on Render/Fly/Railway
- [ ] .env.production updated and pushed
- [ ] Browser console shows WebSocket connected
- [ ] Can create room and get Room ID
- [ ] Can join room from different tab
- [ ] Robots sync between tabs
- [ ] Share URL with friends! 🎉

---

**You've got this! 🚀**

**Questions? Check:**
- [QUICK_DEPLOY.md](QUICK_DEPLOY.md) - Step-by-step guide
- [GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md) - Detailed options
- [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - Overview
