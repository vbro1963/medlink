
This project includes an Express server, REST API, and WebSocket signaling for calls. Deploy it as a web service rather than a static site. Render is one option for a free demo deployment.

## 1. Push the project to GitHub

Create a GitHub repository and push this project to it. Make sure secrets such as `.env.local` are not committed.

## 2. Create a Render web service

1. Sign in to [Render](https://render.com/).
2. Select **New → Web Service** and connect your GitHub repository.
3. Configure the service:

   - **Runtime:** Node
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Instance type:** Free

4. Add the environment variables below in the service's **Environment** settings.
5. Select **Deploy Web Service**. When the deploy completes, open the `onrender.com` URL shown on the service page.

## 3. Set environment variables

Add these in Render's **Environment** settings. Do not commit the values to GitHub.

| Variable | Required | Value |
| --- | --- | --- |
| `GEMINI_API_KEY` | For Gemini features | Your API key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `JWT_SECRET` | Yes | A long, randomly generated secret used to sign login tokens |
| `GOOGLE_MAPS_API_KEY` | Optional | Google Maps key used by server-side map features |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Google Maps key exposed to the browser for the map UI |

The map keys are optional if you do not need the map features. Browser-exposed API keys are visible to visitors, so restrict the key in Google Cloud Console to the required APIs and your deployed site domain.

## Free-tier limitations

- Render free web services can spin down after 15 minutes without inbound traffic. The first visit after inactivity may take about a minute while the service starts.
- This app currently saves accounts and appointments in a local JSON file under `data/`. Render's free service has an ephemeral filesystem, so this data can be lost when the service restarts, spins down, or redeploys. Use persistent database storage before relying on the app to retain data.
- Do not use this demo deployment for real patient information. Add appropriate security, privacy, and persistent storage measures before handling sensitive health data.

See Render's current [free service limits](https://render.com/docs/free) and [web service documentation](https://render.com/docs/web-services) for details.
