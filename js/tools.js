/* Paper Phone – puzzles, file importers and online lookups. */
(function () {
  const PP = (window.PP = window.PP || {});

  // ---- seeded random numbers, so a puzzle stays the same until you ask for a new one
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---- sudoku ------------------------------------------------------------
  function allowed(g, i, v) {
    const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3);
    for (let k = 0; k < 9; k++) {
      if (g[r * 9 + k] === v || g[k * 9 + c] === v) return false;
      if (g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === v) return false;
    }
    return true;
  }
  function fill(g, rand) {
    const i = g.indexOf(0);
    if (i < 0) return true;
    for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rand)) {
      if (allowed(g, i, v)) {
        g[i] = v;
        if (fill(g, rand)) return true;
        g[i] = 0;
      }
    }
    return false;
  }
  function countSolutions(g, limit) {
    // pick the emptiest-choice cell first to keep the search short
    let best = -1, bestOpts = null;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const opts = [];
      for (let v = 1; v <= 9; v++) if (allowed(g, i, v)) opts.push(v);
      if (!opts.length) return 0;
      if (!bestOpts || opts.length < bestOpts.length) { best = i; bestOpts = opts; }
    }
    if (best < 0) return 1;
    let n = 0;
    for (const v of bestOpts) {
      g[best] = v;
      n += countSolutions(g, limit - n);
      g[best] = 0;
      if (n >= limit) break;
    }
    return n;
  }
  const sudokuCache = {};
  PP.makeSudoku = function (seed) {
    if (sudokuCache[seed]) return sudokuCache[seed];
    const rand = rng(seed), g = new Array(81).fill(0);
    fill(g, rand);
    let removed = 0;
    for (const i of shuffle([...Array(81).keys()], rand)) {
      if (removed >= 47) break;
      const keep = g[i];
      g[i] = 0;
      if (countSolutions(g.slice(), 2) === 1) removed++;
      else g[i] = keep;
    }
    return (sudokuCache[seed] = g);
  };

  // ---- maze (depth-first carve) ----------------------------------------------
  PP.makeMaze = function (cols, rows, seed) {
    const rand = rng(seed), n = cols * rows;
    const right = new Array(n).fill(true), down = new Array(n).fill(true), seen = new Array(n).fill(false);
    const stack = [0];
    seen[0] = true;
    while (stack.length) {
      const i = stack[stack.length - 1], x = i % cols, y = Math.floor(i / cols);
      const next = [];
      if (x > 0 && !seen[i - 1]) next.push(i - 1);
      if (x < cols - 1 && !seen[i + 1]) next.push(i + 1);
      if (y > 0 && !seen[i - cols]) next.push(i - cols);
      if (y < rows - 1 && !seen[i + cols]) next.push(i + cols);
      if (!next.length) { stack.pop(); continue; }
      const j = next[Math.floor(rand() * next.length)];
      if (j === i + 1) right[i] = false;
      else if (j === i - 1) right[j] = false;
      else if (j === i + cols) down[i] = false;
      else down[j] = false;
      seen[j] = true;
      stack.push(j);
    }
    return { right, down };
  };

  // ---- vCard (.vcf) ------------------------------------------------------
  const unfold = (t) => t.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "");
  const unescapeText = (v) => v.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1");
  PP.parseVcf = function (textIn) {
    const out = [];
    let cur = null;
    unfold(textIn).split("\n").forEach((line) => {
      const m = line.match(/^([^:]+):(.*)$/);
      if (!m) return;
      const key = m[1].toUpperCase().replace(/^[^.]+\./, ""), val = m[2].trim();
      const prop = key.split(";")[0];
      if (prop === "BEGIN" && /VCARD/i.test(val)) cur = { name: "", phone: "" };
      else if (!cur) return;
      else if (prop === "FN") cur.name = unescapeText(val);
      else if (prop === "N" && !cur.name) cur.name = unescapeText(val.split(";").slice(0, 2).reverse().join(" ").trim());
      else if (prop === "TEL" && !cur.phone) cur.phone = val.replace(/^tel:/i, "");
      else if (prop === "END") { if (cur.name && cur.phone) out.push(cur); cur = null; }
    });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  };

  // ---- iCalendar (.ics) --------------------------------------------------
  function icsDate(v) {
    const m = v.match(/^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)?(Z)?)?/);
    if (!m) return null;
    if (!m[4]) return { d: new Date(+m[1], m[2] - 1, +m[3]), allDay: true };
    const d = m[7] ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]);
    return { d, allDay: false };
  }
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const dayNum = (d) => Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime() / 864e5);
  function recursOn(start, rrule, day) {
    const r = {};
    rrule.split(";").forEach((p) => { const [k, v] = p.split("="); r[k] = v; });
    if (dayNum(day) < dayNum(start)) return false;
    if (r.UNTIL) { const u = icsDate(r.UNTIL); if (u && dayNum(day) > dayNum(u.d)) return false; }
    const every = +r.INTERVAL || 1, gap = dayNum(day) - dayNum(start);
    if (r.COUNT && r.FREQ === "DAILY" && gap / every >= +r.COUNT) return false;
    if (r.FREQ === "DAILY") return gap % every === 0;
    if (r.FREQ === "WEEKLY") {
      const names = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      const days = r.BYDAY ? r.BYDAY.split(",") : [names[start.getDay()]];
      const weeks = Math.floor((gap + start.getDay()) / 7);
      return days.includes(names[day.getDay()]) && weeks % every === 0;
    }
    if (r.FREQ === "MONTHLY") return !r.BYDAY && day.getDate() === start.getDate();
    if (r.FREQ === "YEARLY") return day.getDate() === start.getDate() && day.getMonth() === start.getMonth();
    return false;
  }
  const hhmm = (d) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  /** Events from an .ics file that fall on the given ISO date. */
  PP.parseIcs = function (textIn, isoDate) {
    const day = new Date(isoDate + "T12:00:00"), out = [];
    let cur = null;
    unfold(textIn).split("\n").forEach((line) => {
      const m = line.match(/^([^:]+):(.*)$/);
      if (!m) return;
      const prop = m[1].split(";")[0].toUpperCase(), val = m[2].trim();
      if (prop === "BEGIN" && val === "VEVENT") cur = {};
      else if (!cur) return;
      else if (prop === "SUMMARY") cur.title = unescapeText(val);
      else if (prop === "DTSTART") cur.start = icsDate(val);
      else if (prop === "DTEND") cur.end = icsDate(val);
      else if (prop === "RRULE") cur.rrule = val;
      else if (prop === "STATUS" && val === "CANCELLED") cur.cancelled = true;
      else if (prop === "END" && val === "VEVENT") {
        const e = cur;
        cur = null;
        if (!e.start || !e.title || e.cancelled) return;
        let hit = sameDay(e.start.d, day);
        if (!hit && e.start.allDay && e.end && !e.rrule) hit = dayNum(day) > dayNum(e.start.d) && dayNum(day) < dayNum(e.end.d);
        if (!hit && e.rrule) hit = recursOn(e.start.d, e.rrule, day);
        if (!hit) return;
        out.push({ title: e.title, start: e.start.allDay ? "" : hhmm(e.start.d), end: e.start.allDay || !e.end ? "" : hhmm(e.end.d) });
      }
    });
    return out.sort((a, b) => a.start.localeCompare(b.start));
  };

  // ---- online lookups (all free, no key or account) --------------------------
  async function getJson(url) {
    let res;
    try { res = await fetch(url, { headers: { Accept: "application/json" } }); }
    catch (e) { throw new Error("Could not reach the service. Check your internet connection."); }
    if (!res.ok) throw new Error("The service answered with an error (" + res.status + "). Try again in a minute.");
    return res.json();
  }

  PP.findPlace = async function (query) {
    const j = await getJson("https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=" + encodeURIComponent(query));
    if (!j.results || !j.results.length) throw new Error('No place called "' + query + '" was found. Try the nearest city.');
    const p = j.results[0];
    return { place: [p.name, p.admin1, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", "), lat: p.latitude, lon: p.longitude };
  };

  PP.fetchWeather = async function (lat, lon, isoDate, unit) {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&hourly=temperature_2m,weather_code&timezone=auto&start_date=" + isoDate + "&end_date=" + isoDate +
      (unit === "F" ? "&temperature_unit=fahrenheit" : "");
    let j;
    try { j = await getJson(url); }
    catch (e) { throw new Error(/\(400\)/.test(e.message) ? "No forecast for that date. Forecasts reach about two weeks ahead." : e.message); }
    const pick = (h, label) => ({ label, temp: j.hourly.temperature_2m[h], code: j.hourly.weather_code[h] });
    const slots = [pick(9, "MORNING"), pick(13, "AFTERNOON"), pick(18, "EVENING")].filter((s) => s.temp != null);
    if (!slots.length) throw new Error("No forecast for that date. Forecasts reach about two weeks ahead.");
    return { date: isoDate, slots };
  };

  async function geocode(query) {
    const j = await getJson("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(query));
    if (!j.length) throw new Error('"' + query + '" was not found. Add the city or try a nearby landmark.');
    return { lat: +j[0].lat, lon: +j[0].lon, name: (j[0].name || j[0].display_name.split(",")[0]).trim() };
  }

  function stepText(st) {
    const m = st.maneuver || {}, name = st.name ? " onto " + st.name : "", on = st.name ? " on " + st.name : "";
    const dir = m.modifier || "";
    switch (m.type) {
      case "depart": return "Set off" + on;
      case "arrive": return "Arrive at your destination";
      case "turn": return dir === "straight" ? "Go straight" + on : dir === "uturn" ? "Make a U-turn" + name : "Turn " + dir + name;
      case "new name": case "continue": return "Continue" + on;
      case "roundabout": case "rotary": return "At the roundabout take exit " + (m.exit || "") + name;
      case "exit roundabout": case "exit rotary": return "Leave the roundabout" + name;
      case "fork": return "Keep " + (dir.replace("slight ", "") || "ahead") + " at the fork" + name;
      case "end of road": return "At the end of the road turn " + dir + name;
      case "merge": return "Merge " + dir + name;
      case "on ramp": case "off ramp": return "Take the ramp" + name;
      default: return (dir ? "Go " + dir : "Continue") + on;
    }
  }

  PP.fetchRoute = async function (fromText, toText, mode) {
    const a = await geocode(fromText);
    const b = await geocode(toText);
    const url = "https://routing.openstreetmap.de/routed-" + mode + "/route/v1/driving/" +
      a.lon + "," + a.lat + ";" + b.lon + "," + b.lat + "?overview=full&geometries=geojson&steps=true";
    const j = await getJson(url);
    if (j.code !== "Ok" || !j.routes || !j.routes.length) throw new Error("No route was found between those two places.");
    const r = j.routes[0];
    let coords = r.geometry.coordinates;
    const skip = Math.ceil(coords.length / 500);
    if (skip > 1) coords = coords.filter((c, i) => i % skip === 0 || i === coords.length - 1);
    const steps = [];
    r.legs.forEach((leg) => leg.steps.forEach((st) => {
      const t = stepText(st), last = steps[steps.length - 1];
      if (last && last.text === t) last.dist += st.distance; // merge repeats of the same instruction
      else steps.push({ text: t, dist: st.maneuver.type === "arrive" ? 0 : st.distance });
    }));
    return { from: a.name, to: b.name, mode, distance: r.distance, duration: r.duration, coords: coords.map((c) => [+c[0].toFixed(5), +c[1].toFixed(5)]), steps };
  };

  /** Turns a picked image file into a greyscale, portrait JPEG data URL sized for one panel. */
  PP.preparePhoto = function (file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onerror = () => reject(new Error("That file could not be read as a picture."));
      img.onload = () => {
        const landscape = img.width > img.height;
        const sw = landscape ? img.height : img.width, sh = landscape ? img.width : img.height;
        const scale = Math.min(1, 616 / sw, 968 / sh);
        const c = document.createElement("canvas");
        c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
        const g = c.getContext("2d");
        g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
        if (landscape) { g.translate(0, c.height); g.rotate(-Math.PI / 2); g.drawImage(img, 0, 0, c.height, c.width); }
        else g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const px = g.getImageData(0, 0, c.width, c.height), d = px.data;
        for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        g.putImageData(px, 0, 0);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = url;
    });
  };
})();
