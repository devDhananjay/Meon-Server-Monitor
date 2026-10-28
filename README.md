# MEON Server Monitor — React Native CLI

Full conversion of the web Server Monitor dashboard into a **React Native CLI** app.

## Path
`~/Desktop/ServerMonitor-RN`

## Stack
- React Native `0.87.1` (CLI — `android/` + `ios/`)
- React Navigation (drawer + stack)
- AsyncStorage, SVG charts, Reanimated drawer

## Converted from web App.jsx
- Login / logout / theme
- Overview (health, charts, product grid, notifications)
- Product / Server / Service detail + timelines
- Mail acknowledgements
- Reverse proxy CRUD + sync
- Risk management checklist
- User access + alert recipients CRUD
- Product APIs test/add/toggle/delete
- Usage APIs save/sync/clear
- Security / change password
- Alert config modal

## Setup
```bash
cd ~/Desktop/ServerMonitor-RN

# 1) set API
# edit src/config.js → API_BASE

# 2) JS deps (already installed if generated)
npm install

# 3) iOS pods
cd ios && pod install && cd ..

# 4) run
npm start
npm run android
# or
npm run ios
```
