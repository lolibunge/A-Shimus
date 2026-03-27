document.addEventListener("DOMContentLoaded", function () {
  var headers = document.querySelectorAll(".links-footer");
  headers.forEach(function (header) {
    header.addEventListener("click", function () {
      var ul = header.querySelector("ul");
      var plusIcon = header.querySelector(".footer--dropdown-icon-plus");
      var minusIcon = header.querySelector(".footer--dropdown-icon-minus");
      if (ul) ul.classList.toggle("open");
      if (plusIcon) plusIcon.classList.toggle("close");
      if (minusIcon) minusIcon.classList.toggle("close");
    });
  });
});
