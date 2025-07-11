document.addEventListener("DOMContentLoaded", () => {
  fetch("components/footer.component.html")
    .then(res => {
      if (!res.ok) {
        throw new Error("Failed to load footer");
      }
      return res.text();
    })
    .then(html => {
      document.getElementById("footer-container").innerHTML = html;

      // After footer is injected, update copyright year
      const yearSpan = document.getElementById("footer-copyright-year");
      if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
      }
    })
    .catch(err => console.error("Error loading footer:", err));
});
