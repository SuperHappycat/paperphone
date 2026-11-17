/* Paper Phone – the phone under the table tent.
 * It lights the circles printed on the tent, picks who is next, counts the meal
 * in five-minute dots, and ends the meal when a phone is picked up. */
(function () {
  const PP = window.PP;
  const $ = (id) => document.getElementById(id);
  const lights = $("lights"), cover = $("cover");
  const FIVE_MIN = /[?&]fast=1/.test(location.search) ? 3000 : 5 * 60 * 1000; // ?fast=1 is for trying it out
  // tent-demo.html shows this page inside a drawn phone: no full screen, no sensors, nothing saved
  const DEMO = /[?&]demo=1/.test(location.search);
  const tell = (msg) => { if (DEMO && window.parent !== window) window.parent.postMessage(Object.assign({ paperphone: true }, msg), "*"); };
  const LAST = "paperphone.tent.last";

  let people = Math.max(2, Math.min(8, parseInt((location.hash.match(/n=(\d+)/) || [])[1], 10) || 4));
  let stage = "intro"; // intro -> checks -> meal -> done
  let startedAt = 0, audio = null, wake = null, spinning = false, ticker = null, rest = null, moved = 0;
  const els = {};

  // ---- layout: the same fractions of the screen as the printed tent -----------------
  function layout() {
    // The phone lies with its top end at the tent's left, so the long side of the tent
    // is the phone's height, and the tent's near edge is the phone's left edge.
    const w = window.innerWidth, h = window.innerHeight, upright = h >= w;
    const long = upright ? h : w, short = upright ? w : h;
    lights.innerHTML = "";
    PP.tentLayout(people, long, short).forEach((k) => {
      if (k.id === "call") return; // a web page cannot see calls; the Android app lights this one
      const el = (els[k.id] = document.createElement("div"));
      el.className = "light" + (k.id[0] === "t" ? " dot" : "");
      el.dataset.id = k.id;
      el.style.left = (upright ? short - k.y : k.x) + "px";
      el.style.top = (upright ? k.x : k.y) + "px";
      el.style.width = el.style.height = k.r * 2 + "px";
      lights.append(el);
    });
    drawTrack();
  }

  function drawTrack() {
    if (stage !== "meal") return;
    const lit = Math.min(12, Math.floor((Date.now() - startedAt) / FIVE_MIN));
    if (DEMO && lit !== drawTrack.told) { drawTrack.told = lit; tell({ type: "dots", lit }); }
    for (let i = 0; i < 12; i++) if (els["t" + i]) els["t" + i].classList.toggle("on", i < lit);
  }

  // ---- sound ---------------------------------------------------------------------------
  function beep(hz, ms, vol) {
    if (!audio) return;
    const g = audio.createGain(), o = audio.createOscillator(), now = audio.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.1, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
    o.frequency.value = hz; o.connect(g); g.connect(audio.destination);
    o.start(now); o.stop(now + ms / 1000 + 0.02);
  }

  // ---- who's next: the light runs along the names and settles on one ------------------
  function spin() {
    if (spinning || stage !== "meal") return;
    if (DEMO && !audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { audio = null; } }
    spinning = true;
    const target = Math.floor(Math.random() * people), hops = people * 2 + target + 1;
    let i = -1, delay = 70;
    const clear = () => { for (let p = 0; p < people; p++) els["p" + p].classList.remove("on"); };
    els.next.classList.add("on");
    (function hop() {
      i++;
      clear();
      els["p" + (i % people)].classList.add("on");
      beep(700, 40, 0.05);
      if (i + 1 < hops) { delay *= 1.13; setTimeout(hop, delay); return; }
      beep(1050, 260, 0.12);
      tell({ type: "picked", index: target });
      els.next.classList.remove("on");
      setTimeout(() => { clear(); spinning = false; }, 6000); // the chosen name stays lit for a while
    })();
  }

  lights.addEventListener("pointerdown", (e) => {
    const k = els.next;
    if (!k || stage !== "meal") return;
    const b = k.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
    if (Math.hypot(dx, dy) <= b.width * 0.75) spin(); // generous: the tap comes through paper
  });

  // ---- picked up? -----------------------------------------------------------------------
  function onMotion(e) {
    if (stage !== "meal" || Date.now() - startedAt < 8000) return; // time to lower the tent
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    if (!rest) { rest = { x: a.x, y: a.y, z: a.z }; return; }
    const d = Math.hypot(a.x - rest.x, a.y - rest.y, a.z - rest.z);
    // lying still, gravity reads the same each time; a lift or a tilt changes it
    moved = d > 2.5 ? moved + 1 : 0;
    if (moved >= 4) endMeal();
  }

  function endMeal() {
    if (stage !== "meal") return;
    stage = "done";
    clearInterval(ticker);
    if (DEMO) {
      beep(880, 180, 0.15); setTimeout(() => beep(660, 320, 0.15), 200);
      lights.innerHTML = "";
      // in the demo five minutes pass every three seconds, so report the pretend length
      return tell({ type: "end", minutes: Math.max(1, Math.round(((Date.now() - startedAt) / FIVE_MIN) * 5)) });
    }
    window.removeEventListener("devicemotion", onMotion);
    if (wake) { wake.release().catch(() => {}); wake = null; }
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    try { localStorage.setItem(LAST, JSON.stringify({ minutes, day: new Date().toDateString() })); } catch (e) { /* not saved */ }
    beep(880, 180, 0.15); setTimeout(() => beep(660, 320, 0.15), 200);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    cover.classList.add("done");
    $("heading").textContent = "The meal is over";
    $("intro").hidden = true; $("checks").hidden = true;
    $("result").hidden = false;
    $("result").textContent = `${minutes} ${minutes === 1 ? "minute" : "minutes"} at the table before a phone was picked up. If you print the next tent from this phone, it will say so.`;
    $("start").textContent = "Start another meal";
    cover.hidden = false;
  }

  // ---- setup ----------------------------------------------------------------------------
  async function acquire() {
    const got = { sound: true, full: true, awake: true, motion: true };
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") await audio.resume(); } catch (e) { audio = null; got.sound = false; }
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      try { await (root.requestFullscreen ? root.requestFullscreen({ navigationUI: "hide" }) : root.webkitRequestFullscreen()); } catch (e) { got.full = false; }
    }
    if (!wake || wake.released) {
      try { wake = navigator.wakeLock ? await navigator.wakeLock.request("screen") : null; } catch (e) { wake = null; }
      got.awake = !!wake;
    }
    try {
      if (typeof DeviceMotionEvent === "undefined") got.motion = false;
      else if (DeviceMotionEvent.requestPermission) got.motion = (await DeviceMotionEvent.requestPermission()) === "granted";
    } catch (e) { got.motion = false; }
    return got;
  }

  async function showChecks() {
    const got = await acquire();
    const rows = [
      ["todo", "On every phone going under the tent: switch on Do Not Disturb and allow calls from starred contacts. Important callers will still ring; nobody else will."],
      [got.full ? "" : "bad", got.full ? "Full screen is on, so the lights line up with the paper." : "Full screen was refused, so the lights will sit a little off the printed circles."],
      [got.awake ? "" : "bad", got.awake ? "The screen will stay on through the meal." : "The phone will not keep the screen on. Turn off battery saver, or set the screen timeout to its longest."],
      [got.motion ? "" : "bad", got.motion ? "The phone will notice when it is picked up." : "This phone will not report movement, so hold the “who’s next” circle for two seconds to end the meal."],
      [got.sound ? "" : "bad", got.sound ? "Sound is ready." : "Sound is blocked, so it will be silent."],
    ];
    $("checklist").innerHTML = rows.map((r) => `<li class="${r[0]}">${r[1]}</li>`).join("");
    $("heading").textContent = "Before the tent goes on";
    $("intro").hidden = true; $("checks").hidden = false; $("result").hidden = true;
    $("start").textContent = "Start the meal";
    stage = "checks";
  }

  async function startMeal() {
    await acquire();
    stage = "meal"; startedAt = Date.now(); rest = null; moved = 0;
    cover.classList.remove("done");
    cover.hidden = true;
    layout();
    window.addEventListener("devicemotion", onMotion);
    ticker = setInterval(drawTrack, 1000);
  }

  if (DEMO) {
    cover.hidden = true;
    const begin = () => { stage = "meal"; startedAt = Date.now(); drawTrack.told = -1; layout(); clearInterval(ticker); ticker = setInterval(drawTrack, 250); };
    window.addEventListener("message", (e) => {
      if (e.source !== window.parent || !e.data || !e.data.paperphone) return;
      if (e.data.type === "pickup") endMeal();
      if (e.data.type === "restart") begin();
    });
    window.addEventListener("resize", () => { if (stage === "meal") layout(); });
    begin();
    return;
  }

  $("start").addEventListener("click", () => {
    if (stage === "intro") showChecks();
    else if (stage === "checks") startMeal();
    else { stage = "intro"; cover.classList.remove("done"); $("heading").textContent = "Table tent"; $("intro").hidden = false; $("result").hidden = true; $("start").textContent = "Start"; }
  });
  const setPeople = (n) => { people = Math.max(2, Math.min(8, n)); $("people").textContent = people; };
  $("fewer").addEventListener("click", () => setPeople(people - 1));
  $("more").addEventListener("click", () => setPeople(people + 1));
  setPeople(people);

  // holding the "who's next" circle ends the meal, for phones without a motion sensor
  let holdTimer = null;
  lights.addEventListener("pointerdown", (e) => { if (e.target.dataset.id === "next") holdTimer = setTimeout(endMeal, 2000); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => lights.addEventListener(t, () => clearTimeout(holdTimer)));

  // leaving the page or full screen means the phone is in someone's hand
  document.addEventListener("visibilitychange", () => { if (document.hidden) endMeal(); });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && stage === "meal" && Date.now() - startedAt > 3000) endMeal(); });
  window.addEventListener("resize", () => { if (stage === "meal") layout(); });
})();
