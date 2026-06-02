# VIDYA STEM – Inventory Audit System
**Version 3.0.0** · Phone-first PWA · Swipe-to-audit

---

## 📁 Project Structure

```
vidya-inventory/
├── index.html              ← App shell (all views)
├── sw.js                   ← Service Worker (PWA offline)
├── manifest.json           ← PWA manifest
│
├── css/
│   └── style.css           ← All styles (dark, mobile-first)
│
├── js/
│   ├── config.js           ← App config & Telegram settings
│   ├── auth.js             ← Secure login (SHA-256 + lockout)
│   ├── data.js             ← Item resolution & audit storage
│   ├── ui.js               ← Toast, loading, badges
│   ├── telegram.js         ← Compact Telegram push
│   ├── export.js           ← PNG & CSV export
│   ├── swipe.js            ← Swipe card engine
│   └── app.js              ← Main controller & routing
│
└── data/
    ├── users.json          ← User accounts (hashed passwords)
    ├── lab1items.json      ← Electronics / STEM items
    ├── lab2items.json      ← Fabrication / advanced items
    ├── lab3items.json      ← Computing / tools
    └── images/
        └── lab/            ← Item images (jpg/png)
```

---

## 👤 Default Accounts

| Username  | Password    | Role     | Access |
|-----------|-------------|----------|--------|
| admin     | admin@123   | Admin    | All schools, all audits |
| subadmin  | sub@123     | SubAdmin | All schools, all audits |
| dvs       | 72C8E609    | School   | DVS School labs only |
| dbs       | DBS@2024    | School   | DBS School labs only |

> **To add a user:** Generate SHA-256 of their password, add entry to `data/users.json`.  
> SHA-256 tool: https://emn178.github.io/online-tools/sha256.html

---

## 🔐 Security Features
- SHA-256 password hashing via `window.crypto.subtle` (no plaintext storage)
- Session tokens stored in `sessionStorage` (cleared on tab close)
- 5-attempt brute-force lockout (5-minute cooldown)
- Session timeout: 60 minutes

---

## 📲 Swipe Gestures

| Direction | Action |
|-----------|--------|
| → Right   | ✅ Well Present |
| ← Left    | 🟡 Broken |
| ↑ Up      | 🔴 Missing |
| ↓ Down    | ↩ Undo last |

---

## 📦 Item Files

Add items to the 3 master files:
- `lab1items.json` – Electronics, STEM basics
- `lab2items.json` – Fabrication, advanced equipment
- `lab3items.json` – Computing, tools

Each item format:
```json
{
  "code": "STEM-001",
  "name": "Item Name",
  "img": "./data/images/lab/filename.jpg",
  "category": "Category",
  "domain": "STEM",
  "price": 1000,
  "quantity": 5,
  "description": "Short description."
}
```

Assign item codes to users in `data/users.json` under each lab's `items` array.

---

## 📤 Telegram Setup

1. Create a bot via @BotFather → get `botToken`
2. Get your group/channel `chatId`
3. Edit `js/config.js`:
   ```js
   telegram: {
     botToken: 'YOUR_TOKEN',
     chatId:   'YOUR_CHAT_ID',
     enabled:  true
   }
   ```

Audit reports sent as compact messages (≈ 200 chars) — no full item names, just codes + summary.

---

## 🚀 Deployment

**Local:** Open `index.html` in a browser (use a local server for JSON loading):
```bash
npx serve .
# or
python3 -m http.server 8080
```

**Production:** Upload all files to any static host (Netlify, GitHub Pages, Vercel).  
HTTPS is required for PWA install and `crypto.subtle`.

---

## 📱 Install as App (PWA)

- **Android Chrome:** Menu → "Add to Home Screen"
- **iOS Safari:** Share → "Add to Home Screen"

Works offline after first load (Service Worker caches all assets).

---

## 📊 Export Formats

- **PNG:** Renders an audit summary card (requires `html2canvas` for best results, falls back to print dialog)
- **CSV:** Full audit data with metadata, importable into Excel / Google Sheets

---

## 🗂 Adding a New School

1. Add user entry to `data/users.json` with labs and item codes
2. Create school image folder under `data/images/lab/` if needed
3. No server restart needed — JSON is loaded on demand

---

*VIDYA STEM Inventory System · Built for Tinkering Labs*
