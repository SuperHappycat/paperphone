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

  PP.PHONES = {
    a08: { name: "Samsung Galaxy A08", h: 167.4, w: 77.4, t: 8, diag: 6.7, ratio: "20:9", bezel: 3.5 },
    pixel3a: { name: "Google Pixel 3a", h: 151.3, w: 70.1, t: 8.2, diag: 5.6, ratio: "18.5:9", bezel: 10 },
  };
  /** Screen width and height in mm from its diagonal (inches) and ratio ("20:9"). */
  PP.screenSize = function (diag, ratio) {
    const p = String(ratio).split(":").map(Number);
    const a = Math.max(p[0], p[1]) || 20, b = Math.min(p[0], p[1]) || 9, d = (diag || 6) * 25.4 / Math.hypot(a, b);
    return { w: b * d, h: a * d };
  };
})();
