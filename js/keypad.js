/* Paper Phone – where the envelope's keys sit on a phone screen.
 * Used twice: to print the key outlines on the envelope (in millimetres) and to
 * place the glowing keys on the phone (in pixels). Because both come from the
 * same fractions of the screen, the paper and the screen line up. */
(function () {
  const PP = (window.PP = window.PP || {});
  PP.keypad = function (w, h) {
    const r = 0.08 * w, stepX = 0.235 * w, stepY = 0.225 * w, top = 0.28 * h;
    const keys = [];
    "123456789*0#".split("").forEach((label, i) => {
      keys.push({ id: label, label, x: 0.5 * w + ((i % 3) - 1) * stepX, y: top + Math.floor(i / 3) * stepY, r });
    });
    const callY = top + 3 * stepY + 0.26 * w;
    keys.push({ id: "call", label: "", x: 0.5 * w, y: callY, r: 0.095 * w });
    keys.push({ id: "clock", label: "", x: 0.5 * w, y: callY + 0.27 * w, r: 0.08 * w });
    return keys;
  };

  /**
   * Where the table tent's lights sit on the phone screen. `long` and `short` are the
   * screen's two sides in any unit; x runs along the long side, y across the short one.
   * Shared by the printed tent (millimetres) and tent.html (pixels).
   */
  PP.tentLayout = function (people, long, short) {
    const n = Math.max(2, Math.min(8, people | 0)), pitch = long / n, items = [];
    for (let i = 0; i < n; i++) items.push({ id: "p" + i, x: (i + 0.5) * pitch, y: 0.3 * short, r: Math.min(0.1 * short, 0.4 * pitch) });
    items.push({ id: "next", x: 0.13 * long, y: 0.76 * short, r: 0.13 * short });
    for (let i = 0; i < 12; i++) items.push({ id: "t" + i, x: (0.3 + (0.4 * i) / 11) * long, y: 0.76 * short, r: 0.03 * short });
    items.push({ id: "call", x: 0.87 * long, y: 0.76 * short, r: 0.13 * short });
    return items;
  };

  PP.PHONES = {
    a08: { name: "Samsung Galaxy A08", h: 167.4, w: 77.4, t: 8, diag: 6.7, ratio: "20:9", bezel: 3.5 },
    pixel3a: { name: "Google Pixel 3a", h: 151.3, w: 70.1, t: 8.2, diag: 5.6, ratio: "18.5:9", bezel: 10 },
    // `win` is the camera opening of a case once the case is flipped onto the screen, in mm
    // from the phone's top left as you face the screen. These are estimates: case makers differ,
    // which is why window.html can trace the real opening.
    iphone17: { name: "iPhone 17", h: 149.6, w: 71.5, t: 7.95, diag: 6.3, ratio: "2622:1206", bezel: 2.1, win: { x: 44.5, y: 5, w: 22, h: 44, r: 11 } },
    iphone17pro: { name: "iPhone 17 Pro", h: 150, w: 71.9, t: 8.75, diag: 6.3, ratio: "2622:1206", bezel: 2.3, win: { x: 3, y: 3, w: 65.9, h: 36, r: 8 } },
  };
  /** The window of a phone, in the units of a viewport `vw` wide that shows the whole screen. */
  PP.windowRect = function (phone, vw, vh) {
    const scr = PP.screenSize(phone.diag, phone.ratio), k = vw / scr.w, side = (phone.w - scr.w) / 2, g = phone.win;
    const x = Math.max(0, (g.x - side) * k), y = Math.max(0, (g.y - phone.bezel) * k);
    return { x, y, w: Math.min(vw - x, (g.x - side + g.w) * k - x), h: Math.min(vh - y, (g.y - phone.bezel + g.h) * k - y), r: g.r * k };
  };

  /** Screen width and height in mm from its diagonal (inches) and ratio ("20:9"). */
  PP.screenSize = function (diag, ratio) {
    const p = String(ratio).split(":").map(Number);
    const a = Math.max(p[0], p[1]) || 20, b = Math.min(p[0], p[1]) || 9, d = (diag || 6) * 25.4 / Math.hypot(a, b);
    return { w: b * d, h: a * d };
  };
})();
