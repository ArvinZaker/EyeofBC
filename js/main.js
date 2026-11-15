"use strict";
if (document.querySelector('#map')) setupMap();
initNavigation();
initMotion();
initInstagram();
initResources();

function initNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  if (!toggle || !nav) return;
  toggle.hidden = false;
  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  window.matchMedia('(min-width: 1100px)').addEventListener('change', closeMenu);
}

function initMotion() {
  const header = document.querySelector('header');
  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, {passive: true});
  onScroll();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    }
  }, {threshold: 0.1, rootMargin: '0px 0px -40px 0px'});
  document.querySelectorAll('.cards').forEach(grid => {
    [...grid.children].forEach((card, i) => card.style.setProperty('--d', `${Math.min(i, 3) * 80}ms`));
  });
  document.querySelectorAll('main .card, .pathways > a').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}

function initInstagram() {
  const grid = document.querySelector('#instagram-posts');
  if (!grid) return;
  const fallback = document.querySelector('#instagram-fallback');
  const section = document.querySelector('#our-work') || grid;
  const postUrl = value => {
    try {
      const url = new URL(value);
      const valid = url.protocol === 'https:' && url.hostname === 'www.instagram.com' && /^\/(p|reel)\/[\w-]+\/?$/.test(url.pathname);
      return valid ? url.href : null;
    } catch { return null; }
  };
  let embedRequested = false;
  function loadEmbeds() {
    if (embedRequested) return;
    embedRequested = true;
    const processEmbeds = () => window.instgrm?.Embeds.process();
    if (window.instgrm) { processEmbeds(); return; }
    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.onload = processEmbeds;
    document.body.append(script);
  }
  function renderPosts(urls) {
    const posts = urls.map(postUrl).filter(Boolean);
    if (!posts.length) return;
    posts.forEach((url, i) => {
      const panel = document.createElement('article');
      panel.className = 'social-panel';
      const topline = document.createElement('div');
      topline.className = 'panel-topline';
      const glyph = document.createElement('span');
      glyph.className = 'social-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = '◎';
      const label = document.createElement('span');
      label.textContent = `Instagram · Post ${i + 1}`;
      const profile = document.createElement('a');
      profile.href = 'https://www.instagram.com/eyesofbritishcolumbia/';
      profile.textContent = '@eyesofbritishcolumbia ↗';
      topline.append(glyph, label, profile);
      const quote = document.createElement('blockquote');
      quote.className = 'instagram-media';
      quote.dataset.instgrmPermalink = url;
      quote.dataset.instgrmVersion = '14';
      quote.style.maxWidth = '540px';
      quote.style.minWidth = '0';
      quote.style.width = '100%';
      const emblem = document.createElement('img');
      emblem.src = 'assets/logo-emblem.svg';
      emblem.alt = '';
      emblem.width = 160;
      emblem.height = 92;
      const heading = document.createElement('p');
      heading.textContent = 'Eyes of BC on Instagram';
      const link = document.createElement('a');
      link.href = url;
      link.textContent = 'View this post on Instagram ↗';
      const profileLink = document.createElement('a');
      profileLink.href = 'https://www.instagram.com/eyesofbritishcolumbia/';
      profileLink.textContent = 'Instagram profile (@eyesofbritishcolumbia) ↗';
      quote.append(emblem, heading, link, profileLink);
      panel.append(topline, quote);
      grid.append(panel);
    });
    if (fallback) fallback.hidden = true;
    if (!('IntersectionObserver' in window)) { loadEmbeds(); return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      loadEmbeds();
    }, {rootMargin: '600px 0px'});
    observer.observe(section);
  }
  fetch('data/instagram.json')
    .then(response => {
      if (!response.ok) throw new Error('instagram');
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('instagram');
      renderPosts(data);
    })
    .catch(() => {});
}

function initResources() {
  const filters = document.querySelector('.resource-filters');
  if (!filters) return;
  const buttons = [...filters.querySelectorAll('button')];
  const cards = [...document.querySelectorAll('.resources-page .resource-card')];
  const count = document.querySelector('.resource-count');
  filters.hidden = false;
  function show(category) {
    let total = 0;
    cards.forEach(card => {
      card.hidden = category !== 'All' && card.dataset.category !== category;
      if (!card.hidden) total++;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    count.textContent = `${total} ${total === 1 ? 'resource' : 'resources'}`;
  }
  buttons.forEach(button => button.addEventListener('click', () => show(button.dataset.filter)));
  show('All');
}

async function setupMap() {
  const status = document.querySelector('#map-status');
  const listings = document.querySelector('#listings');
  const search = document.querySelector('#search');
  const region = document.querySelector('#region');
  const reset = document.querySelector('#reset-filters');
  let map, markers, route, providers = [], request = 0;
  if (window.L) {
    map = L.map('map', {scrollWheelZoom: false}).setView([53.5, -124], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
  }
  const coordinates = item => typeof item.lat === 'number' && typeof item.lon === 'number' && Number.isFinite(item.lat) && Number.isFinite(item.lon) && Math.abs(item.lat) <= 90 && Math.abs(item.lon) <= 180;
  function text(parent, tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }
  function link(parent, label, value) {
    try {
      const url = new URL(value);
      if (!['https:', 'http:', 'tel:'].includes(url.protocol)) return;
      const node = text(parent, 'a', label);
      node.href = url.href;
      return node;
    } catch { return; }
  }
  function button(parent, label, action) {
    const node = text(parent, 'button', label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }
  async function directions(item) {
    const current = ++request;
    if (route) { map.removeLayer(route); route = null; }
    if (!navigator.geolocation) { status.textContent = 'Your browser cannot share your location.'; return; }
    status.textContent = 'Allow location access to get driving directions.';
    navigator.geolocation.getCurrentPosition(async position => {
      if (current !== request) return;
      status.textContent = 'Finding a driving route.';
      const {latitude, longitude} = position.coords;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${item.lon},${item.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url, {signal: controller.signal});
        if (!response.ok) throw new Error('route');
        const data = await response.json();
        if (data.code !== 'Ok' || !data.routes?.length) throw new Error('route');
        if (current !== request) return;
        route = L.geoJSON(data.routes[0].geometry, {style: {color: '#0b2d4e', weight: 5}}).addTo(map);
        map.fitBounds(route.getBounds(), {padding: [25, 25]});
        status.textContent = `Driving route to ${item.organization}.`;
      } catch {
        if (current === request) status.textContent = 'The driving route is unavailable. Try again later.';
      } finally { clearTimeout(timer); }
    }, error => {
      if (current === request) status.textContent = error.code === 1 ? 'Location access was denied. Allow location access to get directions.' : 'Your location is unavailable. Try again later.';
    }, {timeout: 15000, maximumAge: 60000});
  }
  function render() {
    request++;
    if (route) { map.removeLayer(route); route = null; }
    listings.replaceChildren();
    markers?.clearLayers();
    const query = search.value.trim().toLowerCase();
    const shown = providers.filter(item => (!region.value || item.region === region.value) && [item.organization, item.city, item.address, item.profession].join(' ').toLowerCase().includes(query));
    reset.hidden = !query && !region.value;
    status.textContent = `${shown.length} ${shown.length === 1 ? 'location' : 'locations'}`;
    if (!map) status.textContent += ' · Map unavailable; location details are below.';
    if (!shown.length) {
      const empty = text(listings, 'li', '');
      text(empty, 'h3', 'No matching locations');
      text(empty, 'p', 'Try a different city or reset the filters. You can also use the provider directories below.');
    }
    shown.forEach(item => {
      const li = document.createElement('li');
      const selectButton = text(li, 'button', item.city, 'listing-select');
      selectButton.type = 'button';
      selectButton.setAttribute('aria-pressed', 'false');
      text(li, 'h3', item.organization.replace(', ' + item.city, ''));
      text(li, 'p', item.profession, 'listing-type');
      text(li, 'p', item.address, 'listing-address');
      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.address + ', ' + item.city + ', BC')}`;
      const links = document.createElement('div');
      links.className = 'listing-links';
      link(links, 'Call ↗', `tel:${String(item.phone).replace(/[^+\d]/g, '')}`);
      link(links, 'Website ↗', item.website);
      link(links, 'Directions ↗', gmapsUrl);
      li.append(links);
      const details = document.createElement('details');
      text(details, 'summary', 'Before you visit');
      text(details, 'p', 'Confirm appointments, coverage, referral requirements, accessibility and language support with the provider.');
      link(details, 'Location source ↗', item.source_url);
      text(details, 'p', `Location checked ${item.last_confirmed}.`, 'listing-reviewed');
      li.append(details);
      let marker;
      const select = (fromMap = false) => {
        listings.querySelectorAll('li').forEach(node => {
          node.classList.remove('selected');
          node.querySelector('.listing-select')?.setAttribute('aria-pressed', 'false');
        });
        li.classList.add('selected');
        selectButton.setAttribute('aria-pressed', 'true');
        if (marker) {
          if (!fromMap) map.setView([item.lat, item.lon], 13);
          marker.openPopup();
        }
        if (fromMap) li.scrollIntoView({block: 'nearest'});
      };
      selectButton.addEventListener('click', () => select());
      if (map && coordinates(item)) button(links, 'View map', () => { select(); document.querySelector('#map').scrollIntoView({block: 'center'}); });
      if (map && coordinates(item)) {
        marker = L.marker([item.lat, item.lon], {
          alt: item.organization, title: item.city
        }).addTo(markers);
        const popup = document.createElement('div');
        text(popup, 'strong', item.organization);
        text(popup, 'p', item.address);
        const popupLinks = document.createElement('p');
        link(popupLinks, item.phone, `tel:${String(item.phone).replace(/[^+\d]/g, '')}`);
        popupLinks.append(' · ');
        link(popupLinks, 'Website ↗', item.website);
        popupLinks.append(' · ');
        link(popupLinks, 'Directions ↗', gmapsUrl);
        popup.append(popupLinks);
        button(popup, 'Drive here', () => { select(true); directions(item); });
        marker.bindPopup(popup);
        marker.on('click', () => select(true));
      }
      listings.append(li);
    });
    const points = shown.filter(coordinates).map(item => [item.lat, item.lon]);
    if (map && points.length) map.fitBounds(points, {padding: [45, 45], maxZoom: 12});
    else if (map) map.setView([53.5, -124], 5);
  }
  try {
    const response = await fetch('data/providers.json');
    if (!response.ok) throw new Error('data');
    providers = await response.json();
    if (!Array.isArray(providers)) throw new Error('data');
    [...new Set(providers.map(item => item.region).filter(Boolean))].sort().forEach(value => region.add(new Option(value, value)));
    region.addEventListener('change', render);
    search.addEventListener('input', render);
    reset.addEventListener('click', () => { search.value = ''; region.value = ''; render(); search.focus(); });
    render();
  } catch {
    status.textContent = 'Locations could not load.';
    const errLi = text(listings, 'li', '');
    text(errLi, 'p', 'Use the provider directories below to continue your search.');
  }
}
