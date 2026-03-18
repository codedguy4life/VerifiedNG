// Modal functions for Hire Now buttons
function openHireModal() {
  document.getElementById("hireModal").classList.add("open");
}

function closeHireModal() {
  document.getElementById("hireModal").classList.remove("open");
}

// Close modal when clicking outside of it
window.onclick = function (event) {
  const modal = document.getElementById("hireModal");
  if (event.target === modal) {
    closeHireModal();
  }
};

// Modal functions for Hire Now buttons on second card
function openHireModal2() {
  document.getElementById("hireModal2").classList.add("open");
}

function closeHireModal2() {
  document.getElementById("hireModal2").classList.remove("open");
}

// Close modal when clicking outside of it
window.onclick = function (event) {
  const modal = document.getElementById("hireModal2");
  if (event.target === modal) {
    closeHireModal2();
  }
};
