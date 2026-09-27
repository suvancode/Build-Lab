<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:00FF99,100:0066FF&height=200&section=header&text=Build%20Lab%20v2.0&fontSize=42&fontColor=ffffff&animation=fadeIn&fontAlignY=35" />
</p>

<p align="center">
  <b>A next-generation developer dashboard to track, monitor, manage & test live projects in real time</b>
</p>

<p align="center">
  <a href="https://build-lab-kappa.vercel.app">🌐 Live Demo</a> •
  <a href="https://github.com/adityasing9">👨‍💻 Author</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0.0-success?style=flat-square" />
  <img src="https://img.shields.io/badge/Frontend-Modular%20HTML5%20%2F%20CSS3%20%2F%20ES6-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/Backend-Vercel%20Serverless-black?style=flat-square&logo=vercel" />
  <img src="https://img.shields.io/badge/Database-MongoDB%20Atlas-green?style=flat-square&logo=mongodb" />
  <img src="https://img.shields.io/badge/Auth-JWT%20%2B%20Bcrypt-blue?style=flat-square" />
</p>

---

## 🚀 Overview

**Build Lab 2.0** is an upgraded, high-performance developer dashboard and portfolio hub. It automatically discovers your GitHub repositories and live deployments (Vercel, Render, Streamlit, GitHub Pages) and merges them with custom projects stored permanently in MongoDB.

### 🌟 What's New in v2.0
- 🎨 **5 Developer Themes**: Matrix Green, Cyberpunk Neon, Midnight Obsidian, Dracula Hacker, and Retro Amber CRT (persisted in `localStorage`).
- 📱 **Multi-Device Viewport Simulator**: Preview any site inside Desktop, Tablet (768px), or Mobile iPhone (375px) frames with screen rotation and frame refresh.
- ⚡ **Real-Time Health & Latency Checker**: Live background pings measuring actual HTTP response status (200, 301, 404) and latency (in ms).
- 🛡 **Smart Iframe Inspection**: Automatically inspects `X-Frame-Options` and `Content-Security-Policy` headers before rendering to gracefully toggle between interactive iframes and screenshot previews.
- 📱 **Instant QR Code Generator**: Generate crisp vector QR codes for any project to scan and test immediately on a phone.
- 💾 **Persistent GitHub Overrides**: Customize repository display titles, override live demo URLs, attach custom tags, and pin or hide repos permanently in MongoDB.
- 🖼 **Canvas-Powered Screenshot Compressor**: Auto-scales and compresses uploaded screenshots to WebP/JPEG (~40KB) directly in browser before upload, avoiding database bloat.
- 🏷 **Dynamic Tag & Tech Stack Ribbon**: Filter instantly across tags (AI, React, Python, Three.js, Node, PWA, etc.).
- 📦 **Data Backup & Restore**: Export and import full dashboard configurations as JSON.
- 🔒 **Security Hardened**: Current password verification required for password updates, safe CORS, and strict headers.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Modular ES6 JavaScript, Custom CSS Variables, HTML5, Canvas API |
| **Backend** | Vercel Serverless Functions (Node.js 20+) |
| **Database** | MongoDB Atlas (Mongoose ODM with connection caching) |
| **Authentication** | JWT (JSON Web Tokens) & Bcrypt password hashing |
| **Preview Engine** | Multi-device responsive iframe simulator & Microlink fallback |

---

## 📂 Project Structure

```text
build-lab/
├── index.html                 # Semantic dashboard shell & modals
├── vercel.json                # Rewrites, routing & security headers
├── package.json               # Dependencies & validation scripts
├── .env.example               # Documented environment template
├── css/
│   ├── theme.css              # 5 Developer theme definitions & CRT scanline
│   ├── style.css              # Cards, header, toolbar, modals & animations
│   └── responsive.css         # Mobile and tablet viewport breakpoints
├── js/
│   ├── api.js                 # API client with token & error handling
│   ├── state.js               # Central store, overrides merger & filter logic
│   ├── qr.js                  # Vector QR code generator for phone testing
│   ├── health.js              # Real-time HTTP health & latency checker
│   ├── admin.js               # Admin modals, auth, image compressor & CRUD
│   ├── ui.js                  # Viewport simulator, card rendering & toasts
│   └── app.js                 # App bootstrap, keyboard shortcuts & events
└── api/
    ├── _lib.js                # Database connection pool & schemas
    ├── auth.js                # Admin login & JWT generation
    ├── auth/
    │   └── change-password.js # Password change with current-password verification
    ├── sites.js               # Custom sites CRUD
    ├── sites/
    │   └── [id].js            # Site update, delete & single retrieval
    ├── overrides.js           # GitHub repo customization persistence
    ├── ping-site.js           # Latency check & iframe header inspection
    ├── export.js              # JSON backup export & restore
    └── ping.js                # System & database health diagnostics
```

---

## ⚙️ Configuration & Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | Strong secret string for signing JWT tokens |
| `ADMIN_PASSWORD` | **Yes** | Initial password for the administrator account |
| `GITHUB_USERNAME` | Optional | GitHub user to discover repos for (default: `adityasing9`) |

---

## 💻 Local Development

1. **Clone and Install:**
   ```bash
   git clone https://github.com/adityasing9/build-lab.git
   cd build-lab
   npm install
   ```

2. **Verify API Modules:**
   ```bash
   npm test
   ```

3. **Run with Vercel CLI (recommended for serverless functions):**
   ```bash
   npm i -g vercel
   vercel dev
   ```
   Dashboard runs at: `http://localhost:3000`

---

## 🔐 Admin Controls

Click **[Admin Login]** in the header and enter your password.

Once authenticated, you can:
- **Add New Projects**: Add external web apps, APIs, or tools.
- **Customize GitHub Repos**: Override titles, live deployment URLs, tags, and pin or hide repositories.
- **Pin Favorites**: Click `[★]` on any project card to pin it to the top.
- **Upload Screenshots**: Drag and drop screenshots; automatically compressed in-browser before upload.
- **Backup & Restore**: Export full configuration to JSON or restore from file.
- **Change Password**: Safely update your password by verifying the current password.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` or `Ctrl + K` | Focus search bar |
| `Esc` | Close any active modal / simulator |
| `[CRT]` | Toggle retro CRT scanlines |

---

## 👨‍💻 Author

**Aditya Singh**  
GitHub: [@adityasing9](https://github.com/adityasing9)  
Live Site: [build-lab-kappa.vercel.app](https://build-lab-kappa.vercel.app)