/* Paper Phone – the envelope: a cut-and-fold sleeve for a phone, with a keypad
 * printed over the screen and Paper Phone panels on the back.
 * After the Envelope experiment by Special Projects. Drawn in millimetres. */
(function () {
  const PP = window.PP, D = PP.draw;
  const PT = 25.4 / 72; // one PDF point in mm
  const f = (n) => +n.toFixed(2);

  /** The paper window is drawn as an envelope for the iPhone chosen in its own section. */
  PP.windowState = (s) => Object.assign({}, s, { env: Object.assign({}, s.env, PP.PHONES[s.win.model] || PP.PHONES.iphone17pro) });

  PP.envelopeFit = function (s) {
    const e = s.env, page = s.paper === "Letter" ? { w: 215.9, h: 279.4 } : { w: 210, h: 297 };
    // the paper window is open at the top (a flap would cover the camera), so it has no top flap
    const open = s.sheet === "window";
    const S = e.t + 1, F = e.w + 2, B = e.h + 2, G = 12, TOP = open ? 0 : 22, BOT = 14, TS = open ? 0 : S;
    const totalW = G + 2 * S + 2 * F, totalH = TOP + TS + S + B + BOT;
    return { page, S, F, B, G, TOP, BOT, TS, open, totalW, totalH, fits: totalW <= page.w - 8 && totalH <= page.h - 44 };
  };

  PP.renderEnvelope = function (s) {
    const e = s.env, g = PP.envelopeFit(s), { page, S, F, B, G, TOP, BOT, TS, open } = g;
    const t = (str, x, y, size, o) => D.text(str, f(x), f(y), Object.assign({ size, font: D.BODY }, o || {}));
    let out = "";

    // heading and instructions
    out += D.text(open ? "PAPER WINDOW" : "ENVELOPE", 12, 14, { size: 4.2, ls: 0.3 });
    out += t(`For the ${e.name || "phone"}. Print at 100% scale on 80 gsm paper.`, 12, 20, 2.9);
    (open ? ["1. Check the ruler: it must measure 20 mm.", "2. Cut along the dashed lines, and cut out the two windows.", "3. Fold along the solid lines, print on the outside.",
      "4. Glue the side flap inside the back, then the bottom flap onto the back.", "5. Start the Window app on the phone and slide it in from the open top, screen behind the small window."]
      : ["1. Check the ruler: it must measure 20 mm.", "2. Cut along the dashed lines.", "3. Fold along the solid lines, print on the outside.",
      "4. Glue the side flap inside the back, then the bottom flap onto the back.", "5. Open the keypad page on the phone, slide it in screen first, close the top."])
      .forEach((line, i) => { out += t(line, 12, 26 + i * 4.2, 2.6); });
    // 20 mm ruler
    const rx = page.w - 12 - 20, ry = 14;
    let ruler = `M${rx} ${ry}h20`;
    for (let i = 0; i <= 20; i++) ruler += `M${rx + i} ${ry}v${i % 10 === 0 ? -3 : i % 5 === 0 ? -2 : -1.2}`;
    out += `<path d="${ruler}" stroke="#000" stroke-width=".2" fill="none"/>` + t("0", rx - 0.8, ry + 3.2, 2.4) + t("20 mm", rx + 18.4, ry + 3.2, 2.4);

    if (!g.fits) {
      out += t(`This phone is too large for one ${s.paper} sheet (the envelope needs ${Math.ceil(g.totalW)} × ${Math.ceil(g.totalH)} mm).`, 12, 70, 3.4);
      return wrap(out, page);
    }

    const x1 = (page.w - g.totalW) / 2, x2 = x1 + G, x3 = x2 + S, x4 = x3 + F, x5 = x4 + S, x6 = x5 + F;
    const y1 = 50, y2 = y1 + TOP, y3 = y2 + TS, y4 = y3 + B, y5 = y4 + S, y6 = y5 + BOT;

    // glue areas
    out += `<path d="M${f(x2)} ${f(y3)}L${f(x1)} ${f(y3 + 5)}V${f(y4 - 5)}L${f(x2)} ${f(y4)}z" fill="#d9d9d9"/>` +
      `<path d="M${f(x3)} ${f(y5)}H${f(x4)}L${f(x4 - 3)} ${f(y6)}H${f(x3 + 3)}z" fill="#d9d9d9"/>`;
    out += `<text transform="translate(${f(x1 + G / 2 + 1)} ${f((y3 + y4) / 2)}) rotate(-90)" text-anchor="middle" font-family="${D.BODY}" font-size="2.4" letter-spacing=".4">GLUE HERE</text>`;
    out += t("GLUE HERE", (x3 + x4) / 2, y5 + BOT / 2 + 1, 2.4, { anchor: "middle", ls: 0.15 });
    if (!open) out += t("Top flap: tuck in, or hold with a little tape", (x3 + x4) / 2, y1 + TOP / 2 + 1, 2.4, { anchor: "middle" });

    // cut (dashed) and fold (solid) lines
    const tail = `V${f(y4)}H${f(x4)}V${f(y5)}L${f(x4 - 3)} ${f(y6)}H${f(x3 + 3)}L${f(x3)} ${f(y5)}V${f(y4)}H${f(x2)}L${f(x1)} ${f(y4 - 5)}V${f(y3 + 5)}`;
    const cut = open ? `M${f(x2)} ${f(y3)}H${f(x6)}${tail}z` : `M${f(x3 + 3)} ${f(y1)}H${f(x4 - 3)}L${f(x4)} ${f(y2)}V${f(y3)}H${f(x6)}V${f(y4)}H${f(x4)}V${f(y5)}L${f(x4 - 3)} ${f(y6)}H${f(x3 + 3)}L${f(x3)} ${f(y5)}V${f(y4)}H${f(x2)}L${f(x1)} ${f(y4 - 5)}V${f(y3 + 5)}L${f(x2)} ${f(y3)}H${f(x3)}V${f(y2)}z`;
    out += `<path d="${cut}" fill="none" stroke="#000" stroke-width=".25" stroke-dasharray="1.6 1.2"/>`;
    let fold = "";
    [x2, x3, x4, x5].forEach((x) => { fold += `M${f(x)} ${f(y3)}V${f(y4)}`; });
    (open ? [y4, y5] : [y2, y3, y4, y5]).forEach((y) => { fold += `M${f(x3)} ${f(y)}H${f(x4)}`; });
    out += `<path d="${fold}" fill="none" stroke="#000" stroke-width=".2"/>`;

    if (open) {
      // front: the window. back: the same opening mirrored, which is where the cameras are.
      const w = e.win, hole = (x, label) => `<rect x="${f(x)}" y="${f(y3 + 1 + w.y)}" width="${f(w.w)}" height="${f(w.h)}" rx="${f(w.r)}" fill="none" stroke="#000" stroke-width=".25" stroke-dasharray="1.6 1.2"/>` +
        t(label, x + w.w / 2, y3 + 1 + w.y + w.h / 2 + 0.9, 2.2, { anchor: "middle", ls: 0.15 });
      out += hole(x3 + 1 + w.x, "CUT OUT") + hole(x5 + 1 + (e.w - w.x - w.w), "CUT OUT");
      out += t("Window", (x3 + x4) / 2, y3 + B * 0.62, 3, { anchor: "middle", font: D.DISPLAY, ls: 0.2 });
      out += t("Camera side", (x5 + x6) / 2, y3 + B * 0.62, 3, { anchor: "middle", font: D.DISPLAY, ls: 0.2 });
      out += t("Open at the top: the phone slides in here", (x3 + x6) / 2, y3 - 2.5, 2.4, { anchor: "middle" });
      out += `<text transform="translate(${f(page.w - 7)} ${f((y3 + y4) / 2)}) rotate(-90)" text-anchor="middle" font-family="${D.BODY}" font-size="2.4" letter-spacing=".3">MODEL: ${D.esc((e.name || "").toUpperCase())}   |   ${f(e.h)} × ${f(e.w)} × ${f(e.t)} MM   |   AFTER APERTURE BY SPECIAL PROJECTS</text>`;
      return wrap(out, page);
    }

    // front: the keypad, placed over where the screen will be
    const scr = PP.screenSize(e.diag, e.ratio);
    const sx = x3 + (F - scr.w) / 2, sy = y3 + 1 + (+e.bezel || 0);
    PP.keypad(scr.w, scr.h).forEach((k) => {
      const cx = f(sx + k.x), cy = f(sy + k.y);
      out += `<circle cx="${cx}" cy="${cy}" r="${f(k.r)}" fill="none" stroke="#000" stroke-width=".3"/>`;
      if (k.label) out += D.text(k.label, cx, f(sy + k.y + (k.label === "*" ? 2.9 : 1.75)), { size: k.label === "*" ? 6.5 : 4.9, anchor: "middle" });
      if (k.id === "clock") out += `<path d="M${cx} ${f(cy - k.r * 0.5)}V${cy}l${f(k.r * 0.38)} ${f(k.r * 0.25)}" fill="none" stroke="#000" stroke-width=".3" stroke-linecap="round"/>`;
      if (k.id === "call") out += t("CALL", cx, cy + 0.8, 2.2, { anchor: "middle", ls: 0.2, font: D.DISPLAY });
    });
    // faint corner marks at the screen edge, to check alignment against the lit screen
    const c = 2.5;
    out += `<path d="M${f(sx)} ${f(sy + c)}v${-c}h${c}M${f(sx + scr.w - c)} ${f(sy)}h${c}v${c}M${f(sx)} ${f(sy + scr.h - c)}v${c}h${c}M${f(sx + scr.w - c)} ${f(sy + scr.h)}h${c}v${-c}" fill="none" stroke="#999" stroke-width=".15"/>`;

    // back: up to two Paper Phone panels, clear of the flaps that fold over it
    const picks = [e.backTop, e.backBottom].filter((id) => id && D.panels[id]);
    if (picks.length) {
      const availW = F - 14, availH = B - TOP - BOT - 8, gap = 8;
      const k = Math.min(availW / (D.W * PT), (availH - gap * (picks.length - 1)) / picks.length / (D.H * PT), 1.15);
      const pw = D.W * PT * k, ph = D.H * PT * k;
      const px = x5 + (F - pw) / 2;
      let py = y3 + TOP + 4 + (availH - picks.length * ph - gap * (picks.length - 1)) / 2;
      picks.forEach((id) => {
        out += `<g transform="translate(${f(px)} ${f(py)}) scale(${f(PT * k * 1000) / 1000})">${D.panels[id](s)}</g>`;
        py += ph + gap;
      });
    }

    // model line down the right edge
    out += `<text transform="translate(${f(page.w - 7)} ${f((y3 + y4) / 2)}) rotate(-90)" text-anchor="middle" font-family="${D.BODY}" font-size="2.4" letter-spacing=".3">MODEL: ${D.esc((e.name || "").toUpperCase())}   |   ${f(e.h)} × ${f(e.w)} × ${f(e.t)} MM   |   AFTER ENVELOPE BY SPECIAL PROJECTS</text>`;
    return wrap(out, page);
  };

  function wrap(body, page) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label="Phone envelope template" fill="#000">` +
      `<rect width="${page.w}" height="${page.h}" fill="#fff"/>${body}</svg>`;
  }
})();
