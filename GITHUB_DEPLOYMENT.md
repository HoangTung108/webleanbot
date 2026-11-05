# 🚀 Leanbot Multi-Robot - GitHub Deployment Guide

## ✅ Frontend Deployment (GitHub Pages) - AUTOMATIC ✓

GitHub Actions automatically deploys to GitHub Pages when you push to `main`:

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add multi-robot system"
   git push origin main
   ```

2. **GitHub Actions automatically:**
   - Builds your project
   - Deploys to GitHub Pages
   - Available at: `https://HoangTung108.github.io/webleanbot`

3. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Select "Deploy from a branch"
   - Choose `gh-pages` branch
   - Save

**Status:** You can check deployment here:
- GitHub → Actions tab
- View deployment: Settings → Pages

---

## 📡 Backend Deployment (WebSocket Server) - FREE OPTIONS

### Option 1: **Render.com** (RECOMMENDED - FREE)

**Advantages:**
- ✅ Free tier (no credit card needed after signup)
- ✅ Persistent server (no auto-sleep)
- ✅ Easy 1-click deployment
- ✅ Custom domain support

**Steps:**

1. **Create Render account:**
   - Visit https://render.com
   - Sign up (free)

2. **Create new service:**
   - Click "New +" → Select "Web Service"
   - Connect GitHub: Authorize Render
   - Select repository: `webleanbot`
   - Branch: `main`

3. **Configuration:**
   - **Name:** `webleanbot-robot-server`
   - **Runtime:** `Node`
   - **Build command:** `npm install`
   - **Start command:** `npx tsx server/robotNetworkServer.ts`
   - **Instance type:** Free
   - **Environment variables:** (none needed)

4. **Deploy:**
   - Click "Create Web Service"
   - Wait ~2 minutes for deployment
   - Your server URL: `https://webleanbot-robot-server.onrender.com`
   - **WebSocket URL:** `wss://webleanbot-robot-server.onrender.com`

5. **Update frontend:**
   - Create `.env.production`:
     ```bash
     VITE_WEBSOCKET_URL=wss://webleanbot-robot-server.onrender.com
     ```
   - Push to GitHub
   - GitHub Pages auto-redeploys with new URL

---

### Option 2: **Fly.io** (FREE)

**Advantages:**
- ✅ Free tier (3 shared CPUs)
- ✅ Global deployment
- ✅ Very fast

**Steps:**

1. **Install Fly CLI:**
   ```bash
   npm install -g flyctl
   ```

2. **Launch app:**
   ```bash
   flyctl launch
   ```
   - App name: `webleanbot-robot-server`
   - Region: Choose closest to you
   - Skip database

3. **Configure Procfile:**
   ```
   web: npx tsx server/robotNetworkServer.ts
   ```

4. **Deploy:**
   ```bash
   flyctl deploy
   ```

5. **Get URL:**
   ```bash
   flyctl info
   ```
   - WebSocket URL: `wss://webleanbot-robot-server.fly.dev`

6. **Update frontend:**
   - Create `.env.production`:
     ```bash
     VITE_WEBSOCKET_URL=wss://webleanbot-robot-server.fly.dev
     ```

---

### Option 3: **Railway.app** (FREE)

**Advantages:**
- ✅ Free tier ($5/month credit)
- ✅ Simple GitHub integration

**Steps:**

1. **Create Railway account:**
   - Visit https://railway.app
   - Sign up with GitHub

2. **New project:**
   - Click "Create" → "Deploy from GitHub repo"
   - Select `webleanbot`

3. **Configuration:**
   - Service: Node
   - Start command: `npx tsx server/robotNetworkServer.ts`

4. **Deploy and get URL:**
   - Railway auto-generates domain
   - WebSocket URL will be shown in dashboard

---

## 🔧 Configuration Steps

### Step 1: Update Frontend for Production

Create `.env.production` in project root:
```bash
VITE_WEBSOCKET_URL=wss://your-server.onrender.com
```

Replace with your actual backend URL.

### Step 2: Update robotNetworkManager.ts

The code now automatically:
- ✅ Reads `VITE_WEBSOCKET_URL` from environment
- ✅ Falls back to auto-detection for localhost
- ✅ Uses `wss://` for HTTPS connections

No code changes needed!

### Step 3: Push to GitHub

```bash
git add .env.production .github/workflows/deploy.yml
git commit -m "Add GitHub Pages + production WebSocket config"
git push origin main
```

### Step 4: Monitor Deployment

**GitHub Pages:**
- Go to https://github.com/HoangTung108/webleanbot/actions
- Watch deployment progress
- Check https://HoangTung108.github.io/webleanbot

**Backend Server:**
- Render: https://dashboard.render.com
- Fly.io: `flyctl logs`
- Railway: https://railway.app/dashboard

---

## 🧪 Test Deployment

### Test 1: Frontend
```bash
# Visit GitHub Pages URL
https://HoangTung108.github.io/webleanbot

# Should load Leanbot IDE
```

### Test 2: Backend
```bash
# Check server is running
curl https://your-server.onrender.com

# Should show WebSocket server response
```

### Test 3: Multi-Robot Sync

**Browser 1:**
- Open https://HoangTung108.github.io/webleanbot
- Click "➕ Create Room"
- Copy Room ID

**Browser 2:**
- Open same URL in new tab
- Click "🔗 Join Room"
- Paste Room ID
- Click Join
- Both tabs should sync robots ✓

---

## ⚠️ Important Notes

### Free Tier Limitations

**Render.com:**
- ✅ No auto-sleep on free tier
- ✅ Unlimited connections
- ⚠️ 50 hours/month execution
- Upgrade when needed

**Fly.io:**
- ✅ Free tier includes 3 shared CPUs
- ⚠️ 100GB egress/month limit
- Upgrade when needed

**Railway:**
- ✅ $5/month credit
- ⚠️ After credit used, auto-hibernates
- Need paid plan for 24/7

### Production Checklist

- [ ] Frontend deployed to GitHub Pages
- [ ] Backend deployed to Render/Fly/Railway
- [ ] `.env.production` with correct WebSocket URL
- [ ] Both URLs support HTTPS/WSS
- [ ] Multi-robot sync tested in production
- [ ] GitHub Actions deployment working

---

## 📊 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| GitHub Pages | FREE | Unlimited |
| Render | FREE | No auto-sleep, 50 hrs/month |
| Fly.io | FREE | $5 credit, 100GB egress/month |
| Railway | FREE | $5 credit/month |
| **Total** | **FREE** | **No credit card required** |

---

## 🔄 Continuous Deployment

Every time you push to `main`:

1. ✅ GitHub Actions builds frontend
2. ✅ Deploys to GitHub Pages (~2 min)
3. ✅ Backend auto-redeploys (if using git-based service)

**Status:** Check GitHub Actions tab for details

---

## 🐛 Troubleshooting

### "Connection failed" error
- ✅ Check backend URL in browser console
- ✅ Verify backend service is running
- ✅ Check VITE_WEBSOCKET_URL environment variable
- ✅ Verify CORS/WSS is enabled

### Frontend loads but can't create room
- ✅ Open DevTools (F12)
- ✅ Check Console for WebSocket errors
- ✅ Verify backend URL matches config

### "Too many requests" on free tier
- ✅ Render/Fly/Railway rate limiting kicked in
- ✅ Upgrade to paid tier
- ✅ Or use multiple backend instances

---

## 📚 Next Steps

1. **Choose backend:** Render (recommended), Fly.io, or Railway
2. **Deploy backend:** Follow option above
3. **Update `.env.production`** with WebSocket URL
4. **Push to GitHub** → auto-deploy frontend
5. **Test:** Open 2 browser tabs, create/join room
6. **Share:** Your GitHub Pages URL with friends!

---

## 💡 Pro Tips

### Use Custom Domain
- GitHub Pages: Add `CNAME` file
- Render/Fly: DNS configuration in dashboard

### Monitor Performance
- GitHub: Actions logs
- Render: Dashboard metrics
- Fly: `flyctl logs -f` (live logs)

### Debug Production
```bash
# Check frontend console
https://HoangTung108.github.io/webleanbot → F12 → Console

# Check backend logs
Render: Dashboard → Logs
Fly: flyctl logs -f
Railway: Logs in dashboard
```

---

**Happy deployment! 🚀**

Your multi-robot Leanbot IDE is now live on the internet!
