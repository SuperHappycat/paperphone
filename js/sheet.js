/* Paper Phone – sheet renderer.
 * Draws the printable sheet as SVG, in PDF points (A4 landscape = 842 x 595),
 * using the same panel geometry as the original Android PdfGenerator.kt. */
(function () {
  const PP = (window.PP = window.PP || {});

  const PAGE_W = 842, PAGE_H = 595;
  const M = 28, P1 = 58, P2 = 54, W = 154, H = 242;
  const XS = [0, W + P1, 2 * W + P1 + P2, 3 * W + 2 * P1 + P2];
  const YS = [0, H + P1];
  const DISPLAY = "Varela, 'Noto Sans Thai', 'Leelawadee UI', Thonburi, sans-serif";
  const BODY = "'Work Sans', 'Noto Sans Thai', 'Leelawadee UI', Thonburi, sans-serif";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---- text measuring ------------------------------------------------------
  const ctx = document.createElement("canvas").getContext("2d");
  function width(text, font, size, ls) {
    ctx.font = size + "px " + font;
    return ctx.measureText(text).width + (ls || 0) * size * text.length;
  }
  function fit(text, font, size, ls, max) {
    text = String(text || "");
    if (width(text, font, size, ls) <= max) return text;
    while (text.length > 1 && width(text + "…", font, size, ls) > max) text = text.slice(0, -1);
    return text.trimEnd() + "…";
  }
  function wrap(text, font, size, max) {
    const out = [];
    String(text || "").split(/\r?\n/).forEach((para) => {
      let line = "";
      para.split(/\s+/).forEach((word) => {
        while (width(word, font, size) > max) {
          // a single word wider than the panel: break it by character
          let cut = word.length - 1;
          while (cut > 1 && width(word.slice(0, cut), font, size) > max) cut--;
          if (line) { out.push(line); line = ""; }
          out.push(word.slice(0, cut));
          word = word.slice(cut);
        }
        const next = line ? line + " " + word : word;
        if (width(next, font, size) > max) { out.push(line); line = word; } else line = next;
      });
      out.push(line);
    });
    return out;
  }

  // ---- drawing helpers -----------------------------------------------------
  function text(str, x, y, o) {
    o = o || {};
    const font = o.font || DISPLAY;
    return `<text x="${x}" y="${y}" font-family="${font}" font-size="${o.size || 9}"` +
      (o.ls ? ` letter-spacing="${o.ls}em"` : "") + (o.anchor ? ` text-anchor="${o.anchor}"` : "") +
      (o.fill ? ` fill="${o.fill}"` : "") + `>${esc(str)}</text>`;
  }
  const title = (t) => text(fit(t.toUpperCase(), DISPLAY, 11.33, 0.1, W), 0, 13.6, { size: 11.33, ls: 0.1 });
  const rule = (y) => `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#000" stroke-width=".5"/>`;
  function dots(y0, rows) {
    let s = "";
    for (let i = 0; i < rows; i++) for (let j = 0; j < 10; j++) s += `<circle cx="${j * 17}" cy="${y0 + i * 17}" r=".45"/>`;
    return s;
  }

  const fmtLong = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  PP.fmtLong = fmtLong;

  // ---- weather icons (19 x 19, stroked) -------------------------------------
  const cloud = (dy) => `<path d="M5 ${13 + dy}a3.2 3.2 0 0 1 .4-6.4 4.6 4.6 0 0 1 8.8 1.2 2.7 2.7 0 0 1 .3 5.2z"/>`;
  const ICONS = {
    sun: `<circle cx="9.5" cy="9.5" r="3.6"/><path d="M9.5 1.5v2.4M9.5 15.1v2.4M1.5 9.5h2.4M15.1 9.5h2.4M3.8 3.8l1.7 1.7M13.5 13.5l1.7 1.7M3.8 15.2l1.7-1.7M13.5 5.5l1.7-1.7"/>`,
    suncloud: `<circle cx="13" cy="6" r="2.6"/><path d="M13 1v1.2M18 6h-1.2M16.5 2.5l-.9.9"/>` + cloud(2),
    cloud: cloud(0),
    fog: cloud(-3) + `<path d="M3 13h13M5 15.5h9"/>`,
    rain: cloud(-2) + `<path d="M6 13.5l-1 3M9.5 13.5l-1 3M13 13.5l-1 3"/>`,
    snow: cloud(-2) + `<path d="M6 14.5v.1M9.5 16v.1M13 14.5v.1M7.7 17v.1M11.3 17v.1" stroke-width="1.6"/>`,
    thunder: cloud(-2) + `<path d="M10.5 12l-2.5 3h3l-2 3"/>`,
  };
  PP.describeWeather = function (code) {
    if (code === 0) return ["Clear sky", "sun"];
    if (code <= 2) return ["Partly cloudy", "suncloud"];
    if (code === 3) return ["Overcast", "cloud"];
    if (code <= 48) return ["Fog", "fog"];
    if (code <= 57) return ["Drizzle", "rain"];
    if (code <= 67) return ["Rain", "rain"];
    if (code <= 77) return ["Snow", "snow"];
    if (code <= 82) return ["Rain showers", "rain"];
    if (code <= 86) return ["Snow showers", "snow"];
    return ["Thunderstorm", "thunder"];
  };

  // ---- panels ---------------------------------------------------------------
  const panels = {
    front(s) {
      const name = (s.name || "").trim();
      const line1 = (!name ? "My" : /s$/i.test(name) ? name + "'" : name + "'s").toUpperCase();
      let size = 17.78;
      while (size > 8 && width(line1, DISPLAY, size, 0.1) > W) size -= 0.5;
      return text(line1, 0, 21.3, { size, ls: 0.1 }) + text("PHONE", 0, 42.7, { size: 17.78, ls: 0.1 }) +
        text(fmtLong(s.date), 0, H, { size: 9 });
    },
    contacts(s) {
      let out = title("Contacts");
      s.contacts.filter((c) => c.name || c.phone).slice(0, 7).forEach((c, i) => {
        const y = 32 * i + 32.6;
        out += text(fit((c.name || "").toUpperCase(), BODY, 7.31, 0.12, W), 0, y, { font: BODY, size: 7.31, ls: 0.12 });
        out += text(fit(c.phone || "", BODY, 7.31, 0.12, W), 0, y + 8, { font: BODY, size: 7.31, ls: 0.12 });
      });
      return out;
    },
    calendar(s) {
      let out = title("Calendar") + rule(33.6);
      const events = s.events.filter((e) => e.title).sort((a, b) => (a.start || "").localeCompare(b.start || ""));
      events.slice(0, 6).forEach((e, i) => {
        const y = 33.6 + 32 * i + 24;
        out += text(fit(e.title, DISPLAY, 9, 0, W), 0, y + 8, { size: 9 });
        const when = e.start ? e.start + (e.end ? " - " + e.end : "") : "All day";
        out += text(when, 0, y + 16 + 7.6 - 8, { font: BODY, size: 6.47, ls: 0.12 });
      });
      if (!events.length) out += text("Nothing planned", 0, 65.6, { size: 9 });
      return out;
    },
    tasks(s) {
      let out = title("Tasks"), y = 26.6;
      const ring = (yy) => `<circle cx="2.9" cy="${yy + 8.5}" r="2.9" fill="none" stroke="#000" stroke-width=".5"/>`;
      s.tasks.filter((t) => t.title).slice(0, 9).forEach((t) => {
        out += ring(y) + text(fit(t.title, DISPLAY, 9, 0, W - 16), 16, y + 10.8, { size: 9 });
        if (t.due) out += text(t.due, 16, y + 12.8 + 7.6, { font: BODY, size: 6.47 });
        y += 22.8;
      });
      for (let i = 0; i < 3 && y + 14 < H; i++, y += 20) out += ring(y); // spare rows to write in
      return out;
    },
    photo(s) {
      if (!s.photo) return dots(4, 15);
      return `<image href="${s.photo}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMin meet"/>`;
    },
    notes(s) {
      let out = title("Notes"), y = 38;
      if (s.notesText && s.notesText.trim()) {
        wrap(s.notesText.trim(), BODY, 8, W).slice(0, 14).forEach((l) => { out += text(l, 0, y, { font: BODY, size: 8 }); y += 11.5; });
        y = 38 + Math.ceil((y - 38 + 6) / 17) * 17;
      }
      return out + dots(y, Math.max(0, Math.floor((H - y) / 17) + 1));
    },
    weather(s) {
      const w = s.weather;
      let out = title("Weather");
      out += text(fit(w.place || "", BODY, 7.31, 0, W), 0, 32.4, { font: BODY, size: 7.31 });
      out += text(fmtLong(s.date), 0, 43.2, { font: BODY, size: 7.31 });
      let y = 84.4;
      if (!w.data || w.data.date !== s.date) return out + text("No forecast loaded", 0, y, { font: BODY, size: 7.31 });
      w.data.slots.forEach((slot) => {
        const [desc, icon] = PP.describeWeather(slot.code);
        out += text(slot.label, 0, y + 10.2, { size: 8.5, ls: 0.12 }) + rule(y + 14.2);
        out += `<g transform="translate(0 ${y + 20.2})" fill="none" stroke="#000" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g>`;
        out += text(Math.round(slot.temp) + "°", 26, y + 27.4, { size: 8.5, ls: 0.05 });
        out += text(desc, 26, y + 36.6, { font: BODY, size: 6 });
        y += 49.2;
      });
      return out;
    },
    paperapp(s) {
      const a = s.paperapp;
      if (a.classic) return `<image href="paperapps/${esc(a.kind)}.png" x="0" y="0" width="${W}" height="${H}"/>`;
      if (a.kind === "sudoku") return sudoku(a.seed);
      if (a.kind === "maze") return maze(a.seed);
      if (a.kind === "text") {
        let out = title(a.title || "My page"), y = 34;
        wrap(a.text || "", BODY, 8, W).slice(0, 19).forEach((l) => { out += text(l, 0, y, { font: BODY, size: 8 }); y += 11; });
        return out;
      }
      return `<image href="paperapps/${esc(a.kind)}.png" x="0" y="0" width="${W}" height="${H}"/>`;
    },
  };

  function sudoku(seed) {
    const g = PP.makeSudoku(seed), c = 17, y0 = 32;
    let out = title("Sudoku");
    for (let i = 0; i <= 9; i++) {
      const sw = i % 3 ? 0.4 : 1.2, p = i * c;
      out += `<line x1="${p}" y1="${y0}" x2="${p}" y2="${y0 + 9 * c}" stroke="#000" stroke-width="${sw}"/>` +
        `<line x1="0" y1="${y0 + p}" x2="${9 * c}" y2="${y0 + p}" stroke="#000" stroke-width="${sw}"/>`;
    }
    g.forEach((v, i) => { if (v) out += text(v, (i % 9) * c + c / 2, y0 + Math.floor(i / 9) * c + 12, { size: 9.5, anchor: "middle" }); });
    return out + text("Each row, column and box holds 1 to 9", 0, y0 + 9 * c + 14, { font: BODY, size: 6.47 });
  }

  function maze(seed) {
    const cols = 11, rows = 15, c = 14, y0 = 26;
    const m = PP.makeMaze(cols, rows, seed);
    let d = "";
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (m.right[i] && x < cols - 1) d += `M${(x + 1) * c} ${y0 + y * c}v${c}`;
      if (m.down[i] && y < rows - 1) d += `M${x * c} ${y0 + (y + 1) * c}h${c}`;
    }
    // outer wall with a gap top-left (start) and bottom-right (finish)
    d += `M${c} ${y0}H${cols * c}V${y0 + rows * c}M${(cols - 1) * c} ${y0 + rows * c}H0V${y0}`;
    return title("Maze") + `<path d="${d}" fill="none" stroke="#000" stroke-width=".9" stroke-linecap="square"/>`;
  }

  // ---- page 1: the phone ----------------------------------------------------
  const SLOTS = ["contacts", "calendar", "tasks", "photo", "notes", "front", "weather", "paperapp"];
  const ROTATED = { contacts: 1, calendar: 1 }; // these end up upside down after folding

  function ticks() {
    // small crease marks at the sheet edges, plus the two squares from the original design
    let s = "";
    [PAGE_W / 4, PAGE_W / 2, (3 * PAGE_W) / 4].forEach((x) => { s += `M${x} 0v7M${x} ${PAGE_H}v-7`; });
    s += `M0 ${PAGE_H / 2}h7M${PAGE_W} ${PAGE_H / 2}h-7`;
    return `<path d="${s}" stroke="#000" stroke-width=".4"/>` +
      `<rect x="${M + 601}" y="${M}" width="5" height="5"/><rect x="${M + 601}" y="${M + 537}" width="5" height="5"/>`;
  }

  function frontPage(s) {
    let body = "";
    SLOTS.forEach((id, i) => {
      const x = M + XS[i % 4], y = M + YS[i >> 2];
      const on = id === "front" || s.on[id];
      let inner;
      if (on) inner = panels[id](s);
      else inner = id === "paperapp" && s.on.contactless ? "" : dots(4, 15);
      const tf = ROTATED[id] ? `translate(${x + W} ${y + H}) rotate(180)` : `translate(${x} ${y})`;
      body += `<g transform="${tf}" data-panel="${id}">${inner}</g>`;
    });
    if (s.on.contactless) {
      body += `<path d="M650 358L688 320M785 320L823 358M650 541L688 580M785 580L823 541" stroke="#000" stroke-width=".5" stroke-dasharray="3 2.6" fill="none"/>`;
    }
    return svg(body + ticks(), "Paper Phone sheet, front");
  }

  // ---- page 2: map and directions ------------------------------------------
  const merc = (lon, lat) => {
    const r = (lat * Math.PI) / 180;
    return [(lon + 180) / 360, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2];
  };
  PP.fmtDist = (m) => (m < 950 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(m < 10000 ? 1 : 0) + " km");

  function backPage(s) {
    const r = s.maps.route, mw = PAGE_W - 2 * M, mh = 262, T = 128;
    let body = "";
    if (!r) {
      body += text("MAP", M, M + 13.6, { size: 11.33, ls: 0.1 }) +
        text("Enter a start and a destination, then choose Get directions.", M, M + 34, { font: BODY, size: 8 });
    } else {
      const pts = r.coords.map((c) => merc(c[0], c[1]));
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const dx = Math.max(maxX - minX, 1e-7), dy = Math.max(maxY - minY, 1e-7);
      const z = Math.max(2, Math.min(17, Math.floor(Math.log2(Math.min((mw - 50) / (T * dx), (mh - 50) / (T * dy))))));
      const world = T * Math.pow(2, z);
      const ox = ((minX + maxX) / 2) * world - mw / 2, oy = ((minY + maxY) / 2) * world - mh / 2;
      let tiles = "";
      for (let tx = Math.floor(ox / T); tx * T < ox + mw; tx++) for (let ty = Math.floor(oy / T); ty * T < oy + mh; ty++) {
        const n = Math.pow(2, z);
        if (ty < 0 || ty >= n) continue;
        tiles += `<image href="https://tile.openstreetmap.org/${z}/${((tx % n) + n) % n}/${ty}.png" x="${(tx * T - ox).toFixed(2)}" y="${(ty * T - oy).toFixed(2)}" width="${T + 0.3}" height="${T + 0.3}"/>`;
      }
      const line = pts.map((p) => (p[0] * world - ox).toFixed(1) + "," + (p[1] * world - oy).toFixed(1)).join(" ");
      const a = line.split(" ")[0].split(","), b = line.split(" ").pop().split(",");
      body += `<clipPath id="mapclip"><rect width="${mw}" height="${mh}"/></clipPath>` +
        `<g transform="translate(${M} ${M})" clip-path="url(#mapclip)">` +
        `<rect width="${mw}" height="${mh}" fill="#f1f1f1"/><g style="filter:grayscale(1) contrast(1.15)">${tiles}</g>` +
        `<polyline points="${line}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>` +
        `<polyline points="${line}" fill="none" stroke="#000" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>` +
        `<circle cx="${a[0]}" cy="${a[1]}" r="4.5" fill="#fff" stroke="#000" stroke-width="2"/>` +
        `<circle cx="${b[0]}" cy="${b[1]}" r="5" fill="#000" stroke="#fff" stroke-width="1.5"/>` +
        `<rect x="${mw - 112}" y="${mh - 11}" width="112" height="11" fill="#fff" fill-opacity=".85"/>` +
        text("© OpenStreetMap contributors", mw - 4, mh - 3, { font: BODY, size: 6, anchor: "end" }) +
        `</g><rect x="${M}" y="${M}" width="${mw}" height="${mh}" fill="none" stroke="#000" stroke-width=".5"/>`;

      const top = M + mh + 22;
      body += text(fit((r.from + "  to  " + r.to).toUpperCase(), DISPLAY, 9.5, 0.1, mw), M, top, { size: 9.5, ls: 0.1 });
      const mins = Math.round(r.duration / 60);
      const how = { foot: "on foot", bike: "by bike", car: "by car" }[r.mode] || "";
      body += text(`${PP.fmtDist(r.distance)}, about ${mins >= 60 ? Math.floor(mins / 60) + " h " + (mins % 60) + " min" : mins + " min"} ${how}`, M, top + 12, { font: BODY, size: 7.31 });

      let col = 0, y = top + 34, shown = 0;
      const bottom = PAGE_H - M - 16;
      for (const st of r.steps) {
        const lines = wrap(st.text, BODY, 7.5, W - 14).slice(0, 3);
        const need = lines.length * 9.5 + 15;
        if (y + need > bottom) { col++; y = top + 34; if (col > 3) break; }
        const x = M + XS[col];
        body += text(shown + 1, x, y, { size: 7.5 });
        lines.forEach((l, i) => { body += text(l, x + 14, y + i * 9.5, { font: BODY, size: 7.5 }); });
        if (st.dist) body += text(PP.fmtDist(st.dist), x + 14, y + lines.length * 9.5, { font: BODY, size: 6.2, fill: "#444" });
        y += need; shown++;
      }
      if (shown < r.steps.length) body += text(`+ ${r.steps.length - shown} more steps`, M + XS[3], PAGE_H - M - 4, { font: BODY, size: 6.5 });
    }
    // the two circles that meet on the first fold
    body += `<circle cx="${PAGE_W / 4}" cy="${PAGE_H - 12}" r="2.5" fill="none" stroke="#000" stroke-width=".6"/>` +
      `<circle cx="${(3 * PAGE_W) / 4}" cy="${PAGE_H - 12}" r="2.5" fill="none" stroke="#000" stroke-width=".6"/>`;
    return svg(body, "Paper Phone sheet, back: map and directions");
  }

  function svg(body, label) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_W} ${PAGE_H}" role="img" aria-label="${label}" fill="#000">` +
      `<rect width="${PAGE_W}" height="${PAGE_H}" fill="#fff"/>${body}</svg>`;
  }

  // shared with js/envelope.js
  PP.draw = { panels, text, esc, fit, wrap, width, DISPLAY, BODY, W, H };

  PP.renderPages = function (s) {
    if (s.sheet === "envelope") return [PP.renderEnvelope(s)];
    if (s.sheet === "tent") return [PP.renderTent(s)];
    const pages = [frontPage(s)];
    if (s.on.maps) pages.push(backPage(s));
    return pages;
  };
})();
