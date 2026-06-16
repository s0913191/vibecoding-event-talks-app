import os
from flask import Flask, jsonify, render_template, send_from_directory
import feedparser

app = Flask(__name__, static_folder='static', template_folder='templates')

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        # Parse the Atom feed using feedparser
        feed = feedparser.parse(FEED_URL)
        
        if feed.bozo:
            # feedparser bozo flag indicates XML parsing issues, but it can often still parse
            # Let's check if we actually got entries. If not, raise exception
            if not feed.entries:
                raise Exception("Failed to parse feed. XML structure may be invalid or unreachable.")

        entries = []
        for entry in feed.entries:
            # Extract content. Atom entries can have 'content' list or 'summary'
            content_val = ""
            if 'content' in entry and len(entry.content) > 0:
                content_val = entry.content[0].value
            elif 'summary' in entry:
                content_val = entry.summary
            
            entries.append({
                'id': entry.get('id', ''),
                'title': entry.get('title', ''),
                'updated': entry.get('updated', ''),
                'published': entry.get('published', entry.get('updated', '')),
                'link': entry.get('link', ''),
                'content': content_val
            })
            
        return jsonify({
            'success': True,
            'title': feed.feed.get('title', 'BigQuery Release Notes'),
            'updated': feed.feed.get('updated', ''),
            'entries': entries
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"Error fetching or parsing feed: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Run Flask on localhost:5000 in debug mode
    app.run(debug=True, host='127.0.0.1', port=5000)
