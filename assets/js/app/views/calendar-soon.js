/* MYTRA // app/views/calendar-soon.js - Calendar placeholder (#calendar).
   The real calendar is not part of this version. Needs ui/components.js (panel, viewHead). */
"use strict";

function renderCalendarSoon() {
  const root = $("#v-calendar");
  root.innerHTML = viewHead("Calendar", "Level 1 // Schedule");
  const stack = el("div", "stack");
  root.appendChild(stack);

  const p = panel("Calendar", { head: '<span class="st wn"><i></i>Coming soon</span>' });

  /* a faint, decorative week grid, so the page shows what is on its way */
  const heights = [[22, 8], [14, 30], [40], [18, 18], [32, 12], [10], [26]];
  const cols = heights.map((blocks, i) =>
    '<div class="cs-col"><span class="lbl">' + DOW[(i) % 7] + "</span>" +
    blocks.map((h, j) => '<i style="height:' + h + "%;margin-top:" + (j ? 10 : 6 + i * 3) + '%"></i>').join("") + "</div>").join("");

  p._bd.innerHTML =
    '<div class="cs-wrap">' +
    '<div class="cs-prev" aria-hidden="true">' + cols + "</div>" +
    '<div class="cs-msg">' +
    '<span class="lbl cs-k">Coming soon</span>' +
    '<p class="cs-t">Your schedule, next to your data.</p>' +
    '<p class="cs-d">Calendar is on its way. Soon you will see the commitments you already keep alongside your sleep, focus and energy, so you can spot which kinds of days work best for you.</p>' +
    '<ul class="cs-l"><li>Your events beside your daily readings</li><li>Connect once, with nothing to re-enter</li><li>Always read-only, always private</li></ul>' +
    '<div class="cs-act"><button class="btn btn-q" data-act="event">＋ Log an event for now</button></div>' +
    "</div></div>";
  stack.appendChild(p);
}
