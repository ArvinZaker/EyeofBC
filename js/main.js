"use strict";
if (document.querySelector('#map')) setupMap();
initNavigation();
initMotion();
initInstagram();

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
  const section = document.querySelector('#latest-updates');
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
    for (const url of posts) {
      const quote = document.createElement('blockquote');
      quote.className = 'instagram-media';
      quote.dataset.instgrmPermalink = url;
      quote.dataset.instgrmVersion = '14';
      quote.style.maxWidth = '540px';
      quote.style.minWidth = '0';
      quote.style.width = '100%';
      const link = document.createElement('a');
      link.href = url;
      link.textContent = 'View this post on Instagram';
      quote.append(link);
      grid.append(quote);
    }
    fallback.hidden = true;
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

async function setupMap() {
  const status = document.querySelector('#map-status');
  const listings = document.querySelector('#listings');
  const controls = ['region', 'profession', 'coverage'];
  let map, markers, route, providers = [], request = 0;
  if (window.L) {
    map = L.map('map').setView([54, -125], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
  }
  const values = value => Array.isArray(value) ? value : String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  const coordinates = item => typeof item.lat === 'number' && typeof item.lon === 'number' && Number.isFinite(item.lat) && Number.isFinite(item.lon) && Math.abs(item.lat) <= 90 && Math.abs(item.lon) <= 180;
  const safeUrl = value => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  };
  function text(parent, tag, value) {
    const node = document.createElement(tag);
    node.textContent = value;
    parent.append(node);
    return node;
  }
  function link(parent, label, value) {
    const url = safeUrl(value);
    if (!url) return;
    const node = text(parent, 'a', label);
    node.href = url;
    parent.append(document.createTextNode(' '));
  }
  function button(parent, label, action) {
    const node = text(parent, 'button', label);
    node.type = 'button';
    node.addEventListener('click', action);
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
    const query = document.querySelector('#search').value.trim().toLowerCase();
    const shown = providers.filter(item => controls.every(key => !document.getElementById(key).value || values(item[key]).includes(document.getElementById(key).value)) && [item.organization, item.city, item.address].join(' ').toLowerCase().includes(query));
    status.textContent = providers.length ? (shown.length ? 'Select a resource for directions.' : 'No resources match these filters.') : 'Listings are being verified';
    if (!map) status.textContent += ' The map could not load.';
    for (const item of shown) {
      const article = document.createElement('article');
      text(article, 'h3', item.organization);
      text(article, 'p', [item.address, item.city, item.region].filter(Boolean).join(', '));
      text(article, 'p', item.profession || 'Profession unconfirmed');
      text(article, 'p', `Coverage: ${values(item.coverage).join(', ') || 'unconfirmed'}`);
      text(article, 'p', 'Eligibility, referral, accessibility and languages: unconfirmed.');
      text(article, 'p', `Last confirmed: ${item.last_confirmed || 'unconfirmed'}`);
      if (item.phone) {
        const phone = text(article, 'a', `Call ${item.organization}: ${item.phone}`);
        phone.href = `tel:${String(item.phone).replace(/[^+\d]/g, '')}`;
        article.append(document.createTextNode(' '));
      }
      link(article, `${item.organization} website`, item.website);
      link(article, 'Provider source', item.source_url);
      if (coordinates(item)) link(article, 'Open in Google Maps', `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lon}`);
      if (map && coordinates(item)) {
        const marker = L.marker([item.lat, item.lon], {alt: item.organization, title: item.organization}).addTo(markers);
        const popup = document.createElement('div');
        text(popup, 'strong', item.organization);
        const select = () => {
          listings.querySelectorAll('article').forEach(node => node.classList.remove('selected'));
          article.classList.add('selected');
          map.setView([item.lat, item.lon], 12);
          marker.openPopup();
        };
        button(popup, 'Directions', () => { select(); directions(item); });
        marker.bindPopup(popup);
        marker.on('click', () => {
          listings.querySelectorAll('article').forEach(node => node.classList.remove('selected'));
          article.classList.add('selected');
        });
        button(article, 'Select', select);
        button(article, 'Directions', () => { select(); directions(item); });
      }
      listings.append(article);
    }
  }
  try {
    const response = await fetch('data/providers.json');
    if (!response.ok) throw new Error('data');
    providers = await response.json();
    if (!Array.isArray(providers)) throw new Error('data');
    for (const key of controls) {
      const select = document.getElementById(key);
      const options = [...new Set(providers.flatMap(item => values(item[key])))].sort();
      options.forEach(value => select.add(new Option(value, value)));
      select.addEventListener('change', render);
    }
    document.querySelector('#search').addEventListener('input', render);
    render();
  } catch { status.textContent = 'Resources could not load. Try again later.'; }
}
