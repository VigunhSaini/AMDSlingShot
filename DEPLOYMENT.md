# Deployment Guide for AMDSlingShot

## Problem Fixed
The frontend was unable to communicate with the backend because it was using relative URLs (`/api/analyze`) which worked in development but not in production on Vercel.

## Changes Made

### Frontend Changes
1. **Updated [frontend/src/services/api.js](frontend/src/services/api.js)**
   - Added environment variable support for backend URL
   - Uses `VITE_API_URL` environment variable in production
   - Falls back to relative URL in development (works with Vite proxy)

2. **Created [frontend/.env.example](frontend/.env.example)**
   - Template for environment variables

3. **Created [frontend/.env.production](frontend/.env.production)**
   - Contains your production backend URL
   - This file should be committed to git

4. **Updated [frontend/.gitignore](frontend/.gitignore)**
   - Ignores `.env` (local development secrets)
   - Allows `.env.example` and `.env.production` to be committed

### Backend Changes
1. **Created [Backend/requirements.txt](Backend/requirements.txt)**
   - Lists all Python dependencies needed for deployment
   
2. **Created [Backend/vercel.json](Backend/vercel.json)**
   - Configures Vercel to run the Flask app as a serverless function

3. **Updated [Backend/app.py](Backend/app.py)**
   - Exports `app` instance for Vercel to use
   - Still works for local development

## Deployment Steps

### Backend Deployment (Vercel)
1. Go to https://vercel.com/dashboard
2. Create a new project or update existing backend project
3. Make sure the root directory is set to `Backend`
4. Add environment variables in Vercel dashboard:
   - `GROQ_API_KEY` - Your Groq API key
   - `GITHUB_TOKEN` - Your GitHub personal access token (if needed)
5. Deploy the backend
6. Note the deployment URL (e.g., `https://your-backend.vercel.app`)

### Frontend Deployment (Vercel)
1. Update [frontend/.env.production](frontend/.env.production) with your backend URL:
   ```
   VITE_API_URL=https://your-backend-url.vercel.app
   ```
2. Commit and push changes:
   ```bash
   git add .
   git commit -m "Fix API URL for production"
   git push
   ```
3. Vercel will automatically redeploy the frontend

## Testing
1. First, test the backend health check:
   - Visit: https://amdslingshot-backend-pwczc0i0f-mergeagent63-8385s-projects.vercel.app/
   - You should see: `{"status": "ok", "service": "AMDSlingShot Backend API", "version": "1.0"}`
2. Visit your frontend URL: https://amdslingshot-frontend.vercel.app/
3. Try analyzing a PR
4. The frontend should now successfully call the backend

## Environment Variables

### Frontend
- `VITE_API_URL` - Backend API URL (set in .env.production)

### Backend
- `GROQ_API_KEY` - Your Groq API key (set in Vercel dashboard)
- `GITHUB_TOKEN` - GitHub token for API access (set in Vercel dashboard if needed)

## Troubleshooting

### Backend Not Responding / 404 Error
- Make sure the backend URL in `.env.production` is correct
- Test the health check endpoint: `https://your-backend.vercel.app/`
- Verify the backend is deployed and accessible
- Check Vercel logs for both frontend and backend

### CORS Error (Access-Control-Allow-Origin)
- Backend has CORS configured to allow:
  - `https://amdslingshot-frontend.vercel.app`
  - `https://*.vercel.app` (all Vercel preview deployments)
  - `http://localhost:5173` (local development)
- If you change the frontend domain, update `app.py` CORS origins list
- Redeploy backend after CORS changes
- Clear browser cache and try again

### CORS Error
- Backend already has CORS enabled via `flask-cors`
- Make sure CORS is not blocking requests

### Import Errors
- Ensure all dependencies in `requirements.txt` are installed
- Check Vercel build logs

### ML Model Training
- The model trains on first request (lazy initialization)
- First request may take longer (20-30 seconds)
- Subsequent requests will be faster

## Local Development
Development setup remains unchanged:
```bash
# Backend
cd Backend
python app.py

# Frontend
cd frontend
npm run dev
```
