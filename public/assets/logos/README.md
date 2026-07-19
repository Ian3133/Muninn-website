# News Outlet Logos

This folder contains local logos for news outlets that appear in the digest.

## Required Logo Files

The Top Stories panel currently maps these files in `public/story.html`:

- US/discovery: `google-news`, `ap`, `npr`, `new-york-times`, `nbc-news`,
  `abc-news`, `cbs-news`, `politico`, `cnn`, `fox-news`, `pbs-news`,
  `newsnation`, and `time`.
- International: `bbc`, `al-jazeera`, `the-guardian`, `sky-news`,
  `france-24`, `dw`, `cbc-news`, `channel-newsasia`, `sbs-news`,
  `africanews`, `the-hindu`, `japan-times`, `rte-news`, and `euronews`.

All files are PNG. Transparent backgrounds are preferred; square official-site
brand icons are displayed with `object-fit: contain` inside the existing 80x50
source-logo frame.

### Logo Files Needed:

1. **ap.png** - AP News
2. **cbs-news.png** - CBS News
3. **fox-news-latest.png** - Fox News (Latest)
4. **fox-news-politics.png** - Fox News (Politics)
5. **los-angeles-times.png** - Los Angeles Times
6. **new-york-times-home.png** - New York Times (Home)
7. **new-york-times-politics.png** - New York Times (Politics)
8. **politico.png** - Politico
9. **reuters.png** - Reuters
10. **roll-call.png** - Roll Call
11. **the-hill.png** - The Hill
12. **upi.png** - UPI
13. **usa-today.png** - USA Today
14. **vox.png** - Vox

## Notes:

- If a logo file is missing, it will be automatically hidden (no broken image icon will show)
- Logo dimensions: 80px width × 50px height (can be smaller, will scale to fit)
- Format: PNG with transparent background recommended
- Logos are displayed with white background padding in the UI

## Where to Find Logos

Prefer the outlet's official site icon or press/brand kit. The July 2026 panel
fill used official-site identities retrieved as local assets, so the story page
does not depend on a third-party logo service at runtime.
