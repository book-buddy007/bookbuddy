# Book Buddy by VPD — Mobile (Expo / React Native)

Native iOS + Android app for Book Buddy by VPD. Talks to the **same NestJS backend and
MySQL database** as the web app, over the REST API — no WebView.

## Quick start

```bash
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_BASE_URL for your setup
npm start                   # then press i / a, or scan the QR with Expo Go
```

- **iOS simulator** → `http://localhost:3333`
- **Android emulator** → `http://10.0.2.2:3333`
- **Physical device** → `http://<your-LAN-IP>:3333`

Make sure the backend is running (`cd ../backend && npm run start:dev`).

## Scripts

| Command | Description |
|---|---|
| `npm start` | Expo dev server |
| `npm run ios` / `npm run android` | Launch on a simulator/emulator |
| `npm run typecheck` | `tsc --noEmit` |

## Architecture & roadmap

See [`../MOBILE_APP_GUIDE.md`](../MOBILE_APP_GUIDE.md) for the shared-database
architecture, auth flow, and the path to shipping on the App Store / Play Store.
