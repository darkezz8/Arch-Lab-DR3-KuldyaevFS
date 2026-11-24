import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const D = window.ARKA, C = window.Charts, fmt = C.fmt;
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const $ = (id) => document.getElementById(id);
const COL = { blue: css("--blue"), orange: css("--orange"), aqua: css("--aqua"), yellow: css("--yellow"), stamp: css("--stamp"), ink3: css("--ink-3") };
const TYPE_COL = ["#0d366b", "#1c5cab", "#3987e5", "#6da7ec", "#9ec5f4"];
const n = D.variant.steps;

/* ---------------- 3D ---------------- */
function scene3d() {
  const host = $("scene");
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14161a);
  scene.fog = new THREE.Fog(0x14161a, 600, 1400);
  const cam = new THREE.PerspectiveCamera(38, 1, 1, 5000);
  cam.position.set(330, 160, 330);
  const ctl = new OrbitControls(cam, renderer.domElement);
  ctl.target.set(0, 70, 0); ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.6;
  ctl.maxPolarAngle = Math.PI * 0.49; ctl.minDistance = 120; ctl.maxDistance = 900;
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2622, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(200, 400, 150); scene.add(sun);
  const grid = new THREE.GridHelper(700, 28, 0x3a3d44, 0x262930); scene.add(grid);

  let mesh = null, mode = "type", twistOn = true;
  const sMin = Math.min(...D.sig_el), sMax = Math.max(...D.sig_el);
  function colorFor(i) {
    if (mode === "type") return new THREE.Color(TYPE_COL[D.el_rig[Math.min(i, n - 1)] - 1]);
    const v = D.sig_el[Math.min(i, n - 1)], t = (v - sMax) / (sMin - sMax); // 0 — слабое сжатие, 1 — сильное
    return new THREE.Color().setHSL(0.6 - 0.6 * t, 0.75, 0.55 - 0.1 * t);
  }
  function build() {
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); }
    const pos = [], col = [], idx = [];
    for (let br = 0; br < 3; br++) {
      const th = (br * 2 * Math.PI) / 3, er = [Math.cos(th), Math.sin(th)], et = [-Math.sin(th), Math.cos(th)];
      const base = pos.length / 3;
      for (let i = 0; i <= n; i++) {
        const a = D.node_a[i] / 2, x = D.xs[i], z = D.zs[i];
        const j0 = Math.max(i - 1, 0), j1 = Math.min(i + 1, n);
        let tx = D.xs[j1] - D.xs[j0], tz = D.zs[j1] - D.zs[j0]; const L = Math.hypot(tx, tz); tx /= L; tz /= L;
        // касательная t (в плоскости ветви), n1 — горизонталь поперёк, n2 = t × n1
        const t3 = [tx * er[0], tx * er[1], tz], n1 = [et[0], et[1], 0];
        const n2 = [t3[1] * n1[2] - t3[2] * n1[1], t3[2] * n1[0] - t3[0] * n1[2], t3[0] * n1[1] - t3[1] * n1[0]];
        const ph = twistOn ? (D.node_tw[i] * Math.PI) / 180 : 0;
        const u = n1.map((v, k) => Math.cos(ph) * v + Math.sin(ph) * n2[k]);
        const w = n1.map((v, k) => -Math.sin(ph) * v + Math.cos(ph) * n2[k]);
        const c = [x * er[0], x * er[1], z], cl = colorFor(i);
        for (const [p, q] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const X = c[0] + a * (p * u[0] + q * w[0]), Y = c[1] + a * (p * u[1] + q * w[1]), Z = c[2] + a * (p * u[2] + q * w[2]);
          pos.push(X, Z, -Y); col.push(cl.r, cl.g, cl.b);
        }
      }
      for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
        const a0 = base + i * 4 + k, a1 = base + i * 4 + ((k + 1) % 4), b0 = a0 + 4, b1 = a1 + 4;
        idx.push(a0, b0, a1, a1, b0, b1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, metalness: 0.05,
      flatShading: true, side: THREE.DoubleSide }));
    scene.add(mesh);
    legend();
  }
  function legend() {
    const lg = $("legend3d");
    if (mode === "type") lg.innerHTML = D.sections.map((s, k) => `<span><i style="background:${TYPE_COL[k]}"></i>тип ${s.k}: ${s.a.toFixed(2).replace(".", ",")} м</span>`).join("");
    else {
      const stops = [0, 0.5, 1].map((t) => new THREE.Color().setHSL(0.6 - 0.6 * t, 0.75, 0.55 - 0.1 * t).getStyle());
      lg.innerHTML = `<span>${fmt(sMax)} МПа</span><span class="ramp" style="background:linear-gradient(90deg,${stops.join(",")})"></span><span>${fmt(sMin)} МПа</span><span>— краевое сжатие от собственного веса</span>`;
    }
  }
  document.querySelectorAll("[data-color]").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("[data-color]").forEach((x) => x.classList.toggle("on", x === b));
    mode = b.dataset.color; build();
  }));
  $("twist-btn").addEventListener("click", (e) => { twistOn = !twistOn; e.target.textContent = `Закрутка: ${twistOn ? "вкл." : "выкл."}`; build(); });
  renderer.domElement.addEventListener("pointerdown", () => (ctl.autoRotate = false));
  function resize() { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); cam.aspect = w / h;
    // на широком экране арка — правее текста; на узком — по центру и дальше
    ctl.target.set(w > 900 ? -60 : 0, 75, w > 900 ? 60 : 0);
    if (w < 700) cam.position.setLength(560); cam.updateProjectionMatrix(); }
  addEventListener("resize", resize); resize(); build();
  (function loop() { ctl.update(); renderer.render(scene, cam); requestAnimationFrame(loop); })();
}
try { scene3d(); } catch (e) { $("scene").innerHTML = '<p style="padding:2em;color:#aaa">3D-модель не открылась в этом браузере.</p>'; }

/* ---------------- текст и числа ---------------- */
$("txt").textContent = D.txt_fragment.join("\n");
$("f-nodes").textContent = D.variant.nodes; $("f-elems").textContent = D.variant.elems;
$("f-weight").textContent = fmt(D.E0.weight);
$("m0").textContent = fmt(D.E0.M[0] < 0 ? -D.E0.Mmax : D.E0.Mmax);
$("e1a").textContent = fmt(D.E1.a);

/* ---------------- графики ---------------- */
const sKm = (a) => a;
function drawAll() {
  C.line("ch-v1", { xname: "s, м", unit: "т·м", xlabel: "s, м — длина дуги от опоры до замка", ylabel: "M, т·м",
    series: [{ x: D.E0.s, y: D.E0.M, color: COL.orange, label: "переменное сечение (основная модель)" },
             { x: D.E1.s, y: D.E1.M, color: COL.blue, label: "постоянное сечение" }] });
  C.line("ch-w", { xname: "s, м", unit: "т/м", xlabel: "s, м", ylabel: "вес, т/м", legendTop: false,
    series: [{ x: D.E0.s, y: D.wlin, color: COL.orange, label: "погонный вес" }] });
  C.line("ch-v2", { xname: "s, м", unit: "т·м", xlabel: "s, м — длина дуги от опоры до замка", ylabel: "M, т·м",
    series: [{ x: D.E0.s, y: D.E0.M, color: COL.orange, label: "ось — цепная линия" },
             { x: D.E2.s, y: D.E2.M, color: COL.aqua, label: "ось — линия давления" }] });
  iterChart(D.E2.shapes.length - 1);
  holeCharts();
}
function iterChart(k) {
  const shp = D.E2.shapes[k];
  C.line("ch-iter", { equal: true, xname: "x, м", unit: "м", xlabel: "x, м", ylabel: "z, м", ymin: 0, ymax: 180, xmin: 0, xmax: 150,
    series: [{ x: D.xs, y: D.zs, color: COL.ink3, dash: "6 5", label: "цепная линия" },
             { x: D.xs, y: shp, color: COL.aqua, width: 3, label: k ? `итерация ${k}` : "начало" }] });
  $("iter-info").textContent = k ? `итерация ${k}: H = ${fmt(D.E2.iters[Math.min(k, D.E2.iters.length) - 1].H)} т` : "итерация 0 — цепная линия";
}
$("play").addEventListener("click", () => {
  let k = 0; const N = D.E2.shapes.length - 1;
  const step = () => { iterChart(k); if (k++ < N) setTimeout(step, 550); };
  step();
});
$("it-n").textContent = D.E2.iters.length; $("it-h").textContent = fmt(D.E2.H);
$("v1-ratio").textContent = Math.round(D.E0.Mmax / D.E1.Mmax);
$("v1-a").textContent = fmt(D.E0.Mmax); $("v1-b").textContent = fmt(D.E1.Mmax);
$("v2-m").textContent = fmt(D.E2.Mmax); $("v2-m0").textContent = fmt(D.E0.Mmax);
$("v2-s").textContent = fmt(D.E2.sigma.c2[0]); $("v2-s0").textContent = fmt(D.E0.sigma.c2[0]);
$("v3-m").textContent = fmt(D.E4.Mmax);

// столбики: наибольший |M| в четырёх постановках
(function bars() {
  const rows = [["Цепная линия, переменное сечение", D.E0.Mmax, COL.orange],
                ["Цепная линия, постоянное сечение", D.E1.Mmax, COL.blue],
                ["Линия давления", D.E2.Mmax, COL.aqua],
                ["Линия давления, EF × 1000", D.E4.Mmax, COL.yellow]];
  const max = rows[0][1];
  $("bars").innerHTML = rows.map(([t, v, c]) =>
    `<div class="row"><span>${t}</span><div class="bar" style="width:${Math.max(0.4, (v / max) * 72)}%;background:${c}"><span>${fmt(v)} т·м</span></div></div>`).join("");
})();

/* ---------------- лаборатория ---------------- */
function holeCharts(k) {
  const hs = D.E3.map((r) => r.hole);
  const mk = k == null ? [] : [k];
  C.line("ch-hw", { xname: "полость, R", unit: "т", xlabel: "полость, доля R", ylabel: "вес арки, т", legendTop: false, ymin: 0,
    series: [{ x: hs, y: D.E3.map((r) => r.weight), color: COL.orange, label: "вес" }],
    marks: mk.map((i) => ({ x: hs[i], y: D.E3[i].weight, color: COL.stamp, text: fmt(D.E3[i].weight) + " т" })) });
  C.line("ch-hs", { xname: "полость, R", unit: "МПа", xlabel: "полость, доля R", ylabel: "σ, МПа", legendTop: true, ymin: -12, ymax: 4,
    series: [{ x: hs, y: D.E3.map((r) => r.smin), color: COL.blue, label: "наибольшее сжатие" },
             { x: hs, y: D.E3.map((r) => r.smax), color: COL.orange, label: "наибольшее растяжение" },
             { x: hs, y: hs.map(() => 1.6), color: COL.stamp, dash: "5 4", width: 1.5, label: "Rbt = 1,60" }],
    marks: mk.map((i) => ({ x: hs[i], y: D.E3[i].smin, color: COL.stamp, text: fmt(D.E3[i].smin) + " МПа", dy: 18 })) });
}
function lab() {
  const i = +$("hole").value, r = D.E3[i], a = 20.254 / 2, c = a * r.hole;
  $("hole-v").textContent = r.hole.toFixed(2).replace(".", ",");
  $("sec").innerHTML = `<path fill-rule="evenodd" fill="${COL.blue}" opacity=".85" d="M${-a},${-a}H${a}V${a}H${-a}Z M${-c},${-c}V${c}H${c}V${-c}Z"/>
    <text x="0" y="${a + 1.6}" text-anchor="middle" font-size="1.4" fill="currentColor">сечение у опоры, сторона 20,25 м</text>`;
  $("r-w").textContent = fmt(r.weight) + " т";
  $("r-s").textContent = fmt(r.smin) + " МПа";
  $("r-t").textContent = r.smax > 0 ? fmt(r.smax) + " МПа" + (r.smax > 1.6 ? " > Rbt" : "") : "нет";
  $("r-dz").textContent = fmt(r.dz) + " мм";
  holeCharts(i);
}
$("hole").addEventListener("input", lab);

drawAll(); lab();
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { drawAll(); lab(); }, 150); });
