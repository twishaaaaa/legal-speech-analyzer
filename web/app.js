/* UI wiring for the Legal Speech Analyzer. All analysis runs in the browser from data.json. */
(function () {
  "use strict";
  const PALETTE = ["#fde68a", "#bfdbfe", "#bbf7d0", "#fecaca", "#e9d5ff", "#fed7aa", "#a5f3fc", "#fbcfe8", "#d9f99d", "#ddd6fe"];
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const $ = (id) => document.getElementById(id);
  let D = null, last = null;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }
  const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const colour = (name) => PALETTE[D.statutes.findIndex((s) => s.name === name) % PALETTE.length];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---------- file reading ---------- */
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load the PDF reader."));
      document.head.append(s);
    });
  }
  async function readFile(file) {
    if (/\.pdf$/i.test(file.name)) {
      await loadScript(PDFJS);
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        pages.push(content.items.map((it) => it.str).join(" "));
      }
      const text = pages.join("\n").replace(/[ \t]+/g, " ").trim();
      if (!text) throw new Error("No selectable text found. Scanned PDFs need OCR first.");
      return text;
    }
    return file.text();
  }
  function showError(msg) {
    const b = $("banner"); clear(b); b.append(msg); b.hidden = false;
    clearTimeout(showError.t); showError.t = setTimeout(() => (b.hidden = true), 7000);
  }
  /* wire a textarea so it accepts drag-and-drop and an upload button */
  function bindInput({ textarea, fileInput, button, onText }) {
    const take = async (file) => {
      if (!file) return;
      try { textarea.value = await readFile(file); onText(); }
      catch (e) { showError(e.message || "Could not read that file."); }
    };
    button.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => { take(fileInput.files[0]); fileInput.value = ""; });
    const zone = textarea.closest(".drop");
    ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove("over"); }));
    zone.addEventListener("drop", (e) => take(e.dataTransfer.files[0]));
  }
  const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

  /* ---------- analyse view ---------- */
  function renderAnalyse() {
    const text = $("docInput").value;
    if (!text.trim()) { $("results").hidden = true; return; }
    const metric = $("metric").value, thr = parseFloat($("strict").value);
    const r = Logic.analyse(text, D, metric, thr);
    last = r;
    $("results").hidden = false;

    const touched = r.summary.filter((s) => s.mentions > 0).length;
    const tiles = [["Sentences", r.sents.length], ["Legal term mentions", r.occ.length],
                   ["Distinct legal terms", r.rows.length], ["Statutes touched", `${touched} of ${D.statutes.length}`]];
    const t = $("tiles"); clear(t);
    tiles.forEach(([k, v]) => t.append(h("div", { class: "tile glass" }, h("div", { class: "v" }, String(v)), h("div", { class: "k" }, k))));

    // statute bars
    const bars = $("bars"); clear(bars);
    const hit = r.summary.filter((s) => s.mentions > 0);
    if (!r.rows.length) bars.append(h("p", { class: "empty" }, "No known legal terms found in this text."));
    else if (!hit.length) bars.append(h("p", { class: "empty" }, "Legal terms were found, but none matched a statute confidently. Try lowering the strictness."));
    const max = Math.max(1, ...hit.map((s) => s.mentions));
    hit.forEach((s) => {
      const fill = h("div", { class: "fill", style: `background:${colour(s.name)}` });
      bars.append(h("div", { class: "bar-row" },
        h("div", { class: "top-line" }, h("span", {}, s.name), h("span", {}, plural(s.mentions, "mention"))),
        h("div", { class: "track" }, fill),
        h("div", { class: "chips small" }, s.terms.map((term) => h("span", { class: "chip" }, term))),
        h("p", { class: "def" }, s.definition)));
      requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = `${(s.mentions / max) * 100}%`)));
    });

    // highlighted text + legend
    const hl = $("highlight"); clear(hl);
    Logic.highlightSegments(text, r).forEach((seg) => {
      if (!seg.term) hl.append(seg.text);
      else if (seg.statute) hl.append(h("mark", { style: `background:${colour(seg.statute)}`, title: seg.statute }, seg.text));
      else hl.append(h("span", { class: "dotted" }, seg.text));
    });
    const lg = $("legend"); clear(lg);
    hit.forEach((s) => lg.append(h("span", { class: "chip swatch", style: `background:${colour(s.name)}` }, s.name)));

    // table
    const tb = $("tableBody"); clear(tb);
    r.rows.forEach((row) => {
      const cls = row.confidence === "High" ? "high" : row.confidence === "Medium" ? "medium" : "none";
      tb.append(h("tr", {},
        h("td", {}, h("strong", {}, row.term)),
        h("td", { class: "num" }, String(row.mentions)),
        h("td", {}, row.statute ? [h("span", { class: "dot", style: `background:${colour(row.statute)}` }), row.statute] : "-"),
        h("td", {}, h("span", { class: `badge ${cls}`, title: `Score ${row.score.toFixed(2)}` }, row.confidence)),
        h("td", { class: "why hide-sm" }, row.why)));
    });

    // sentences to read first
    const rf = $("readFirst"); clear(rf);
    if (!hit.length) rf.append(h("p", { class: "empty" }, "Nothing to show yet."));
    hit.forEach((s, i) => {
      const d = h("details", {}, h("summary", {}, h("span", {}, s.name), h("span", { class: "hint" }, plural(s.sentences.length, "sentence"))),
        h("p", { class: "def" }, s.definition),
        h("ol", {}, s.sentences.map((i2) => h("li", {}, h("b", {}, `${i2 + 1}.`), r.sents[i2].text))));
      if (i === 0) d.open = true;
      rf.append(d);
    });
  }

  /* ---------- compare view ---------- */
  function renderCompare() {
    const metric = $("cmpMetric").value;
    const a = Logic.documentTerms($("txtA").value, D), b = Logic.documentTerms($("txtB").value, D);
    const res = Logic.compareDocuments(a, b, D, metric);
    const ok = !!res;
    $("cmpEmpty").hidden = ok; $("cmpResult").hidden = !ok; $("cmpTableWrap").hidden = !ok;
    if (!ok) return;
    const pct = Math.round(res.score * 100);
    $("cmpPct").textContent = `${pct}%`;
    $("ringFg").style.strokeDashoffset = String(326.7 * (1 - res.score));
    $("cmpVerdict").textContent = `These documents are ${res.score >= 0.8 ? "very close in legal subject matter" : res.score >= 0.5 ? "partly overlapping" : "mostly different"}.`;
    const sh = $("cmpShared"); clear(sh);
    if (res.shared.length) res.shared.forEach((t) => sh.append(h("span", { class: "chip" }, t)));
    else sh.append(h("span", { class: "hint" }, "none"));
    const tb = $("cmpBody"); clear(tb);
    res.pairs.forEach((p) => tb.append(h("tr", {}, h("td", {}, h("strong", {}, p.a)), h("td", {}, p.b), h("td", { class: "num" }, p.v.toFixed(2)))));
  }

  /* ---------- setup ---------- */
  function setView(name) {
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.view === name;
      t.classList.toggle("active", on); t.setAttribute("aria-selected", String(on));
    });
    $("view-analyse").hidden = name !== "analyse";
    $("view-compare").hidden = name !== "compare";
  }

  async function init() {
    document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => setView(t.dataset.view)));
    try {
      const res = await fetch("data.json");
      if (!res.ok) throw new Error(String(res.status));
      D = await res.json();
    } catch (e) {
      const b = $("banner"); clear(b);
      b.append("Scores file not found. Run ", h("code", {}, "python export_data.py"), " once, then reload. ",
               "When previewing locally, serve this folder with ", h("code", {}, "python -m http.server"), " (opening the file directly will not work).");
      b.hidden = false; $("runBtn").disabled = true; return;
    }

    // analyse controls
    const chips = $("sampleChips");
    SAMPLES.forEach((s, i) => {
      const c = h("button", { class: "chip", type: "button", "data-id": s.id }, s.label);
      c.addEventListener("click", () => {
        $("docInput").value = s.text;
        chips.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === c));
        renderAnalyse();
      });
      chips.append(c);
    });
    const rerun = debounce(renderAnalyse, 250);
    $("docInput").addEventListener("input", () => { chips.querySelectorAll(".chip.on").forEach((x) => x.classList.remove("on")); rerun(); });
    $("metric").addEventListener("change", renderAnalyse);
    $("strict").addEventListener("input", () => { $("strictVal").textContent = parseFloat($("strict").value).toFixed(2); if (!$("results").hidden) renderAnalyse(); });
    $("runBtn").addEventListener("click", () => {
      if (!$("docInput").value.trim()) { showError("Add some text or pick a sample first."); return; }
      renderAnalyse(); $("results").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("downloadBtn").addEventListener("click", () => {
      if (!last) return;
      const url = URL.createObjectURL(new Blob([Logic.toCSV(last.rows)], { type: "text/csv" }));
      const a = h("a", { href: url, download: "legal_analysis.csv" }); document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
    bindInput({ textarea: $("docInput"), fileInput: $("fileInput"), button: $("uploadBtn"), onText: renderAnalyse });

    // compare controls
    const runCmp = debounce(renderCompare, 250);
    [["A", "standard_contract_clause"], ["B", "contract_dispute_sample"]].forEach(([k, def]) => {
      const sel = $("sel" + k);
      sel.append(h("option", { value: "" }, "Choose a sample…"));
      SAMPLES.forEach((s) => sel.append(h("option", { value: s.id }, s.label)));
      sel.addEventListener("change", () => { const s = SAMPLES.find((x) => x.id === sel.value); if (s) { $("txt" + k).value = s.text; renderCompare(); } });
      $("txt" + k).addEventListener("input", () => { sel.value = ""; runCmp(); });
      bindInput({ textarea: $("txt" + k), fileInput: $("file" + k), button: $("up" + k), onText: () => { sel.value = ""; renderCompare(); } });
      sel.value = def; $("txt" + k).value = SAMPLES.find((x) => x.id === def).text;
    });
    $("cmpMetric").addEventListener("change", renderCompare);

    // first impression: show a worked example
    $("docInput").value = SAMPLES[0].text;
    chips.firstChild.classList.add("on");
    renderAnalyse(); renderCompare();
  }
  init();
})();
