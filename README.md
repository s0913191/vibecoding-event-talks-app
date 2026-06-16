# BigQuery Release Pulse

A premium, modern web application built with Python Flask, Vanilla HTML, Javascript, and CSS that tracks, parses, and shares the latest Google BigQuery Release Notes.

## Features

- **Live RSS/Atom Parsing**: Fetches the official Google Cloud BigQuery Release Notes feed directly from the backend, bypassing CORS limitations.
- **Rich Interactive Design**: Deep space / Google Cloud theme with glassmorphism, responsive grid layouts, animations, and modern typography (`Outfit`).
- **Interactive Specific-Update Tweeting**: 
  - Every update card lists the changes.
  - Hovering over **any specific bullet point or paragraph** reveals a "Tweet This" button, allowing users to tweet *only* that specific update.
  - Users can also choose to tweet the *entire* release card update.
- **Tweet Composer & Customizer Modal**:
  - Dynamically formats tweets based on 3 distinct templates: **Standard**, **Exciting**, or **Developer-focused**.
  - Visual character counter with active limit enforcement (280 characters).
  - Open Draft Web Intent directly on X/Twitter.
  - Copy draft to clipboard option.
  - **Simulated "Pulse Tweets" Log**: An internal feed in the sidebar where tweets are "sent" and logged for interactive completeness.
- **Comprehensive Filters**: Filter updates by category (Features, Changes, Fixes, Deprecations), search keywords, or specific date ranges.
- **Stats Dashboard**: Active counter for total notes and feature additions.
- **Visual Feedback**: Shimmer skeleton screen loaders and interactive toast notifications.

## Tech Stack

- **Backend**: Python 3.11, Flask, feedparser
- **Frontend**: HTML5, Vanilla CSS3 (custom CSS variables, grid, flexbox), Vanilla JavaScript (ES6)
- **Icons**: Lucide Icons

## Getting Started

### Prerequisites

Ensure you have Python 3.11+ installed.

### Setup and Run

1. Navigate to the project directory:
   ```bash
   cd C:\Users\s0913\agy-cli-projects\bq-releases-notes
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Open your browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

## Project Structure

- `app.py` - Flask backend handles XML feed fetching & JSON parsing.
- `templates/index.html` - Premium UI frame, filters, and modal setup.
- `static/css/style.css` - Custom styling theme, glassmorphism, skeletons, and layouts.
- `static/js/app.js` - Client-side state manager, DOM interactions, tweet generation, and offline fallbacks.
