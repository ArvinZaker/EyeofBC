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

The access map uses `data/providers.json`. It currently contains six Vision Loss Rehabilitation Canada locations, checked against [the official locations page](https://visionlossrehab.ca/en/locations), British Columbia section, on November 14, 2026. This is a vision rehabilitation location map. Eye examinations and other care are linked through the provider-directory cards below the map.

The official page lists Abbotsford (2491 McCallum Rd, Unit 120), New Westminster (Royal City Centre, 610 6th St, Suite 201A), Kelowna (546 Leon Ave, Unit 302), Prince George (550 Victoria St, Suite 502), Kamloops (546 St Paul St, Unit 190), and Victoria (1675 Douglas St, Unit 102). Phone numbers come from that page. Clinic access, referral requirements, coverage, accessibility, language support and acceptance of new patients have not been confirmed; the location cards direct visitors to the provider for those questions.

Coordinates were obtained from the [BC Government geocoder](https://geocoder.api.gov.bc.ca/addresses.json). Each record retains its exact coordinate lookup URL in `coordinate_source`. Returned civic addresses and localities were checked against the source addresses before saving. The geocoder spells New Westminster's 6th St as Sixth St. Region labels group the source cities for navigation.

Add locations only after checking the provider's own source and recording its URL and date. Do not claim that a provider accepts new patients, offers free care or accepts a benefit unless confirmed. Search and region filters update the list and map together; Reset clears both. City buttons select a marker, and marker clicks highlight the corresponding listing.

Leaflet 1.9.4 loads from its distribution CDN with SRI. The map uses OpenStreetMap tiles. Browser location is requested only after a visitor presses Drive here in a marker popup. Driving routes use the public OSRM demo service. The visible listing Directions link opens Google Maps with the source address. These services need a network connection; the location list and directory links remain useful if map tiles fail. Location access needs HTTPS or localhost.

## Find eye care

`find-eye-care.html` groups official links by coverage, provider registration, vision-loss support and symptom questions. Links open in the same tab.

## Contact

Contact is through [Instagram](https://www.instagram.com/eyesofbritishcolumbia/). The contact page lists inquiry types to include in a message.

## Copy requiring confirmation

The five equity statistics carry the supplied source line, Health Canada, National Strategy for Eye Care (2026), June 2026. No source URLs or underlying studies were supplied. The figures are 1.2 million, more than 8 million, twice as many by 2050, up to 40%, and about 25%.

The supplied founding year is omitted because it was marked unverified. The supplied faculty role for Dr. Colten Wendel remains unverified. The supplied Hoop for Sight copy gives 2026 and approximately $13,000; its note does not record a date. The former Research navigation item is now Resources, retaining the research.html URL for existing links. The self-research template has been removed.

## Instagram posts

The home page has separate Instagram and external-article panels near the top. Instagram posts come from `data/instagram.json`. Three real post URLs were recovered from the existing MyWiki event notes for Hoop for Sight, Science World and the Archway workshop. The profile and profile embed returned login-only content during this revision, so no captions, dates or engagement figures were inferred. Official Instagram embeds load on approach; the source post links remain visible if the embed script is blocked. Previous/next controls switch between posts. The profile panel remains the fallback if the URL array is empty. The Orbis Hoop for Sight article link was already present in the supplied site; its contents could not be independently fetched because the publisher returned a browser-verification page. Its panel uses the existing event name and fundraiser description without adding article claims.

To add another post, open it on Instagram, copy its link (for example `https://www.instagram.com/p/POST_CODE/`, where POST_CODE is a placeholder), and paste it as a string inside the array. Separate entries with commas and keep the file a JSON array. Posts appear in the order listed. Only `https://www.instagram.com/p/` and `/reel/` links are used. Embeds load from instagram.com when the section nears the screen.

## Motion

Scroll reveals and the header shadow are in `css/style.css` and `js/main.js`. Each page sets a `js` class on `<html>` from a small inline script in its head, so content stays visible without JavaScript. Motion is turned off when the visitor's system requests reduced motion.

## Checks

Use Python's html.parser to parse every HTML page and check local links, one h1 per page and the shared navigation. Parse `data/providers.json` as JSON. Check all site files for em dash characters and the removed page name. Use `node --check js/main.js` for JavaScript syntax. Browser layout, live tiles, location permission and external routing need separate manual checks.

## Prototype design

The site keeps the supplied navy, coastal blue, sage, ivory and gold palette and existing SVG logos. The home page uses an arched logo illustration, quick resource links, outreach cards, a compact team grid and a contact call to action. No photographs or additional dependencies are used. All pages share responsive navigation and footer links. The menu supports Escape, and navigation remains visible with JavaScript disabled. The learning page uses keyboard-accessible module tabs with a no-JavaScript anchor fallback. The Resources page links to material from NEI, CNIB, VLRC, HealthLink BC and Orbis. Resource descriptions were checked against those organizations’ pages; filter buttons group the cards by topic.

CSS and JavaScript URLs use a version query; change it when updating those files. Mobile layout rules cover the hero, cards, map filters and navigation. Visual browser checks and live map routing are separate from static link and JavaScript checks.
