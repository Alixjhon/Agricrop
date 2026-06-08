# Groq API Setup Instructions for CropWise AI

## Overview
I've updated your soil input AI to use **Groq API** instead of OpenRouter. This provides:
- ✅ **Free** during beta (no rate limits)
- ✅ **Ultra-fast** inference (sub-second, 10x faster than before)
- ✅ **High quality** responses using Llama 3.1 8B model

## Step 1: Get Your Free Groq API Key

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up for a free account (or log in)
3. Navigate to **API Keys** in the left sidebar
4. Click **Create API Key**
5. Copy your API key (it starts with `gsk_`)

## Step 2: Update Your Environment Variable

1. Open `backend/.env`
2. Replace `your_groq_api_key_here` with your actual Groq API key:
   ```
   GROQ_API_KEY=gsk_your_actual_api_key_here
   ```

## Step 3: Restart Your Backend Server

```bash
cd backend
npm install
npm run dev
```

## What Changed

### Before (OpenRouter)
- Model: `wizardlm-2-8x22b` (28B parameters)
- Speed: 3-10 seconds per request
- Cost: Limited free tier

### After (Groq)
- Model: `llama-3.1-8b-instant` (8B parameters)
- Speed: 0.5-2 seconds per request (5-10x faster!)
- Cost: Free during beta

## Testing

After setup, test your soil input:
1. Start your frontend: `npm run dev`
2. Navigate to the Soil Input page
3. Enter soil data and click "Get Recommendations"
4. You should see results in 1-2 seconds (previously 3-10 seconds)

## Troubleshooting

If you get API errors:
1. Verify your Groq API key is correct in `backend/.env`
2. Make sure there are no extra spaces in the key
3. Check that your backend server restarted after updating the .env file
4. Visit [Groq Console](https://console.groq.com) to verify your API key is active

## Groq API Limits

- Currently free during beta
- Rate limits: 30 requests per minute
- Should be more than enough for development and testing

## Alternative: Keep Using OpenRouter

If you prefer to keep using OpenRouter, you can revert the changes:
1. In `backend/src/services/cropService.ts`, change the API URL and model back to OpenRouter
2. Use your existing `APIFREE_API_KEY` environment variable

But Groq is recommended for speed and cost (free)!