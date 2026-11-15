# Deploying MedLink Telehealth to Cloud & Google Play Store

## Part 1: Deploy Backend API + WebSocket Signaling to Cloud (Google Cloud Run)
1. Install Google Cloud CLI (`gcloud`) and authenticate:
   `gcloud auth login && gcloud config set project YOUR_GCP_PROJECT_ID`
2. Enable Cloud Run & Artifact Registry:
   `gcloud services enable run.googleapis.com cloudbuild.googleapis.com`
3. Deploy directly from source using the included `Dockerfile`:
   `gcloud run deploy medlink-api --source . --region us-central1 --allow-unauthenticated --port 8080 --session-affinity --timeout 3600 --set-env-vars JWT_SECRET=replace-with-strong-random-secret`
   - Note: `--session-affinity` and `--timeout 3600` keep WebSocket (`/ws`) connections open for long video consultations.
4. For production database & payments:
   - Connect **Cloud SQL (PostgreSQL)** or **MongoDB Atlas** instead of local JSON storage so container restarts preserve records.
   - Add a **TURN server** (e.g. Metered TURN or coturn) alongside STUN so WebRTC video calls succeed across strict 4G/5G carrier NATs.
   - Connect **Stripe** (`@stripe/stripe-react-native` + Stripe PaymentIntent webhook) for live card/UPI settlement.

## Part 2: Build & Publish React Native App to Google Play Store
1. Install Expo & EAS CLI:
   `npm install -g eas-cli`
   `eas login`
2. Configure EAS inside `react-native-app`:
   `eas build:configure`
3. Update `react-native-app/app.json` and `eas.json` with your deployed Cloud Run URL (`https://medlink-api-....a.run.app` and `wss://.../ws`).
4. Test on a physical Android device first with an internal APK:
   `eas build --platform android --profile preview`
5. Generate the Play Store production Android App Bundle (`.aab`):
   `eas build --platform android --profile production`
6. Google Play Console Setup:
   - Create a Google Play Developer account ($25 one-time fee) at `play.google.com/console`.
   - Create App -> Select **Health & Fitness / Medical**, declare **Camera** & **Microphone** permissions (for telehealth video calls) and complete the **Data Safety** + **Health Apps** declaration.
   - Upload the `.aab` to **Internal Testing** (or run `eas submit --platform android --latest` using a Google Play Service Account JSON key), verify with testers, then promote to **Production**.
