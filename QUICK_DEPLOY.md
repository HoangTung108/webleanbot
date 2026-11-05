# 🚀 FREE Deployment - Quick Start

## 📊 Your Current Setup

✅ **Frontend Deployment:** GitHub Pages (AUTOMATIC)
- 🔗 URL: https://HoangTung108.github.io/webleanbot
- ⏱️ Auto-deploys on every `git push main`
- 📝 Status: Check GitHub → Actions tab

✅ **Backend Options:** (Choose ONE)

| Service | Time | Link | Recommended |
|---------|------|------|-------------|
| **Render** | 5-10 min | https://render.com | ⭐ YES |
| **Fly.io** | 5-10 min | https://fly.io | ✓ Good |
| **Railway** | 5-10 min | https://railway.app | ✓ Good |

---

## 1️⃣ Check GitHub Actions Deployment

```bash
# GitHub will automatically build and deploy on your push
# Check: https://github.com/HoangTung108/webleanbot/actions

# Wait for green checkmark ✅ (takes 2-3 minutes)
```

After ~2 minutes:
- ✅ Frontend deployed to: https://HoangTung108.github.io/webleanbot
- ✅ Ready to use (but WebSocket backend not connected yet)

---

## 2️⃣ Deploy Backend (Choose ONE Option Below)

### 🎯 Option A: Render.com (RECOMMENDED)

**Fastest setup, no credit card needed**

```bash
1. Visit https://render.com → Sign up (free)

2. Click: "New +" → "Web Service"

3. Connect GitHub:
   - Authorize Render
   - Select: webleanbot repo
   - Branch: main

4. Configuration:
   Name:              webleanbot-robot-server
   Runtime:           Node
   Build command:     npm install
   Start command:     npx tsx server/robotNetworkServer.ts
   Instance type:     Free

5. Click "Create Web Service"
   ⏳ Wait ~2 minutes for deployment

6. Copy your URL:
   - Dashboard shows: webleanbot-robot-server.onrender.com
   - WebSocket URL: wss://webleanbot-robot-server.onrender.com
```

### 🎯 Option B: Fly.io

```bash
1. Install Fly CLI:
   npm install -g flyctl

2. Deploy:
   flyctl launch
   # App name: webleanbot-robot-server
   # Choose closest region

3. Deploy:
   flyctl deploy

4. Get URL:
   flyctl info
   # WebSocket URL: wss://webleanbot-robot-server.fly.dev
```

### 🎯 Option C: Railway

```bash
1. Visit https://railway.app → Sign up with GitHub

2. New project → Deploy from GitHub
   - Select: webleanbot
   - Service: Node
   - Start: npx tsx server/robotNetworkServer.ts

3. Railway auto-deploys
   ⏳ Wait for green status
```

---

## 3️⃣ Update Frontend Configuration

After backend deployment, update `.env.production`:

```bash
# Edit this file:
.env.production

# Change line:
VITE_WEBSOCKET_URL=wss://webleanbot-robot-server.onrender.com
                      ↑
                   YOUR BACKEND URL

# Save and push:
git add .env.production
git commit -m "Update production WebSocket URL"
git push origin main

# GitHub Actions auto-redeploys! ✅
```

---

## 4️⃣ Test Your Deployment

### Test 1: Frontend Loads
```bash
Open: https://HoangTung108.github.io/webleanbot

# Should see Leanbot IDE interface
```

### Test 2: Multi-Robot (Browser 1)
```bash
1. Open: https://HoangTung108.github.io/webleanbot
2. Click: "➕ Create Room"
3. Copy: Room ID
```

### Test 3: Multi-Robot (Browser 2)
```bash
1. Open: https://HoangTung108.github.io/webleanbot (new tab)
2. Click: "🔗 Join Room"
3. Paste: Room ID from Browser 1
4. Click: Join

✅ Both should now be connected and syncing robots!
```

---

## 🐛 Troubleshooting

### "Can't connect to WebSocket"
```bash
# Check browser console (F12 → Console)
# Error message will tell you what's wrong

Likely causes:
1. Backend not deployed yet (check Render/Fly/Railway dashboard)
2. Wrong WebSocket URL in .env.production
3. Backend URL is http:// instead of wss://
```

### GitHub Actions not starting
```bash
# Check: https://github.com/HoangTung108/webleanbot/actions

If red ❌:
1. Click on failed workflow
2. Scroll to error details
3. Most likely: missing Node dependencies
   → Check: npm install succeeded?
```

### Render shows "Crashed"
```bash
# Common causes:
1. Wrong start command (should be: npx tsx server/robotNetworkServer.ts)
2. Missing dependencies (npm install failed)
3. Port issue (using port 8080, which is standard)

Fix:
1. Check Render dashboard Logs
2. Deploy → Redeploy free tier
```

---

## 📊 Free Tier Limits

| Service | Limit | Cost |
|---------|-------|------|
| **Render** | 50 hrs/month, no auto-sleep | FREE |
| **Fly.io** | 3 CPUs, 100GB egress | FREE |
| **Railway** | $5 credit/month | FREE |
| **GitHub Pages** | Unlimited | FREE |

**Total Cost:** $0.00 ✅

---

## 🎯 Next Steps

1. ✅ Push to GitHub (DONE)
2. ⏳ Wait for GitHub Actions deployment (~2-3 min)
3. ⏳ Choose backend option (Render/Fly/Railway)
4. ⏳ Deploy backend (~5-10 min)
5. ✏️ Update .env.production with backend URL
6. ⏳ Push → GitHub Actions redeploys frontend
7. 🧪 Test multi-robot in browser
8. 🎉 LIVE!

---

## 💡 Pro Tips

### Check GitHub Actions Status
```bash
# In VS Code terminal:
git log --oneline -5
# Should show your deployment commit

# Visit: https://github.com/HoangTung108/webleanbot/actions
# Look for green ✅ on latest commit
```

### Monitor Backend
**Render:**
- Dashboard → Logs
- Shows real-time server output

**Fly.io:**
```bash
flyctl logs -f
```

**Railway:**
- Dashboard → Logs tab

### Custom Domain (Later)
```bash
GitHub Pages:
- Add CNAME file with your domain
- Configure DNS CNAME record

Backend:
- Render: Add custom domain in settings
- Fly: flyctl certs add your-domain.com
```

---

## 📞 Stuck?

1. Check deployment guide: [GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md)
2. Check Actions tab for build errors
3. Check backend service logs (Render/Fly/Railway)
4. Check browser console (F12 → Console tab)

---

**Your setup is ready! 🚀 Follow steps 1-4 above to go live!**

Total time: **20-30 minutes to LIVE deployment**
