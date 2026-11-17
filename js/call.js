/* Paper Phone – the keypad that glows through the envelope. */
(function () {
  const PP = window.PP;
  const pad = document.getElementById("pad"), cover = document.getElementById("cover"), stat = document.getElementById("stat");
  const USAGE = "paperphone.envelope.usage";
  // demo.html shows this page inside a drawn phone: no full screen, no real call
  const DEMO = /[?&]demo=1/.test(location.search);
  const tell = (msg) => { if (DEMO && window.parent !== window) window.parent.postMessage(Object.assign({ paperphone: true }, msg), "*"); };
  let number = "", running = false, startedAt = 0, audio = null, wake = null, busy = false;

  // ---- sound: real DTMF pairs --------------------------------------------------
  const ROW = [697, 770, 852, 941], COL = [1209, 1336, 1477];
  function tone(freqs, ms) {
    if (!audio) return;
    const gain = audio.createGain(), now = audio.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
    gain.connect(audio.destination);
    freqs.forEach((hz) => { const o = audio.createOscillator(); o.frequency.value = hz; o.connect(gain); o.start(now); o.stop(now + ms / 1000 + 0.02); });
  }
  function dtmf(label) {
    const i = "123456789*0#".indexOf(label);
    if (i >= 0) tone([ROW[Math.floor(i / 3)], COL[i % 3]], 160);
  }

  // ---- keys ------------------------------------------------------------------------
  const els = {};
  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    PP.keypad(w, h).forEach((k) => {
      let el = els[k.id];
      if (!el) {
        el = els[k.id] = document.createElement("button");
        el.type = "button"; el.className = "key"; el.dataset.id = k.id;
        el.setAttribute("aria-label", k.id === "call" ? "Call (hold to clear the number)" : k.id === "clock" ? "Flash the time" : k.id === "*" ? "Star" : k.id === "#" ? "Hash" : k.label);
        pad.append(el);
      }
      el.style.left = k.x + "px"; el.style.top = k.y + "px";
      el.style.width = el.style.height = k.r * 2 + "px";
    });
  }
  function flash(id, ms) {
    const el = els[id];
    el.classList.add("lit");
    setTimeout(() => el.classList.remove("lit"), ms || 180);
  }
  function setNumber(n) {
    number = n;
    tell({ type: "number", number });
    els.call.classList.toggle("ready", number.length >= 3);
  }

  let holdTimer = null, held = false;
  pad.addEventListener("pointerdown", (e) => {
    const id = e.target.dataset && e.target.dataset.id;
    if (!id || busy) return;
    if (DEMO && !audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (err) { audio = null; } }
    if (id === "call") {
      held = false;
      holdTimer = setTimeout(() => { held = true; setNumber(""); tone([300], 350); flash("call", 400); }, 650);
    } else if (id === "clock") showTime();
    else { flash(id); dtmf(id); if (number.length < 20) setNumber(number + id); }
  });
  const endHold = (e) => {
    if (holdTimer == null) return;
    clearTimeout(holdTimer); holdTimer = null;
    if (e.type === "pointerup" && !held && e.target.dataset.id === "call") call();
  };
  pad.addEventListener("pointerup", endHold);
  pad.addEventListener("pointercancel", endHold);
  pad.addEventListener("contextmenu", (e) => e.preventDefault());

  function call() {
    if (number.length < 3) { tone([200], 200); tell({ type: "short" }); return; }
    flash("call", 500);
    const dial = number;
    setNumber("");
    if (DEMO) return tell({ type: "call", number: dial });
    window.location.href = "tel:" + encodeURIComponent(dial).replace(/%2A/gi, "*");
  }

  function showTime() {
    busy = true;
    const d = new Date(), digits = String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
    els.clock.classList.add("lit");
    digits.split("").forEach((ch, i) => {
      // a longer pause between the hours and the minutes
      setTimeout(() => { flash(ch, 420); tone([i < 2 ? 660 : 880], 200); }, 400 + i * 750 + (i > 1 ? 500 : 0));
    });
    setTimeout(() => { els.clock.classList.remove("lit"); busy = false; }, 400 + 4 * 750 + 700);
  }

  // ---- time spent in the envelope ----------------------------------------------------
  const todayKey = () => new Date().toDateString();
  function usedMs() {
    try { const u = JSON.parse(localStorage.getItem(USAGE) || "{}"); return u.day === todayKey() ? u.ms || 0 : 0; } catch (e) { return 0; }
  }
  function bank() {
    if (!startedAt) return;
    const total = usedMs() + (Date.now() - startedAt);
    startedAt = 0;
    try { localStorage.setItem(USAGE, JSON.stringify({ day: todayKey(), ms: total })); } catch (e) { /* not saved, not fatal */ }
  }
  function usageLine() {
    const mins = Math.round(usedMs() / 60000);
    return mins < 1 ? "" : `You used the envelope for ${mins >= 60 ? Math.floor(mins / 60) + " h " + (mins % 60) + " min" : mins + " min"} today.`;
  }

  // ---- start, pause, exit ------------------------------------------------------------
  async function start() {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") await audio.resume(); } catch (e) { audio = null; }
    const root = document.documentElement;
    try { await (root.requestFullscreen ? root.requestFullscreen({ navigationUI: "hide" }) : root.webkitRequestFullscreen && root.webkitRequestFullscreen()); } catch (e) { /* layout still works, slightly offset */ }
    try { if (navigator.wakeLock) wake = await navigator.wakeLock.request("screen"); } catch (e) { wake = null; }
    running = true; startedAt = Date.now();
    cover.hidden = true;
    layout();
  }
  function pause(resume) {
    if (!running) return;
    running = false; bank();
    if (wake) { wake.release().catch(() => {}); wake = null; }
    cover.classList.toggle("resume", !!resume);
    document.getElementById("heading").textContent = resume ? "Tap to continue" : "Envelope keypad";
    document.getElementById("start").textContent = resume ? "Continue" : "Start";
    stat.textContent = usageLine();
    cover.hidden = false;
  }

  if (DEMO) {
    document.documentElement.classList.add("demo");
    cover.hidden = true;
    window.addEventListener("resize", layout);
    layout();
    return;
  }

  const exit = document.createElement("button");
  exit.id = "exit"; exit.type = "button"; exit.textContent = "×"; exit.setAttribute("aria-label", "Leave the keypad");
  exit.addEventListener("click", () => { pause(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); });
  pad.append(exit);

  document.getElementById("start").addEventListener("click", start);
  // in the envelope the whole white screen is the Continue button
  cover.addEventListener("click", (e) => { if (cover.classList.contains("resume") && e.target.id !== "start") start(); });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) pause(true); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(true); });
  window.addEventListener("pagehide", bank);
  window.addEventListener("resize", layout);
  layout();
  stat.textContent = usageLine();
})();
