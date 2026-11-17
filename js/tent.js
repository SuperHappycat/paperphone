/* Paper Phone – the table tent: a folded paper cover for everyone's phones at a meal.
 * The last phone lies on top of the pile, screen up, and lights the printed circles
 * through the paper. Drawn in millimetres on a landscape sheet. */
(function () {
  const PP = window.PP, D = PP.draw;
  const f = (n) => +n.toFixed(2);

  // kid: fine with children at the table. With the switch on, only these are offered.
  PP.TENT_QUESTIONS = [
    { t: "What is the best thing you ate this week, not counting tonight?", kid: 1 },
    { t: "If our family had a flag, what would be on it?", kid: 1 },
    { t: "Which animal would be the worst house guest, and why?", kid: 1 },
    { t: "What is something you can do now that you could not do a year ago?", kid: 1 },
    { t: "If you could add one room to this home, what would it be for?", kid: 1 },
    { t: "What made you laugh today?", kid: 1 },
    { t: "You may keep one food forever but must give up another. Which two?", kid: 1 },
    { t: "What would you like to be really good at, with no practice needed?", kid: 1 },
    { t: "Which rule would you make everyone in the world follow for one day?", kid: 1 },
    { t: "What is the kindest thing someone did for you lately?", kid: 1 },
    { t: "If today had a title, like a book, what would it be?", kid: 1 },
    { t: "What is a small thing that always puts you in a good mood?", kid: 1 },
    { t: "Where would you go if the car could drive anywhere overnight?", kid: 1 },
    { t: "What is the oldest thing you own, and why have you kept it?", kid: 1 },
    { t: "Which invention would you un-invent?" },
    { t: "What did you believe for far too long?" },
    { t: "Which job would you be worst at, and how quickly would you be found out?" },
    { t: "What is overrated, and what deserves more credit?" },
    { t: "What advice did you ignore that turned out to be right?" },
    { t: "Which year of your life would you live again, exactly as it was?" },
    { t: "What do you wish you had been taught at school?" },
    { t: "What is a habit of yours that you suspect is annoying?" },
    { t: "If you had to teach a class tomorrow, what would it be on?" },
    { t: "What have you changed your mind about in the last few years?" },
  ];

  PP.TENT_GAMES = [
    { name: "Twenty questions", kid: 1, rules: "One person thinks of a thing. Everyone else takes turns asking questions that can only be answered yes or no. Twenty questions between you to find it. Whoever guesses thinks of the next one." },
    { name: "One word at a time", kid: 1, rules: "Tell a story together, one word each, going round the table. No planning, no pausing. It ends when someone finishes a sentence with “the end”." },
    { name: "Fortunately, unfortunately", kid: 1, rules: "The first person starts a story with one sentence. The next continues with “Unfortunately…”, the next with “Fortunately…”, and so on round the table until the story lands somewhere." },
    { name: "I spy", kid: 1, rules: "One person picks something everyone can see and says “I spy with my little eye something beginning with…” and its first letter. The rest guess. Whoever gets it goes next." },
    { name: "Higher or lower", kid: 1, rules: "One person picks a number from 1 to 100. The others guess in turn and are told only “higher” or “lower”. Count the guesses. Fewest guesses round the table wins." },
    { name: "The alphabet shop", kid: 1, rules: "“I went to the shop and bought an apple.” The next person repeats it and adds something beginning with B, then C, and so on. Forget an item and you are out." },
    { name: "Would you rather", kid: 1, rules: "Take turns offering two choices, equally good or equally awful. Everyone must choose and give one reason. No “neither”." },
    { name: "Two truths and a lie", rules: "Each person in turn says three things about themselves: two true, one invented. The table votes on which is the lie before it is revealed." },
    { name: "The minister's cat", rules: "Go round describing the minister's cat with an adjective starting with A: “an awful cat”, “an anxious cat”. Hesitate or repeat and you are out. Then B, then C." },
    { name: "Just a minute", rules: "One person is given a subject by the table and must talk about it for a minute without repeating a word, hesitating or drifting off the point. Anyone may challenge; a fair challenge takes over the subject." },
  ];

  PP.tentPick = function (kind, kids, not) {
    const list = (kind === "game" ? PP.TENT_GAMES : PP.TENT_QUESTIONS).filter((x) => !kids || x.kid);
    const key = (x) => x.name || x.t;
    const pool = list.filter((x) => key(x) !== not);
    return key(pool[Math.floor(Math.random() * pool.length)]);
  };

  PP.tentNames = (s) => String(s.tent.names || "").split(/[\n,]+/).map((x) => x.trim()).filter(Boolean).slice(0, 8);

  PP.tentFit = function (s) {
    const e = s.env, page = s.paper === "Letter" ? { w: 279.4, h: 215.9 } : { w: 297, h: 210 };
    const topW = e.w + 4.6, bodyL = e.h + 3, endL = (page.w - bodyL) / 2, face = (page.h - topW) / 2;
    return { page, topW, bodyL, endL, face, fits: endL >= 30 && face >= 40, people: PP.tentNames(s).length };
  };

  function qrPath(textIn, x, y, size) {
    if (!window.qrcode) return "";
    const q = window.qrcode(0, "M");
    q.addData(textIn);
    q.make();
    const n = q.getModuleCount(), m = size / n;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${f(x + c * m)} ${f(y + r * m)}h${f(m)}v${f(m)}h${f(-m)}z`;
    return `<path d="${d}"/>`;
  }

  /** Lines of text that fit a width, shrinking the type if there are too many. */
  function block(str, font, size, maxW, maxLines) {
    let lines = D.wrap(str, font, size, maxW);
    while (lines.length > maxLines && size > 2.2) { size -= 0.25; lines = D.wrap(str, font, size, maxW); }
    return { lines, size };
  }

  PP.renderTent = function (s) {
    const e = s.env, t = s.tent, g = PP.tentFit(s), { page, topW, bodyL, endL } = g;
    const names = PP.tentNames(s);
    const tx = (str, x, y, size, o) => D.text(str, f(x), f(y), Object.assign({ size, font: D.BODY }, o || {}));
    let out = "";

    if (!g.fits) {
      out += tx(`This phone is too large for a tent on one ${s.paper} sheet.`, 14, 24, 4);
      return wrap(out, page);
    }

    const y1 = (page.h - topW) / 2, y2 = y1 + topW, xa = endL, xb = page.w - endL;

    // cut (dashed) and fold (solid) lines
    out += `<path d="M0 ${f(y1)}H${f(xa)}M0 ${f(y2)}H${f(xa)}M${f(xb)} ${f(y1)}H${page.w}M${f(xb)} ${f(y2)}H${page.w}" fill="none" stroke="#000" stroke-width=".3" stroke-dasharray="1.6 1.2"/>`;
    out += `<path d="M${f(xa)} ${f(y1)}H${f(xb)}M${f(xa)} ${f(y2)}H${f(xb)}M${f(xa)} ${f(y1)}V${f(y2)}M${f(xb)} ${f(y1)}V${f(y2)}" fill="none" stroke="#000" stroke-width=".2"/>`;

    // top: the part that lies on the screen. The phone's top end points left.
    const scr = PP.screenSize(e.diag, e.ratio);
    const sx = xa + 1.5 + (+e.bezel || 0), sy = y1 + (topW - scr.w) / 2;
    PP.tentLayout(names.length, scr.h, scr.w).forEach((k) => {
      const cx = f(sx + k.x), cy = f(sy + k.y);
      const person = k.id[0] === "p" ? names[+k.id.slice(1)] : null;
      if (k.id[0] === "t") { out += `<circle cx="${cx}" cy="${cy}" r="${f(k.r)}" fill="none" stroke="#000" stroke-width=".2"/>`; return; }
      out += `<circle cx="${cx}" cy="${cy}" r="${f(k.r)}" fill="none" stroke="#000" stroke-width=".3"/>`;
      if (person != null) out += D.text(D.fit(person, D.DISPLAY, 3.2, 0, 2 * k.r + 4), cx, f(sy + k.y + k.r + 5), { size: 3.2, anchor: "middle" });
      if (k.id === "next") out += tx("WHO’S", cx, cy - 0.3, 2.1, { anchor: "middle", ls: 0.15, font: D.DISPLAY }) + tx("NEXT", cx, cy + 2.6, 2.1, { anchor: "middle", ls: 0.15, font: D.DISPLAY });
      if (k.id === "call") out += tx("CALL", cx, cy + 0.8, 2.1, { anchor: "middle", ls: 0.2, font: D.DISPLAY });
    });
    const tr = PP.tentLayout(names.length, scr.h, scr.w).filter((k) => k.id[0] === "t");
    out += tx("one dot lights every five minutes", sx + (tr[0].x + tr[11].x) / 2, sy + tr[0].y + 5.2, 2, { anchor: "middle" });

    // near face: the question, read from this side of the table
    const when = PP.fmtLong(s.date), meal = (t.meal || "Dinner").trim();
    const faceTop = y2 + 9, margin = 14, wide = page.w - 2 * margin;
    out += D.text(D.fit((meal + ", " + when).toUpperCase(), D.DISPLAY, 3, 0.12, wide), margin, f(faceTop), { size: 3, ls: 0.12 });
    const q = block(t.question || "", D.DISPLAY, 7.5, wide, 3);
    q.lines.forEach((line, i) => { out += D.text(line, margin, f(faceTop + 12 + i * q.size * 1.28), { size: q.size }); });
    if (t.last && t.last.minutes) out += tx(`Last meal: ${t.last.minutes} ${t.last.minutes === 1 ? "minute" : "minutes"} before a phone was picked up.`, margin, page.h - 7, 2.6);

    // far face: the game, upside down on the sheet so it reads from the other side
    const game = PP.TENT_GAMES.find((x) => x.name === t.game) || PP.TENT_GAMES[0];
    let far = D.text(D.fit((meal + ", " + when).toUpperCase(), D.DISPLAY, 3, 0.12, wide), margin, f(faceTop), { size: 3, ls: 0.12 });
    far += D.text(game.name, margin, f(faceTop + 11), { size: 6.5 });
    const r = block(game.rules, D.BODY, 3.6, wide, 5);
    r.lines.forEach((line, i) => { far += tx(line, margin, faceTop + 19 + i * r.size * 1.4, r.size); });
    out += `<g transform="rotate(180 ${f(page.w / 2)} ${f(page.h / 2)})">${far}</g>`;

    // left end flap: the code that tells the phone about this meal
    const url = PP.tentUrl(names.length);
    const qs = Math.min(30, endL - 22, topW - 30);
    if (url) {
      out += qrPath(url, 8, y1 + (topW - qs) / 2, qs);
      out += tx("Scan with the phone", 8, y1 + (topW - qs) / 2 - 6.4, 2.4) + tx("that goes on top.", 8, y1 + (topW - qs) / 2 - 3, 2.4);
    }
    out += `<text transform="translate(${f(xa - 3)} ${f((y1 + y2) / 2)}) rotate(-90)" text-anchor="middle" font-family="${D.BODY}" font-size="2.2" letter-spacing=".3">TOP OF PHONE THIS END</text>`;

    // right end flap: how to make and use it
    const steps = ["Print at 100%. Cut the four dashed lines.", "Fold both long sides and both ends down along the solid lines.", "Pile the phones. Scan the code with the last one, press Start, lay it on top with the screen up.", "Lower the tent over the pile. The meal ends when a phone is picked up."];
    let yy = y1 + 9;
    steps.forEach((st, i) => {
      out += D.text(String(i + 1), f(xb + 5), f(yy), { size: 2.6 });
      D.wrap(st, D.BODY, 2.4, endL - 18).forEach((line) => { out += tx(line, xb + 9, yy, 2.4); yy += 3.3; });
      yy += 1.6;
    });

    return wrap(out, page);
  };

  /** Address of the phone page for this meal, or "" when the app is not on a web address. */
  PP.tentUrl = function (people) {
    if (!/^https?:$/.test(location.protocol)) return "";
    return new URL("tent.html", location.href).href.split("#")[0].split("?")[0] + "#n=" + people;
  };

  function wrap(body, page) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label="Table tent template" fill="#000">` +
      `<rect width="${page.w}" height="${page.h}" fill="#fff"/>${body}</svg>`;
  }
})();
