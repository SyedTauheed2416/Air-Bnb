if (Array.isArray(coordinates) && coordinates.length === 2) {
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  const redIcon = L.divIcon({
    className: "red-marker",
    html: '<div class="marker-dot"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  const map = L.map("map").setView([lat, lng], 9);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  L.marker([lat, lng], { icon: redIcon })
    .addTo(map)
    .bindPopup(listingTitle)
    .openPopup();
} else {
  const mapElement = document.getElementById("map");
  if (mapElement) {
    mapElement.innerHTML =
      '<div class="alert alert-warning m-3">Map location is not available for this listing.</div>';
  }
}
