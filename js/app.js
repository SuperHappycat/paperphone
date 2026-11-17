/* Paper Phone – page behaviour: state, editors, preview and printing. */
(function () {
  const PP = window.PP;
  const KEY = "paperphone.v1";
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

  const CLASSIC = [
    ["conversion_charts", "Conversion charts"], ["knots", "Knots"], ["italian_phrasebook", "Italian phrasebook"],
    ["sign_language", "Sign language"], ["multiplication_table", "Multiplication table"], ["recipe", "Recipe"],
    ["pigeon_origami", "Origami pigeon"], ["sudoku", "Sudoku (classic)"], ["maze", "Maze (classic)"],
    ["word_of_the_day", "Word of the day"], ["anagram", "Anagram"], ["riddle", "Riddle"], ["typography", "Typography"],
  ];
  const MADE = [["sudoku", "New sudoku"], ["maze", "New maze"], ["text", "Your own page"]];

  function defaults() {
    return {
      name: "", date: today(), paper: "A4", sheet: "booklet",
      win: { model: "iphone17pro" },
      tent: { meal: "Dinner", names: "", kids: false, question: "", game: "", last: null },
      env: Object.assign({ model: "a08", backTop: "contacts", backBottom: "calendar" }, PP.PHONES.a08),
      on: { contacts: true, calendar: true, tasks: true, photo: false, notes: true, weather: false, paperapp: true, maps: false, contactless: false },
      contacts: [], events: [], tasks: [], photo: "", notesText: "",
      weather: { query: "", place: "", lat: null, lon: null, unit: "C", data: null },
      paperapp: { kind: "sudoku", classic: false, seed: 1 + Math.floor(Math.random() * 1e9), title: "", text: "" },
      maps: { from: "", to: "", mode: "foot", route: null },
    };
  }
  function load() {
    const base = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved) merge(base, saved);
    } catch (e) { /* unreadable or blocked storage: start fresh */ }
    if (!/^\d{4}-\d\d-\d\d$/.test(base.date) || base.date < today()) base.date = today(); // a sheet for a past day is no use
    return base;
  }
  function merge(base, extra) {
    Object.keys(base).forEach((k) => {
      if (!(k in extra) || extra[k] == null) return;
      if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) && typeof extra[k] === "object" && !Array.isArray(extra[k])) merge(base[k], extra[k]);
      else if (Array.isArray(base[k]) === Array.isArray(extra[k])) base[k] = extra[k];
    });
  }
  let state = load();
  let saveWarned = false;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { if (!saveWarned) { saveWarned = true; say("main", "This browser is not saving your changes. Keep a backup file instead.", true); } }
  }

  const get = (path) => path.split(".").reduce((o, k) => o[k], state);
  function set(path, value) {
    const keys = path.split("."), last = keys.pop();
    keys.reduce((o, k) => o[k], state)[last] = value;
  }
  function say(where, message, isError) {
    const el = $(`[data-status="${where}"]`);
    el.textContent = message || "";
    el.classList.toggle("error", !!isError);
  }

  // ---- preview ---------------------------------------------------------------
  function render() {
    $("#pages").innerHTML = PP.renderPages(state).map((p, i) => `<figure class="page"><figcaption>${i ? "Back" : "Front"}</figcaption>${p}</figure>`).join("");
    const win = state.sheet === "window", tent = state.sheet === "tent", env = state.sheet === "envelope" || win;
    $("#pages").classList.toggle("two", state.on.maps && !env && !tent);
    $("#pages").classList.toggle("portrait", env);
    $(".controls").classList.toggle("is-envelope", env);
    $(".controls").classList.toggle("is-tent", tent || win);
    if (win) {
      const ws = PP.windowState(state), g = PP.envelopeFit(ws), w = ws.env.win;
      say("window", g.fits ? `Sleeve for the ${ws.env.name}. Window ${w.w} × ${w.h} mm; the size is my estimate of a case's camera opening.` : `Too large for one ${state.paper} sheet.`, !g.fits);
    }
    if (tent) {
      const g = PP.tentFit(state), n = g.people;
      say("tent", !g.fits ? `This phone is too large for a tent on one ${state.paper} sheet.` : n < 2 ? "Add at least two names." : `${n} people. Sized for the ${state.env.name}.`, !g.fits || n < 2);
    }
    $$("[data-sheet]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sheet === state.sheet)));
    $$("[data-when]").forEach((el) => { el.hidden = el.dataset.when !== state.sheet; });
    $("#pagesize").textContent = `@page { size: ${state.paper === "Letter" ? "letter" : "A4"} ${env ? "portrait" : "landscape"}; margin: 0; }`;
    if (env && !win) {
      const g = PP.envelopeFit(state), sc = PP.screenSize(state.env.diag, state.env.ratio);
      say("env", g.fits ? `Envelope ${Math.round(g.totalW)} × ${Math.round(g.totalH)} mm, screen ${sc.w.toFixed(1)} × ${sc.h.toFixed(1)} mm. Fits on ${state.paper}.` : `Too large for one ${state.paper} sheet.`, !g.fits);
    }
    hints();
  }
  function hints() {
    const count = (arr, key, max, word) => { const n = arr.filter((x) => x[key]).length; return n ? `${Math.min(n, max)} ${word}${n === 1 ? "" : "s"}${n > max ? `, ${n - max} left off` : ""}` : "none yet"; };
    const h = {
      contacts: count(state.contacts, "name", 7, "contact"),
      calendar: count(state.events, "title", 6, "event"),
      tasks: count(state.tasks, "title", 9, "task"),
      photo: state.photo ? "picture chosen" : "no picture yet",
      notes: state.notesText.trim() ? "with your text" : "blank dot grid",
      weather: state.weather.data && state.weather.data.date === state.date ? state.weather.place : "no forecast yet",
      paperapp: ((state.paperapp.classic ? CLASSIC : MADE).find((m) => m[0] === state.paperapp.kind) || ["", ""])[1],
      maps: state.maps.route ? `${state.maps.route.from} to ${state.maps.route.to}` : "no route yet",
      contactless: "cut marks for a card",
    };
    $$(".mod").forEach((m) => {
      const id = m.dataset.mod;
      $(".dot", m).setAttribute("aria-pressed", String(!!state.on[id]));
      $(".hint", m).textContent = state.sheet === "envelope" || state.on[id] ? h[id] : "not printed";
    });
    $$("[data-show]").forEach((el) => {
      const k = state.paperapp.classic ? "" : state.paperapp.kind;
      el.hidden = el.dataset.show === "puzzle" ? !(k === "sudoku" || k === "maze") : k !== "text";
    });
  }
  function changed() { save(); render(); }

  // ---- simple bound fields -----------------------------------------------------
  function fillFields() {
    $$("[data-bind]").forEach((el) => { const v = get(el.dataset.bind); el.value = v == null ? "" : v; });
    $$("[data-check]").forEach((el) => { el.checked = !!get(el.dataset.check); });
  }
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.check) {
      set(el.dataset.check, el.checked);
      if (el.dataset.check === "tent.kids") tentDefaults(true);
      return changed();
    }
    if (!el.dataset || !el.dataset.bind) return;
    const path = el.dataset.bind;
    set(path, el.type === "number" ? parseFloat(el.value) || 0 : el.value);
    if (path === "date" && !el.value) set("date", today());
    if (path === "env.model") {
      if (PP.PHONES[el.value]) Object.assign(state.env, PP.PHONES[el.value]);
      else state.env.name = "Custom phone";
      fillFields();
    } else if (/^env\.(h|w|t|diag|ratio|bezel)$/.test(path) && state.env.model !== "custom") {
      state.env.model = "custom"; state.env.name = "Custom phone"; // sizes were edited by hand
      $('[data-bind="env.model"]').value = "custom";
    }
    changed();
    if (el.dataset.bind === "date" || el.dataset.bind === "weather.unit") refreshWeather();
  });

  // ---- table tent ---------------------------------------------------------------
  /** Fills in a question and a game, and swaps out ones that do not suit children. */
  function tentDefaults(recheck) {
    const t = state.tent, kids = t.kids;
    const games = PP.TENT_GAMES.filter((g) => !kids || g.kid);
    const sel = $("[data-games]");
    sel.innerHTML = "";
    games.forEach((g) => sel.add(new Option(g.name, g.name)));
    if (!games.some((g) => g.name === t.game)) t.game = PP.tentPick("game", kids);
    sel.value = t.game;
    const known = PP.TENT_QUESTIONS.find((q) => q.t === t.question);
    if (!t.question || (recheck && kids && known && !known.kid)) {
      t.question = PP.tentPick("question", kids);
      $('[data-bind="tent.question"]').value = t.question;
    }
  }

  // ---- list editors --------------------------------------------------------------
  const LISTS = {
    contacts: { blank: () => ({ name: "", phone: "" }), fields: [["name", "Name", "text"], ["phone", "Phone number", "tel"]], noun: "contact" },
    events: { blank: () => ({ title: "", start: "09:00", end: "10:00" }), fields: [["title", "Event", "text"], ["start", "Starts", "time"], ["end", "Ends", "time"]], noun: "event" },
    tasks: { blank: () => ({ title: "", due: "" }), fields: [["title", "Task", "text"], ["due", "Due", "select"]], noun: "task" },
  };
  function drawList(name) {
    const def = LISTS[name], box = $(`[data-list="${name}"]`);
    box.innerHTML = "";
    state[name].forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "item item-" + name;
      def.fields.forEach(([key, label, type]) => {
        let input;
        if (type === "select") {
          input = document.createElement("select");
          [["", "No date"], ["Today", "Today"], ["Tomorrow", "Tomorrow"]].forEach(([v, t]) => input.add(new Option(t, v)));
        } else {
          input = document.createElement("input");
          input.type = type;
          input.placeholder = label;
        }
        input.setAttribute("aria-label", `${label}, ${def.noun} ${i + 1}`);
        input.value = item[key] || "";
        input.addEventListener("input", () => { item[key] = input.value; changed(); });
        row.append(input);
      });
      const del = document.createElement("button");
      del.type = "button"; del.className = "del"; del.textContent = "×";
      del.setAttribute("aria-label", `Remove ${def.noun} ${i + 1}`);
      del.addEventListener("click", () => { state[name].splice(i, 1); drawList(name); changed(); });
      row.append(del);
      box.append(row);
    });
  }
  function addTo(name, item) {
    state[name].push(item || LISTS[name].blank());
    drawList(name);
    changed();
    if (!item) { const inputs = $$(`[data-list="${name}"] .item:last-child input`); if (inputs[0]) inputs[0].focus(); }
  }

  // ---- paper app chooser -----------------------------------------------------------
  function drawApps() {
    const box = $(".apps");
    const tile = ([kind, label], made) =>
      `<label class="app-tile${made ? " made" : ""}"><input type="radio" name="paperapp" value="${made ? kind : "classic:" + kind}">` +
      (made ? `<span class="glyph" aria-hidden="true">${{ sudoku: "9", maze: "▚", text: "Aa" }[kind]}</span>` : `<img src="paperapps/${kind}.png" alt="" loading="lazy" width="64" height="100">`) +
      `<span>${label}</span></label>`;
    box.innerHTML = MADE.map((m) => tile(m, true)).join("") + CLASSIC.map((c) => tile(c, false)).join("");
    const current = (state.paperapp.classic ? "classic:" : "") + state.paperapp.kind;
    $$("input", box).forEach((r) => { r.checked = r.value === current; });
    box.onchange = (e) => {
      const v = e.target.value;
      state.paperapp.classic = v.startsWith("classic:");
      state.paperapp.kind = v.replace("classic:", "");
      changed();
    };
  }

  // ---- weather ------------------------------------------------------------------------
  async function refreshWeather() {
    const w = state.weather;
    if (w.lat == null) return;
    say("weather", "Getting the forecast…");
    try {
      w.data = await PP.fetchWeather(w.lat, w.lon, state.date, w.unit);
      say("weather", `Forecast for ${w.place} on ${PP.fmtLong(state.date)} is on the sheet.`);
    } catch (e) { w.data = null; say("weather", e.message, true); }
    changed();
  }
  async function weatherFind() {
    const q = (state.weather.query || "").trim();
    if (!q) return say("weather", "Type a town or city first.", true);
    say("weather", "Looking up " + q + "…");
    try { Object.assign(state.weather, await PP.findPlace(q)); }
    catch (e) { return say("weather", e.message, true); }
    state.on.weather = true;
    refreshWeather();
  }
  function weatherHere() {
    if (!navigator.geolocation) return say("weather", "This browser cannot share a location. Type a town instead.", true);
    say("weather", "Waiting for your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        Object.assign(state.weather, { place: "Where I am", lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3) });
        state.on.weather = true;
        refreshWeather();
      },
      () => say("weather", "Location was not shared. Type a town instead.", true),
      { timeout: 15000 }
    );
  }

  // ---- map -------------------------------------------------------------------------------
  async function route() {
    const m = state.maps;
    if (!m.from.trim() || !m.to.trim()) return say("maps", "Fill in both From and To.", true);
    say("maps", "Finding the route…");
    try {
      m.route = await PP.fetchRoute(m.from.trim(), m.to.trim(), m.mode);
      state.on.maps = true;
      say("maps", `${PP.fmtDist(m.route.distance)}, ${m.route.steps.length} steps. The map is on the back page.`);
    } catch (e) { say("maps", e.message, true); }
    changed();
  }

  // ---- files -------------------------------------------------------------------------------
  let imported = [];
  function drawImported() {
    const wrap = $(".imported"), q = $("input", wrap).value.trim().toLowerCase();
    wrap.hidden = !imported.length;
    const full = state.contacts.length >= 7;
    $("ul", wrap).innerHTML = imported
      .map((c, i) => [c, i]).filter(([c]) => !q || c.name.toLowerCase().includes(q)).slice(0, 40)
      .map(([c, i]) => `<li><button type="button" data-imp="${i}" ${full ? "disabled" : ""}>Add</button> <span>${escapeHtml(c.name)}</span> <small>${escapeHtml(c.phone)}</small></li>`).join("");
  }
  const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  $(".imported").addEventListener("input", drawImported);
  $(".imported").addEventListener("click", (e) => {
    const i = e.target.dataset.imp;
    if (i == null || state.contacts.length >= 7) return;
    addTo("contacts", { name: imported[i].name, phone: imported[i].phone });
    drawImported();
  });

  document.addEventListener("change", async (e) => {
    const el = e.target, kind = el.dataset && el.dataset.file, file = el.files && el.files[0];
    if (!kind || !file) return;
    try {
      if (kind === "photo") {
        state.photo = await PP.preparePhoto(file);
        state.on.photo = true;
        changed();
      } else {
        const textIn = await file.text();
        if (kind === "vcf") {
          imported = PP.parseVcf(textIn);
          drawImported();
          say("main", imported.length ? `${imported.length} contacts read. Pick the ones to print.` : "No contacts with a phone number were found in that file.", !imported.length);
        } else if (kind === "ics") {
          const found = PP.parseIcs(textIn, state.date);
          const fresh = found.filter((f) => !state.events.some((x) => x.title === f.title && x.start === f.start));
          state.events.push(...fresh);
          drawList("events");
          changed();
          say("main", found.length ? `${fresh.length} events added for ${PP.fmtLong(state.date)}.` : `That calendar has nothing on ${PP.fmtLong(state.date)}.`, !found.length);
        } else if (kind === "backup") {
          const data = JSON.parse(textIn);
          if (!data || typeof data !== "object" || !data.on) throw new Error("That is not a Paper Phone backup file.");
          state = defaults();
          merge(state, data);
          start();
          save();
          say("main", "Backup restored.");
        }
      }
    } catch (err) { say("main", err instanceof SyntaxError ? "That is not a Paper Phone backup file." : err.message, true); }
    el.value = "";
  });

  // ---- buttons -------------------------------------------------------------------------------
  const ACTIONS = {
    "add-contact": () => (state.contacts.length < 7 ? addTo("contacts") : say("main", "Seven contacts is the most that fit. Remove one first.", true)),
    "add-event": () => addTo("events"),
    "add-task": () => addTo("tasks"),
    "clear-photo": () => { state.photo = ""; changed(); },
    "tent-question": () => {
      state.tent.question = PP.tentPick("question", state.tent.kids, state.tent.question);
      $('[data-bind="tent.question"]').value = state.tent.question;
      changed();
    },
    "new-puzzle": () => { state.paperapp.seed = 1 + Math.floor(Math.random() * 1e9); changed(); },
    "weather-find": weatherFind,
    "weather-here": weatherHere,
    route,
    fold: () => $("#fold").showModal(),
    print: () => {
      const old = document.title;
      document.title = state.sheet === "window" ? `Paper window - ${PP.windowState(state).env.name}` : state.sheet === "tent" ? `Table tent - ${state.tent.meal || "Dinner"} ${state.date}` : state.sheet === "envelope" ? `Envelope - ${state.env.name}` : `${state.name.trim() || "My"} Paper Phone - ${state.date}`; // becomes the PDF file name
      window.print();
      document.title = old;
    },
    backup: () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 1)], { type: "application/json" }));
      a.download = "paper-phone-backup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    reset: () => {
      if (!$("#reset").open) $("#reset").showModal();
    },
    "reset-yes": () => { state = defaults(); imported = []; start(); save(); say("main", "Cleared. This is a fresh sheet."); },
    "pick-contact": async () => {
      try {
        const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
        picked.forEach((p) => { if (state.contacts.length < 7 && p.tel && p.tel[0]) state.contacts.push({ name: (p.name && p.name[0]) || "", phone: p.tel[0] }); });
        drawList("contacts");
        changed();
      } catch (e) { /* the person closed the picker */ }
    },
  };
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.sheet) { state.sheet = btn.dataset.sheet; changed(); }
    else if (btn.dataset.act && ACTIONS[btn.dataset.act]) ACTIONS[btn.dataset.act]();
    else if (btn.classList.contains("dot")) {
      const id = btn.closest(".mod").dataset.mod;
      state.on[id] = !state.on[id];
      changed();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target.dataset) return;
    if (e.target.dataset.bind === "weather.query") weatherFind();
    if (e.target.dataset.bind === "maps.to") route();
  });

  // ---- start ------------------------------------------------------------------------------------
  function start() {
    $$("[data-panels]").forEach((sel) => {
      sel.innerHTML = "";
      [["contacts", "Contacts"], ["calendar", "Calendar"], ["tasks", "Tasks"], ["notes", "Notes"], ["weather", "Weather"], ["photo", "Photo"], ["paperapp", "Paper app"], ["", "Leave blank"]]
        .forEach(([v, t]) => sel.add(new Option(t, v)));
    });
    // the tent page on this same phone leaves the length of the last meal here
    try { const last = JSON.parse(localStorage.getItem("paperphone.tent.last") || "null"); if (last && last.minutes) state.tent.last = last; } catch (e) { /* none */ }
    tentDefaults(false);
    fillFields();
    Object.keys(LISTS).forEach(drawList);
    drawApps();
    drawImported();
    render();
  }
  const style = document.createElement("style");
  style.id = "pagesize";
  document.head.append(style);
  if (navigator.contacts && navigator.contacts.select) $('[data-act="pick-contact"]').hidden = false;
  start();
  // the first render may have measured text with fallback fonts
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load("12px Varela"), document.fonts.load("12px 'Work Sans'")]).then(render, () => {});
  }
  // a saved forecast for another day is stale: fetch the right one
  if (state.on.weather && state.weather.lat != null && !(state.weather.data && state.weather.data.date === state.date)) refreshWeather();
})();
