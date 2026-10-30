# Mytra Version 1 (facade)

A showcase copy of MYTRA: the front page and a working **demo**. There is no backend, no
sign-in and no saved data. Everything runs in the browser.

## Open it
Double-click **`index.html`**. (Any web host also works; there is nothing to build or install.)

## What visitors see
| Where | What happens |
|---|---|
| `index.html` | The front page, with the animated hero. |
| "I want to be great", "Open app", "Enter MYTRA" | A pop-up: *"We're having a problem with this page… please check again soon."* |
| "See it in action", "Try the demo" | The working demo (`app/index.html?demo=1`) with fictional data. Nothing is saved. |
| Demo → **Calendar** | A "Coming soon" page. No calendar code is in this folder. |
| `app/index.html` without `?demo=1` | Sent to `unavailable.html`, which shows the same message. |

## Files
```
index.html            front page
unavailable.html      the "we're having a problem" page
app/index.html        the demo (only runs with ?demo=1)
assets/css/           base · site · hero · app · facade
assets/js/core/       utils, store, state, analytics
assets/js/ui/         components, charts
assets/js/app/        logging, focus-engine, demo, main
assets/js/app/views/  mission, today, focus, telemetry, system, calendar-soon
assets/js/site/       landing (background), hero (animation), facade (the pop-up)
```

## Changing the message
The wording is in two places: `assets/js/site/facade.js` (the pop-up) and `unavailable.html`.

## When the real app is ready
The full project lives in `MYTRA CODE` (and `MYTRA BACKEND`). To go live, swap the start buttons'
`data-facade-enter` links back to `app/index.html`, and restore the real `app/main.js`.

## Before putting it online
- Replace `https://YOUR-DOMAIN.com` in `index.html` (canonical link, social tags, structured data).
- Add `assets/img/og-image.png` (1200×630) for link previews.
- The Features and Privacy pages are not part of this copy, so the front page doesn't link to them.
