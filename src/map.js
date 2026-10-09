import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
export function createMap(element, onSelect, onTileError) {
  const map = L.map(element, {scrollWheelZoom: false}).setView([-23.9388, -46.183], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).on('tileerror', onTileError).addTo(map);
  const group = L.featureGroup().addTo(map);
  const markers = new Map();
  function show(items) {
    group.clearLayers(); markers.clear();
    for (const item of items) {
      const icon = L.divIcon({className: 'occurrence-marker', html: `<span class="pin ${item.category === 'Água' ? 'water' : 'waste'}">${item.category === 'Água' ? 'A' : 'R'}</span>`, iconSize: [34, 34], iconAnchor: [17, 17]});
      const marker = L.marker([item.latitude,item.longitude], {icon, title: item.title, alt: item.title, keyboard: true});
      const popup = document.createElement('div');
      const label = document.createElement('small'); label.textContent = 'Registro simulado';
      const heading = document.createElement('strong'); heading.textContent = item.title;
      const state = document.createElement('p'); state.textContent = item.status;
      const button = document.createElement('button'); button.textContent = 'Ver detalhes'; button.addEventListener('click', () => onSelect(item.id));
      popup.append(label, heading, state, button); marker.bindPopup(popup).addTo(group); markers.set(item.id, marker);
    }
  }
  function fit() { if (group.getLayers().length) map.fitBounds(group.getBounds().pad(.25), {maxZoom: 16}); }
  let picking=null;
  return {show,fit,pickPoint(callback) {if(picking)map.off('click',picking);picking=event=>{picking=null;callback(event.latlng);};map.once('click',picking);element.scrollIntoView({block:'center'});},focus(id) { const marker = markers.get(id); if (marker) {map.panTo(marker.getLatLng()); marker.openPopup();} }};
}
