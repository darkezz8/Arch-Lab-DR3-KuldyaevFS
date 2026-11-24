// Линейные графики в SVG: оси, сетка, легенда, перекрестие с подсказкой.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const tip = () => document.getElementById("tip");
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function nice(lo, hi, n) {
    const span = hi - lo || 1, step0 = span / n, p = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((k) => k * p).find((s) => s >= step0);
    const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
    for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(10));
    return t;
  }
  function fmt(v) {
    const a = Math.abs(v);
    if (a < 1e-9) return "0";
    const s = a >= 1000 ? Math.round(v).toLocaleString("ru-RU") : a >= 10 ? v.toFixed(0) : a >= 1 ? v.toFixed(1) : v.toFixed(2);
    return s.replace("-", "−").replace(".", ",");
  }

  // opts: {series:[{x,y,color,label,dash,width}], xlabel, ylabel, ymin, ymax, xmin, xmax, unit, equal, marks}
  function line(id, opts) {
    const box = document.getElementById(id);
    box.innerHTML = "";
    const W = box.clientWidth || 600, H = box.clientHeight || 320;
    const m = { l: 64, r: 16, t: opts.legendTop === false ? 10 : 34, b: 42 };
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}` }, box);
    const xs = opts.series.flatMap((s) => s.x), ys = opts.series.flatMap((s) => s.y);
    let x0 = opts.xmin ?? Math.min(...xs), x1 = opts.xmax ?? Math.max(...xs);
    let y0 = opts.ymin ?? Math.min(0, ...ys), y1 = opts.ymax ?? Math.max(0, ...ys);
    const yt = nice(y0, y1, 5), xt = nice(x0, x1, 6);
    y0 = Math.min(y0, yt[0]); y1 = Math.max(y1, yt[yt.length - 1]);
    let pw = W - m.l - m.r, ph = H - m.t - m.b;
    let sx = (x) => m.l + ((x - x0) / (x1 - x0)) * pw, sy = (y) => m.t + ph - ((y - y0) / (y1 - y0)) * ph;
    if (opts.equal) { // одинаковый масштаб по осям (геометрия)
      const k = Math.min(pw / (x1 - x0), ph / (y1 - y0));
      sx = (x) => m.l + (x - x0) * k; sy = (y) => m.t + ph - (y - y0) * k;
    }
    const g = el("g", { class: "grid" }, svg);
    yt.forEach((v) => el("line", { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v) }, g));
    const ax = el("g", { class: "axis" }, svg);
    yt.forEach((v) => { const t = el("text", { x: m.l - 8, y: sy(v) + 4, "text-anchor": "end" }, ax); t.textContent = fmt(v); });
    xt.filter((v) => v >= x0 - 1e-9 && v <= x1 + 1e-9).forEach((v) => {
      const t = el("text", { x: sx(v), y: H - m.b + 18, "text-anchor": "middle" }, ax); t.textContent = fmt(v); });
    if (y0 < 0 && y1 > 0) el("line", { class: "zero", x1: m.l, x2: W - m.r, y1: sy(0), y2: sy(0) }, svg);
    const xl = el("text", { class: "lbl", x: m.l + pw / 2, y: H - 6, "text-anchor": "middle" }, svg); xl.textContent = opts.xlabel || "";
    const yl = el("text", { class: "lbl", x: 12, y: m.t + ph / 2, transform: `rotate(-90 12 ${m.t + ph / 2})`, "text-anchor": "middle" }, svg);
    yl.textContent = opts.ylabel || "";
    const paths = opts.series.map((s) => {
      const d = s.x.map((x, i) => `${i ? "L" : "M"}${sx(x).toFixed(1)},${sy(s.y[i]).toFixed(1)}`).join("");
      return el("path", { d, fill: "none", stroke: s.color, "stroke-width": s.width || 2, "stroke-dasharray": s.dash || "",
        "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
    });
    // легенда
    if (opts.series.length > 1 && opts.legendTop !== false) {
      const lg = el("g", { class: "legend" }, svg); let lx = m.l;
      opts.series.forEach((s) => {
        el("line", { x1: lx, x2: lx + 18, y1: 14, y2: 14, stroke: s.color, "stroke-width": 3, "stroke-dasharray": s.dash || "" }, lg);
        const t = el("text", { x: lx + 24, y: 18 }, lg); t.textContent = s.label;
        lx += 24 + t.getComputedTextLength() + 20;
      });
    }
    (opts.marks || []).forEach((mk) => {
      el("circle", { cx: sx(mk.x), cy: sy(mk.y), r: 4, fill: mk.color, stroke: css("--paper"), "stroke-width": 2 }, svg);
      const t = el("text", { class: "val", x: sx(mk.x) + (mk.dx || 6), y: sy(mk.y) + (mk.dy || -8), "text-anchor": mk.anchor || "start" }, svg);
      t.textContent = mk.text;
    });
    // перекрестие и подсказка
    if (opts.hover !== false) {
      const cross = el("line", { class: "cross", y1: m.t, y2: m.t + ph, x1: -10, x2: -10 }, svg);
      const dots = opts.series.map((s) => el("circle", { r: 4, fill: s.color, stroke: css("--paper"), "stroke-width": 2, cx: -10, cy: -10 }, svg));
      const hit = el("rect", { x: m.l, y: m.t, width: pw, height: ph, fill: "transparent" }, svg);
      const move = (ev) => {
        const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
        const xv = x0 + ((px - m.l) / pw) * (x1 - x0);
        let html = `${opts.xname || "x"} = ${fmt(xv)}`;
        cross.setAttribute("x1", px); cross.setAttribute("x2", px);
        opts.series.forEach((s, k) => {
          let i = 0, best = 1e18;
          s.x.forEach((x, j) => { const d = Math.abs(x - xv); if (d < best) { best = d; i = j; } });
          dots[k].setAttribute("cx", sx(s.x[i])); dots[k].setAttribute("cy", sy(s.y[i]));
          html += `<br><span style="color:${s.color}">■</span> ${s.label || ""}: ${fmt(s.y[i])}${opts.unit ? " " + opts.unit : ""}`;
        });
        const t = tip(); t.innerHTML = html; t.style.opacity = 1;
        t.style.left = Math.min(ev.clientX + 14, innerWidth - t.offsetWidth - 8) + "px"; t.style.top = ev.clientY + 14 + "px";
      };
      hit.addEventListener("pointermove", move);
      hit.addEventListener("pointerleave", () => { tip().style.opacity = 0; cross.setAttribute("x1", -10); cross.setAttribute("x2", -10);
        dots.forEach((d) => d.setAttribute("cx", -10)); });
    }
    return { svg, sx, sy, paths };
  }
  window.Charts = { line, fmt };
})();
