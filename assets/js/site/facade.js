/* MYTRA // site/facade.js - the "we're having a problem" message.
   Any link marked data-facade-enter opens this pop-up instead of the app.
   Without JavaScript those links still work: they go to unavailable.html, which says the same. */
"use strict";

(function () {
  var overlay = null, lastFocus = null;

  function demoHref() {
    /* works from the root pages; the app pages never use this file */
    return "app/index.html?demo=1";
  }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  function open() {
    if (overlay) return;
    lastFocus = document.activeElement;
    overlay = document.createElement("div");
    overlay.className = "fx-ov";
    overlay.innerHTML =
      '<div class="fx-box bez" role="dialog" aria-modal="true" aria-labelledby="fx-t" aria-describedby="fx-d">' +
      '<span class="st wn"><i></i>Temporarily unavailable</span>' +
      '<h2 class="fx-title" id="fx-t">We\'re having a problem with this page.</h2>' +
      '<p class="fx-text" id="fx-d">We are currently facing an issue here, but our best minds are working on resolving it. Please check again soon.</p>' +
      '<p class="fx-text">In the meantime, you are welcome to explore the demo.</p>' +
      '<div class="fx-act">' +
      '<a class="btn btn-p" href="' + demoHref() + '">Try the demo</a>' +
      '<button type="button" class="btn" data-fx-close>Close</button>' +
      "</div></div>";
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    var btn = overlay.querySelector("[data-fx-close]");
    if (btn) btn.focus();
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || (e.target.closest && e.target.closest("[data-fx-close]"))) close();
    });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-facade-enter]");
    if (!a) return;
    e.preventDefault();
    open();
  });

  document.addEventListener("keydown", function (e) {
    if (!overlay) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Tab") {
      /* keep keyboard focus inside the pop-up */
      var f = overlay.querySelectorAll("a[href],button");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
