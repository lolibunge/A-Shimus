// Fade out .announcement_bar when close is clicked
document.addEventListener("DOMContentLoaded", function () {
  var closeBtn = document.querySelector(".announcement_bar_close_x");
  var bar = document.querySelector(".announcement_bar");
  if (closeBtn && bar) {
    closeBtn.addEventListener("click", function () {
      bar.classList.add("closed");
    });
  }
});
