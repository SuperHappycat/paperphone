/* Paper Phone – Window: the phone used through one small opening.
 * After Aperture by Special Projects. With a case turned around (or the printed paper
 * sleeve) over the screen, only this window can be seen or touched. */
(function () {
  const PP = window.PP;
  const $ = (id) => document.getElementById(id);
  const KEY = "paperphone.window";
  const q = new URLSearchParams(location.search);
  // window-demo.html shows this page inside a drawn phone: no setup, no sensors, no camera
  const DEMO = q.get("demo") === "1";
  const tell = (msg) => { if (DEMO && window.parent !== window) window.parent.postMessage(Object.assign({ paperphone: true }, msg), "*"); };

  // ---- saved settings ---------------------------------------------------------------
  let st = { model: "iphone17pro", cover: "case", traced: null, minutes: 25, place: null, steps: "" };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* fresh */ }
  if (DEMO) st = { model: PP.PHONES[q.get("model")] ? q.get("model") : "iphone17pro", cover: "paper", traced: null, minutes: 0.5, place: { name: "Home" }, steps: "Boil the water\nAdd the pasta\nStir after two minutes\nDrain and serve" };
  if (!PP.PHONES[st.model] || !PP.PHONES[st.model].win) st.model = "iphone17pro";
  const save = () => { if (!DEMO) try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* not saved */ } };

  // ---- photos, kept on the phone until the cover is off ---------------------------------
  const db = {
    open: () => new Promise((ok, no) => {
      const r = indexedDB.open("paperphone-window", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos", { autoIncrement: true });
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
    }),
    run: async (mode, fn) => { const d = await db.open(); return new Promise((ok, no) => { const tx = d.transaction("photos", mode), req = fn(tx.objectStore("photos")); tx.oncomplete = () => ok(req && req.result); tx.onerror = () => no(tx.error); }); },
    add: (blob) => db.run("readwrite", (s) => s.add(blob)),
    all: () => db.run("readonly", (s) => s.getAll()),
    clear: () => db.run("readwrite", (s) => s.clear()),
  };

  // ---- sound ----------------------------------------------------------------------------
  let audio = null;
  function beep(hz, ms, vol) {
    if (!audio) return;
    const g = audio.createGain(), o = audio.createOscillator(), now = audio.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
    o.frequency.value = hz; o.connect(g); g.connect(audio.destination); o.start(now); o.stop(now + ms / 1000 + 0.02);
  }

  // ---- where the window is ------------------------------------------------------------------
  function rect() {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (st.cover === "case" && st.traced && Math.abs(st.traced.vw - vw) < 2 && Math.abs(st.traced.vh - vh) < 2) return st.traced;
    return PP.windowRect(PP.PHONES[st.model], vw, vh);
  }

  // ---- the six things the window can be -----------------------------------------------------
  const app = $("app");
  let W = 0, H = 0, timers = [], cleanup = [];
  const every = (ms, fn) => { fn(); timers.push(setInterval(fn, ms)); };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; app.append(n); return n; };
  const pad2 = (n) => String(n).padStart(2, "0");

  const timer = { state: "idle", startedAt: 0 };
  let stepAt = 0, motionAt = Date.now(), heading = null, here = null;

  const APPS = [
    {
      name: "Clock",
      enter() {
        const t = el("div", "big");
        t.style.fontSize = Math.min(H * 0.55, W / 3) + "px";
        every(1000, () => { const d = new Date(); t.textContent = pad2(d.getHours()) + ":" + pad2(d.getMinutes()); });
      },
    },
    {
      name: "Focus timer",
      // No numbers: the window fills with light as the time passes.
      enter() {
        const fill = el("div", "fill"), ring = el("div", "ring"), sub = el("div", "sub");
        const size = Math.min(W, H) * 0.34;
        ring.style.width = ring.style.height = size + "px";
        every(250, () => {
          if (timer.state === "running") {
            const p = (Date.now() - timer.startedAt) / (st.minutes * 60000);
            if (p >= 1) { timer.state = "done"; beep(880, 220, 0.15); setTimeout(() => beep(660, 420, 0.15), 240); tell({ type: "note", text: "Time is up: the whole window flashes." }); }
            fill.style.height = Math.min(100, p * 100) + "%";
          } else fill.style.height = timer.state === "done" ? "100%" : "0";
          ring.hidden = timer.state !== "idle";
          sub.textContent = timer.state === "idle" ? "tap to begin" : "";
          app.classList.toggle("done", timer.state === "done");
        });
      },
      tap() {
        if (timer.state === "idle") { timer.state = "running"; timer.startedAt = Date.now(); beep(660, 120); tell({ type: "note", text: "Timer running. The window fills with light; no numbers." }); }
        else { timer.state = "idle"; tell({ type: "note", text: "Timer cleared." }); }
      },
      exit() { app.classList.remove("done"); },
    },
    {
      name: "Camera",
      async enter() {
        const flash = () => { const f = el("div", "flash"); f.style.opacity = 1; setTimeout(() => (f.style.opacity = 0), 60); setTimeout(() => f.remove(), 400); };
        if (DEMO) {
          // a moving pattern stands in for the viewfinder
          const c = el("canvas", "view"); c.width = 160; c.height = 160;
          const g = c.getContext("2d");
          every(60, () => {
            const t = Date.now() / 900;
            for (let y = 0; y < 160; y += 8) for (let x = 0; x < 160; x += 8) {
              const v = 127 + 127 * Math.sin(x / 26 + t) * Math.cos(y / 22 - t * 0.7);
              g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 8, 8);
            }
          });
          this.shoot = () => { flash(); beep(1200, 60); tell({ type: "note", text: "Photo taken. On the phone it is kept until the cover comes off." }); };
          return;
        }
        const sub = el("div", "sub", "starting the camera"), mine = entered;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
          if (mine !== entered) { stream.getTracks().forEach((t) => t.stop()); return; } // swiped away while it was starting
          const v = el("video"); v.playsInline = true; v.muted = true; v.srcObject = stream;
          await v.play();
          sub.remove();
          cleanup.push(() => stream.getTracks().forEach((t) => t.stop()));
          this.shoot = () => {
            const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
            c.getContext("2d").drawImage(v, 0, 0);
            c.toBlob((blob) => { if (blob) db.add(blob).catch(() => {}); }, "image/jpeg", 0.9);
            flash(); beep(1200, 60);
          };
        } catch (e) { sub.textContent = "the camera is not allowed"; this.shoot = null; }
      },
      tap() { if (this.shoot) this.shoot(); },
      exit() { this.shoot = null; },
    },
    {
      name: "Compass",
      enter() {
        const size = Math.min(W, H) * 0.62;
        app.insertAdjacentHTML("beforeend", `<svg id="needle" viewBox="-50 -50 100 100" width="${size}" height="${size}" style="margin-bottom:10px"><circle r="46" fill="none" stroke="#fff" stroke-width="1.5" opacity=".35"/><path d="M0 -40L13 14L0 6L-13 14z" fill="#fff"/></svg>`);
        const needle = $("needle"), sub = el("div", "sub");
        if (!DEMO && navigator.geolocation && st.place && st.place.lat != null) {
          const id = navigator.geolocation.watchPosition((p) => { here = { lat: p.coords.latitude, lon: p.coords.longitude }; }, () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
          cleanup.push(() => navigator.geolocation.clearWatch(id));
        }
        every(120, () => {
          let bearing = 0, label = "north";
          if (DEMO) { heading = (Date.now() / 60) % 360; bearing = 70; label = "Home, 1.2 km"; }
          else if (st.place && st.place.lat != null && here) {
            const R = Math.PI / 180, dLon = (st.place.lon - here.lon) * R, a = here.lat * R, b = st.place.lat * R;
            bearing = (Math.atan2(Math.sin(dLon) * Math.cos(b), Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(dLon)) / R + 360) % 360;
            const d = 6371000 * 2 * Math.asin(Math.sqrt(Math.sin((b - a) / 2) ** 2 + Math.cos(a) * Math.cos(b) * Math.sin(dLon / 2) ** 2));
            label = d < 30 ? "you are here" : (st.place.name || "back") + ", " + (d < 950 ? Math.round(d / 10) * 10 + " m" : (d / 1000).toFixed(1) + " km");
          } else if (st.place && st.place.lat != null) label = "finding you";
          needle.style.transform = `rotate(${bearing - (heading || 0)}deg)`;
          sub.textContent = heading == null ? "no compass on this device" : label;
        });
      },
    },
    {
      name: "Steps",
      enter() {
        const lines = st.steps.split(/\n+/).map((s) => s.trim()).filter(Boolean);
        const box = el("div", "step"), sub = el("div", "sub");
        this.show = () => {
          if (!lines.length) { box.textContent = "Add your steps with the cover off"; box.style.fontSize = "14px"; return; }
          stepAt = Math.max(0, Math.min(lines.length - 1, stepAt));
          box.textContent = lines[stepAt];
          sub.textContent = stepAt + 1 + " of " + lines.length;
          let size = Math.min(H * 0.3, 34);
          box.style.fontSize = size + "px";
          while (size > 11 && (box.scrollHeight > H - 4 || box.scrollWidth > W)) { size -= 1; box.style.fontSize = size + "px"; }
        };
        this.show();
      },
      // the left third goes back, the rest goes on
      tap(x) { stepAt += x < W / 3 ? -1 : 1; this.show(); beep(520, 40, 0.05); },
    },
    {
      name: "Face",
      // It dozes off when the phone lies still and wakes when it is picked up.
      enter() {
        const size = Math.min(W, H) * 0.8;
        app.insertAdjacentHTML("beforeend", `<svg viewBox="-50 -32 100 64" width="${size * 1.5}" height="${size}" fill="#fff" stroke="#fff" stroke-linecap="round"><g id="eyes"><ellipse id="eyeL" cx="-20" cy="-6" rx="7" ry="9"/><ellipse id="eyeR" cx="20" cy="-6" rx="7" ry="9"/></g><path id="mouth" d="M-9 16Q0 20 9 16" fill="none" stroke-width="3"/></svg>`);
        const L = $("eyeL"), R = $("eyeR"), mouth = $("mouth");
        let happyUntil = 0, blinkUntil = 0;
        this.poke = () => { happyUntil = Date.now() + 1600; motionAt = Date.now(); beep(900, 80, 0.06); };
        every(100, () => {
          const now = Date.now(), asleep = now - motionAt > 12000, happy = now < happyUntil;
          if (!asleep && !happy && Math.random() < 0.02) blinkUntil = now + 160;
          const ry = asleep || now < blinkUntil ? 1 : happy ? 11 : 9;
          L.setAttribute("ry", ry); R.setAttribute("ry", ry);
          mouth.setAttribute("d", happy ? "M-14 12Q0 28 14 12" : asleep ? "M-4 17Q0 17 4 17" : "M-9 16Q0 20 9 16");
        });
      },
      tap() { this.poke(); tell({ type: "note", text: "It likes being tapped. Left alone for twelve seconds, it falls asleep." }); },
    },
  ];

  let current = 0;
  let entered = 0; // lets a slow start (the camera) notice that the window has moved on
  function stop() {
    entered++;
    if (APPS[current].exit) APPS[current].exit();
    timers.forEach(clearInterval); timers = [];
    cleanup.forEach((fn) => fn()); cleanup = [];
    app.innerHTML = ""; app.className = "";
  }
  function show(i) {
    stop();
    current = (i + APPS.length) % APPS.length;
    $("dots").innerHTML = APPS.map((_, n) => `<i class="${n === current ? "on" : ""}"></i>`).join("");
    APPS[current].enter();
    tell({ type: "app", name: APPS[current].name, index: current });
  }

  function place() {
    const r = rect(), win = $("win");
    // on the wide Pro window the Dynamic Island sits inside it: start the content below it
    const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat")) || 0;
    const top = r.w > window.innerWidth * 0.6 ? Math.max(r.y, safeTop) : r.y;
    win.style.left = r.x + "px"; win.style.top = top + "px";
    win.style.width = r.w + "px"; win.style.height = r.h - (top - r.y) + "px";
    win.style.borderRadius = (r.r || 12) + "px";
    W = r.w; H = r.h - (top - r.y);
  }

  // ---- touch inside the window ---------------------------------------------------------
  let down = null, holdTimer = null;
  $("win").addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, t: Date.now() };
    motionAt = Date.now();
    if (!DEMO) holdTimer = setTimeout(() => { down = null; leave(); }, 3000);
  });
  window.addEventListener("pointerup", (e) => {
    clearTimeout(holdTimer);
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, b = $("win").getBoundingClientRect();
    down = null;
    if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) return show(current + (dx < 0 ? 1 : -1));
    const a = APPS[current];
    if (a.tap) a.tap(e.clientX - b.left, e.clientY - b.top);
  });
  window.addEventListener("pointercancel", () => { clearTimeout(holdTimer); down = null; });

  // ---- sensors -------------------------------------------------------------------------------
  let lastAcc = null;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    if (lastAcc && Math.hypot(a.x - lastAcc.x, a.y - lastAcc.y, a.z - lastAcc.z) > 1.2) motionAt = Date.now();
    lastAcc = { x: a.x, y: a.y, z: a.z };
  }
  function onOrient(e) {
    if (e.webkitCompassHeading != null) heading = e.webkitCompassHeading;       // iPhone
    else if (e.absolute && e.alpha != null) heading = (360 - e.alpha) % 360;    // others
  }

  let wake = null;
  async function start() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") await audio.resume(); } catch (e) { audio = null; }
    // iPhones ask once, here, while the cover is still off
    try { if (window.DeviceMotionEvent && DeviceMotionEvent.requestPermission) await DeviceMotionEvent.requestPermission(); } catch (e) { /* the face just stays awake */ }
    try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) await DeviceOrientationEvent.requestPermission(); } catch (e) { /* no compass */ }
    try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) { wake = null; }
    window.addEventListener("devicemotion", onMotion);
    window.addEventListener("deviceorientation", onOrient);
    window.addEventListener("deviceorientationabsolute", onOrient);
    $("setup").hidden = true; $("stage").hidden = false;
    motionAt = Date.now();
    place(); show(0);
  }
  function leave() {
    stop(); // the camera and the timers of whatever was showing
    if (wake) { wake.release().catch(() => {}); wake = null; }
    window.removeEventListener("devicemotion", onMotion);
    $("stage").hidden = true; $("setup").hidden = false;
    drawSetup();
  }
  document.addEventListener("visibilitychange", async () => {
    if (!document.hidden && !$("stage").hidden && navigator.wakeLock) { try { wake = await navigator.wakeLock.request("screen"); } catch (e) { /* stays as is */ } }
  });
  window.addEventListener("resize", () => { if (!$("stage").hidden) { place(); show(current); } });

  // ---- fitting the window to a real case: trace the hole with a finger -----------------------
  function trace() {
    const box = $("trace"), text = $("tracetext");
    let pts = [], idle = null, found = null, holdT = null;
    $("setup").hidden = true; box.hidden = false;
    text.textContent = "Put the turned-around case on now. Then run a finger slowly round the inside edge of the opening, twice.";
    const finish = () => {
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
      if (pts.length < 40 || w < 40 || h < 40) { pts = []; text.textContent = "That was too short to measure. Run a finger right round the inside edge of the opening."; return; }
      // a fingertip's centre stays a few points inside the edge, so widen the box a little
      const grow = 6, model = PP.PHONES[st.model].win;
      found = { x: Math.max(0, x - grow), y: Math.max(0, y - grow), w: w + 2 * grow, h: h + 2 * grow, vw: window.innerWidth, vh: window.innerHeight };
      found.r = Math.min(found.w, found.h) * (model.r / Math.min(model.w, model.h));
      text.innerHTML = "";
      const lit = document.createElement("div");
      lit.style.cssText = `position:absolute;left:${found.x}px;top:${found.y}px;width:${found.w}px;height:${found.h}px;border-radius:${found.r}px;background:#fff;color:#000;display:flex;align-items:center;justify-content:center;font-size:12px;padding:6px`;
      lit.textContent = "Tap if the light fills the opening. Hold to try again.";
      lit.id = "lit"; box.append(lit);
    };
    const onDown = () => { if (found) holdT = setTimeout(() => { holdT = "fired"; $("lit").remove(); found = null; pts = []; text.textContent = "Run a finger slowly round the inside edge of the opening, twice."; }, 900); };
    const onMove = (e) => { if (found) return; pts.push({ x: e.clientX, y: e.clientY }); clearTimeout(idle); idle = setTimeout(finish, 1500); };
    const onUp = () => {
      if (holdT === "fired") { holdT = null; return; }
      clearTimeout(holdT);
      if (!found) return;
      st.traced = found; st.cover = "case"; save();
      box.removeEventListener("pointerdown", onDown); box.removeEventListener("pointermove", onMove); box.removeEventListener("pointerup", onUp);
      $("lit").remove(); box.hidden = true;
      start(); // the case is on, so go straight into the window
    };
    box.addEventListener("pointerdown", onDown); box.addEventListener("pointermove", onMove); box.addEventListener("pointerup", onUp);
  }

  // ---- setup screen -------------------------------------------------------------------------
  async function drawSetup() {
    document.querySelectorAll("#model button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === st.model)));
    document.querySelectorAll("#cover button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === st.cover)));
    $("fit").hidden = st.cover !== "case";
    const fitted = st.traced && Math.abs(st.traced.vw - window.innerWidth) < 2 && Math.abs(st.traced.vh - window.innerHeight) < 2;
    $("fitline").textContent = st.cover === "paper" ? "The window is where the printed sleeve has its opening."
      : fitted ? "The window is fitted to your case." : "Using my estimate of a case's camera opening. Fit it to yours for an exact match.";
    $("fit").textContent = fitted ? "Fit it again" : "Fit the window to my case";
    $("mins").textContent = st.minutes + " min";
    $("placeline").textContent = st.place && st.place.lat != null ? "The compass points back to the place you saved." : "No place saved, so the compass points north.";
    if (document.activeElement !== $("steps")) $("steps").value = st.steps;
    const standalone = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches;
    $("install").hidden = standalone;
    $("startline").textContent = "Press Start, then put the cover on. The phone may ask to use motion and the camera: answer now, while you can see the screen.";
    let photos = [];
    try { photos = await db.all(); } catch (e) { /* no storage */ }
    $("photoline").textContent = photos.length ? "Tap a photo to save or share it." : "None yet.";
    $("clearphotos").hidden = !photos.length;
    $("photos").innerHTML = "";
    photos.forEach((blob, i) => {
      const img = new Image(); img.src = URL.createObjectURL(blob); img.alt = "Photo " + (i + 1);
      img.addEventListener("click", async () => {
        const file = new File([blob], "window-photo-" + (i + 1) + ".jpg", { type: "image/jpeg" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch (e) { /* closed */ } }
        else { const a = document.createElement("a"); a.href = img.src; a.download = file.name; a.click(); }
      });
      $("photos").append(img);
    });
  }

  if (DEMO) {
    window.addEventListener("message", (e) => {
      if (e.source !== window.parent || !e.data || !e.data.paperphone) return;
      if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { audio = null; } }
      if (e.data.type === "next") show(current + 1);
      if (e.data.type === "prev") show(current - 1);
    });
    $("win").addEventListener("pointerdown", () => { if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { audio = null; } } });
    $("setup").hidden = true; $("stage").hidden = false; $("hint").hidden = true;
    place(); show(0);
    return;
  }

  // the safe area, as a number scripts can read
  const probe = document.createElement("style");
  probe.textContent = ":root{--sat:env(safe-area-inset-top)}";
  document.head.append(probe);

  const pick = (group, key) => $(group).addEventListener("click", (e) => { const v = e.target.dataset.v; if (!v) return; st[key] = v; save(); drawSetup(); });
  pick("model", "model"); pick("cover", "cover");
  $("fit").addEventListener("click", trace);
  $("less").addEventListener("click", () => { st.minutes = Math.max(5, st.minutes - 5); save(); drawSetup(); });
  $("more").addEventListener("click", () => { st.minutes = Math.min(90, st.minutes + 5); save(); drawSetup(); });
  $("steps").addEventListener("input", () => { st.steps = $("steps").value; stepAt = 0; save(); });
  $("place").addEventListener("click", () => {
    if (!navigator.geolocation) { $("placeline").textContent = "This device cannot tell where it is."; return; }
    $("placeline").textContent = "Finding where you are…";
    navigator.geolocation.getCurrentPosition(
      (p) => { st.place = { lat: p.coords.latitude, lon: p.coords.longitude, name: "back" }; save(); drawSetup(); },
      () => { $("placeline").textContent = "Location was not shared, so the compass will point north."; },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
  $("clearphotos").addEventListener("click", async () => { try { await db.clear(); } catch (e) { /* nothing to clear */ } drawSetup(); });
  $("start").addEventListener("click", start);
  drawSetup();
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
