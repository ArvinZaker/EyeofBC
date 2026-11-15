# Eyes of BC

A static website with plain HTML, one CSS file and vanilla JavaScript. There is no build step.

## GitHub Pages

1. Put the site files on the `main` branch.
2. Open the repository's Settings, then Pages.
3. Choose Deploy from a branch.
4. Select `main` and `/ (root)`, then Save.
5. Use the default github.io address shown by Pages. Leave Custom domain empty. Do not add a CNAME file.

All local asset and page links are relative so the site can run under a repository path.

## Local preview

Run `python3 -m http.server 8000` in this directory. Open localhost on port 8000. Stop the server with Ctrl+C.

## Provider data

The map shows “Listings are being verified” while the data array is empty. Edit `data/providers.json`. It contains an empty JSON array until providers have been checked. Add one object per provider. Keep all the fields below. Use decimal numbers for `lat` and `lon`. Use empty strings for information that has not been confirmed. Coverage can be a comma-separated string or an array. Filters use the values entered in region, profession and coverage.

Example only. This record is not a provider and must not be published in the data file.

```json
{
  "organization": "Example only",
  "profession": "Optometry",
  "address": "",
  "city": "",
  "region": "",
  "phone": "",
  "website": "",
  "coverage": [],
  "source_url": "",
  "last_confirmed": "",
  "lat": null,
  "lon": null
}
```

Do not claim that a provider accepts new patients, offers free care or accepts a benefit unless it has been confirmed. Record the source and confirmation date. Replace the visible provider-review message in `map.html` with the confirmation date after review. Eligibility, referrals, accessibility and languages remain unconfirmed in this data schema.

Leaflet 1.9.4 loads from its distribution CDN with SRI. The map uses OpenStreetMap tiles. Directions request browser location only after a visitor presses Directions and send the coordinates to the public OSRM demo service. Each listing with valid coordinates also links to Google Maps directions without an API key. These services need a network connection. The site shows a message if location or routing fails. Location access needs HTTPS or localhost.

## Find eye care

`find-eye-care.html` groups official links by coverage, provider registration, vision-loss support and symptom questions. Links open in the same tab.

## Contact

Contact is through [Instagram](https://www.instagram.com/eyesofbritishcolumbia/). The contact page lists inquiry types to include in a message.

## Copy requiring confirmation

The five equity statistics carry the supplied source line, Health Canada, National Strategy for Eye Care (2026), June 2026. No source URLs or underlying studies were supplied. The figures are 1.2 million, more than 8 million, twice as many by 2050, up to 40%, and about 25%.

The supplied founding year is omitted because it was marked unverified. The supplied faculty role for Dr. Colten Wendel remains unverified. The supplied Hoop for Sight copy gives 2026 and approximately $13,000; its note does not record a date. The featured research and research library await content.

## Instagram posts

The home page shows Instagram posts listed in `data/instagram.json`. The file ships as an empty array `[]`, which shows the follow link and the sentence "Latest posts on Instagram." instead.

To add a post, open it on Instagram, copy its link (for example `https://www.instagram.com/p/POST_CODE/`, where POST_CODE is a placeholder), and paste it as a string inside the array. Separate entries with commas and keep the file a JSON array. Posts appear in the order listed. Only `https://www.instagram.com/p/` and `/reel/` links are used. Embeds load from instagram.com when the section nears the screen.

## Motion

Scroll reveals and the header shadow are in `css/style.css` and `js/main.js`. Each page sets a `js` class on `<html>` from a small inline script in its head, so content stays visible without JavaScript. Motion is turned off when the visitor's system requests reduced motion.

## Checks

Use Python's html.parser to parse every HTML page and check local links, one h1 per page and the shared navigation. Parse `data/providers.json` as JSON. Check all site files for em dash characters and the removed page name. Use `node --check js/main.js` for JavaScript syntax. Browser layout, live tiles, location permission and external routing need separate manual checks.

## Prototype design

The site keeps the supplied navy, coastal blue, sage, ivory and gold palette and existing SVG logos. The home page uses an arched logo illustration, quick resource links, outreach cards, a compact team grid and a contact call to action. No photographs or additional dependencies are used. All pages share responsive navigation and footer links. The menu supports Escape, and navigation remains visible with JavaScript disabled. Research details remain a collapsible template until content is supplied.

CSS and JavaScript URLs use a version query; change it when updating those files. Mobile layout rules cover the hero, cards, map filters and navigation. Visual browser checks and live map routing are separate from static link and JavaScript checks.
