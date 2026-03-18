//. NAV SEARCH
function handleNavSearch() {
  const service = document.getElementById("navServiceInput").value.trim();
  if (service) {
    window.location.href = `search.html?service=${encodeURIComponent(service)}&location=Nigeria`;
  }
}

//. HERO SEARCH
function handleSearch() {
  const service = document.getElementById("serviceInput").value.trim();
  const location = document.getElementById("locationInput").value.trim();
  if (service || location) {
    window.location.href = `search.html?service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`;
  }
}
