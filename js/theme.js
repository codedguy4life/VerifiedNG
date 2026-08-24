const themeToggle = document.getElementById("themeToggle");

function updateThemeIcon() {
  if (!themeToggle) return;

  if (document.body.classList.contains("dark-mode")) {
    themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
    themeToggle.setAttribute("aria-label", "Switch to light mode");
    themeToggle.setAttribute("title", "Switch to light mode");
  } else {
    themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i>';
    themeToggle.setAttribute("aria-label", "Switch to dark mode");
    themeToggle.setAttribute("title", "Switch to dark mode");
  }
}

// Load saved theme
const savedTheme = localStorage.getItem("verifiedNG-theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark-mode");
}

updateThemeIcon();

// Toggle theme
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");

    localStorage.setItem(
      "verifiedNG-theme",
      isDark ? "dark" : "light"
    );

    updateThemeIcon();
  });
}