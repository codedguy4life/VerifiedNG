// Modal for card 1
function openHireModal() {
  document.getElementById("hireModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeHireModal() {
  document.getElementById("hireModal").classList.remove("open");
  document.body.style.overflow = "";
}

// Modal for card 2
function openHireModal2() {
  document.getElementById("hireModal2").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeHireModal2() {
  document.getElementById("hireModal2").classList.remove("open");
  document.body.style.overflow = "";
}

// ONE window.onclick handles BOTH modals
window.onclick = function(event) {
  const modal1 = document.getElementById("hireModal");
  const modal2 = document.getElementById("hireModal2");

  if (event.target === modal1) closeHireModal();
  if (event.target === modal2) closeHireModal2();
};