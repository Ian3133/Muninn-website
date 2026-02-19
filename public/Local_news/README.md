# Local News Directory

This directory contains state-specific news JSON files.

## File Naming Convention

Each state should have its own JSON file named with the two-letter state abbreviation in uppercase:
- `CT-news.json` for Connecticut
- `NY-news.json` for New York
- `CA-news.json` for California
- etc.

## JSON File Format

Each state news file should follow this format:

```json
{
  "state": "CT",
  "stateName": "Connecticut",
  "lastUpdated": "2026-02-19",
  "clusters": [
    {
      "title": "News Story Title",
      "summary": "Brief summary of the news story...",
      "image": {
        "url": "https://example.com/image.jpg",
        "thumbnail_url": "https://example.com/thumbnail.jpg",
        "title": "Image title"
      }
    }
  ]
}
```

## Adding New States

To add news for a new state:
1. Create a new file named `[STATE_CODE]-news.json` (e.g., `CT-news.json`)
2. Follow the JSON format above
3. The app will automatically detect and load the file when users select that state
