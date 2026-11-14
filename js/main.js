"use strict";
if (document.querySelector('#map')) setupMap();

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
