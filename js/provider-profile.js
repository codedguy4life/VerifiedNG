function openHireModal() {
  document.getElementById("hireModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeHireModal() {
  document.getElementById("hireModal").classList.remove("open");
  document.body.style.overflow = "";
}

// Close modal when clicking outside
document.getElementById("hireModal").addEventListener("click", function (e) {
  if (e.target === this) closeHireModal();
});
