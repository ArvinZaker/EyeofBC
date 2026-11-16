"use strict";
initTheme();
if (document.querySelector('#map')) setupMap();
if (document.querySelector('#bc-map')) initCommunityMap();
initNavigation();
initMotion();
initInstagram();
initResources();

function initTheme() {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;
  const root = document.documentElement;
  const sync = theme => {
    root.setAttribute('data-theme', theme);
    toggle.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  sync(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    sync(next);
    try { localStorage.setItem('theme', next); } catch {}
  });
}

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
  function createCard(url) {
    const quote = document.createElement('blockquote');
    quote.className = 'instagram-media';
    quote.dataset.instgrmPermalink = url;
    quote.dataset.instgrmVersion = '14';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = '@eyesofbritishcolumbia';
    const title = document.createElement('h3');
    title.textContent = 'Community update';
    const note = document.createElement('p');
    note.textContent = 'View this post on Instagram.';
    const link = document.createElement('a');
    link.href = url;
    link.textContent = 'View on Instagram ↗';
    quote.append(eyebrow, title, note, link);
    return quote;
  }
  function verifyEmbeds(panels) {
    setTimeout(() => {
      panels.forEach(({panel, url}) => {
        const frame = panel.querySelector('iframe.instagram-media');
        if (frame && frame.offsetHeight < 50) panel.replaceChildren(createCard(url));
      });
    }, 4000);
  }
  let embedRequested = false;
  function loadEmbeds(panels) {
    if (embedRequested) return;
    embedRequested = true;
    const processEmbeds = () => {
      try { window.instgrm?.Embeds.process(); } catch {}
      verifyEmbeds(panels);
    };
    if (window.instgrm) { processEmbeds(); return; }
    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.onload = processEmbeds;
    script.onerror = () => {};
    document.body.append(script);
  }
  function renderPosts(urls) {
    const posts = urls.map(postUrl).filter(Boolean);
    if (!posts.length) return;
    const panels = posts.map(url => {
      const panel = document.createElement('article');
      panel.className = 'social-panel';
      panel.append(createCard(url));
      grid.append(panel);
      return {panel, url};
    });
    if (fallback) fallback.hidden = true;
    if (!('IntersectionObserver' in window)) { loadEmbeds(panels); return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      loadEmbeds(panels);
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
    if (map) requestAnimationFrame(() => map.invalidateSize());
  }
  if (map) window.addEventListener('resize', () => map.invalidateSize());
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

function initCommunityMap() {
  const map = document.querySelector('#bc-map');
  const items = [...document.querySelectorAll('.reached-list li')];
  const pins = [...map.querySelectorAll('.pin')];
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.classList.add('pin-label');
  label.setAttribute('aria-hidden', 'true');
  map.append(label);
  let locked = null;
  function highlight(pin) {
    pins.forEach(point => {
      point.classList.toggle('is-active', point === pin);
      point.setAttribute('r', point === pin ? '6.5' : '4.2');
    });
    items.forEach(item => item.classList.toggle('is-active', item.querySelector('strong').textContent.trim() === pin?.querySelector('title').textContent.trim()));
    label.textContent = pin ? pin.querySelector('title').textContent.trim() : '';
    if (!pin) return;
    const x = Number(pin.getAttribute('cx'));
    label.setAttribute('x', x > 240 ? x - 11 : x + 11);
    label.setAttribute('y', Number(pin.getAttribute('cy')) - 9);
    label.setAttribute('text-anchor', x > 240 ? 'end' : 'start');
    pin.parentNode.append(pin);
  }
  pins.forEach(pin => {
    const name = pin.querySelector('title').textContent.trim();
    const item = items.find(row => row.querySelector('strong').textContent.trim() === name);
    if (!item) return;
    [pin, item].forEach(target => {
      target.setAttribute('tabindex', '0');
      target.addEventListener('mouseenter', () => highlight(pin));
      target.addEventListener('mouseleave', () => highlight(locked));
      target.addEventListener('focus', () => highlight(pin));
      target.addEventListener('blur', () => highlight(locked));
      const toggle = () => {
        locked = locked === pin ? null : pin;
        highlight(locked);
      };
      target.addEventListener('click', toggle);
      target.addEventListener('keydown', event => {
        if (event.key === 'Escape') { locked = null; highlight(null); }
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggle();
      });
    });
  });
}
