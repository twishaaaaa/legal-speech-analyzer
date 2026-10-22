/* Pure analysis logic for the Legal Speech Analyzer (no DOM). Mirrors src/analysis.py.
   Works in the browser (window.Logic) and in Node (module.exports) for testing. */
(function (root) {
  const HIGH = 0.85; // normalised score at/above this is labelled "High"

  function sentenceBounds(text) {
    // Boundaries after . ? ! followed by whitespace and a capital letter / quote.
    const cuts = [0];
    const re = /(?<=[.?!])\s+(?=[A-Z"'(])/g;
    let m;
    while ((m = re.exec(text))) cuts.push(m.index + m[0].length);
    cuts.push(text.length);
    const out = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const s = cuts[i], e = cuts[i + 1];
      if (text.slice(s, e).trim()) out.push({ start: s, end: e, text: text.slice(s, e).trim() });
    }
    return out;
  }

  function lemma(token, D) {
    let t = token.toLowerCase().replace(/’/g, "'");
    if (t.endsWith("'s")) t = t.slice(0, -2);
    return D.variants[t] || t;
  }

  function findTerms(text, D) {
    const sents = sentenceBounds(text);
    const occ = [];
    const re = /[A-Za-z]+(?:['’][A-Za-z]+)?/g;
    let m, si = 0;
    while ((m = re.exec(text))) {
      const term = lemma(m[0], D);
      if (!D.lexicon[term]) continue;
      while (si < sents.length - 1 && m.index >= sents[si].end) si++;
      occ.push({ term, sentence: si, start: m.index, end: m.index + m[0].length });
    }
    return { occ, sents };
  }

  function confidence(norm, thr) {
    if (norm >= HIGH && norm >= thr) return "High";
    if (norm >= thr) return "Medium";
    return "No confident match";
  }

  function bestStatute(term, D, metric, thr) {
    let best = null, bestV = -Infinity;
    for (const s of D.statutes) {
      const v = D.term_statute[term][s.name][metric];
      if (v !== null && v > bestV) { best = s.name; bestV = v; }
    }
    const ceil = D.ceilings[metric];
    const norm = ceil ? Math.max(bestV, 0) / ceil : 0;
    return { statute: norm >= thr ? best : null, norm, bestName: best };
  }

  function analyse(text, D, metric, thr) {
    const { occ, sents } = findTerms(text, D);
    const byTerm = new Map();
    for (const o of occ) {
      if (!byTerm.has(o.term)) byTerm.set(o.term, { term: o.term, mentions: 0, sentences: [] });
      const r = byTerm.get(o.term);
      r.mentions++;
      if (!r.sentences.includes(o.sentence)) r.sentences.push(o.sentence);
    }
    const rank = { "High": 0, "Medium": 1, "No confident match": 2 };
    const rows = [...byTerm.values()].map((r) => {
      const b = bestStatute(r.term, D, metric, thr);
      return {
        ...r,
        statute: b.statute,
        score: Math.round(b.norm * 100) / 100,
        confidence: confidence(b.norm, thr),
        why: b.statute ? D.why[r.term][b.statute] : "",
      };
    }).sort((a, b) => rank[a.confidence] - rank[b.confidence] || b.score - a.score);

    const summary = D.statutes.map((s, i) => {
      const hit = rows.filter((r) => r.statute === s.name);
      return {
        name: s.name, definition: s.definition, index: i,
        mentions: hit.reduce((n, r) => n + r.mentions, 0),
        terms: hit.map((r) => r.term),
        sentences: [...new Set(hit.flatMap((r) => r.sentences))].sort((a, b) => a - b),
      };
    }).sort((a, b) => b.mentions - a.mentions || a.index - b.index);

    return { occ, sents, rows, summary };
  }

  /* Text split into segments so the UI can build DOM safely (no innerHTML). */
  function highlightSegments(text, result) {
    const stat = new Map(result.rows.map((r) => [r.term, r.statute]));
    const segs = []; let pos = 0;
    for (const o of result.occ) {
      if (o.start > pos) segs.push({ text: text.slice(pos, o.start) });
      segs.push({ text: text.slice(o.start, o.end), term: true, statute: stat.get(o.term) || null });
      pos = o.end;
    }
    if (pos < text.length) segs.push({ text: text.slice(pos) });
    return segs;
  }

  function documentTerms(text, D) {
    return [...new Set(findTerms(text, D).occ.map((o) => o.term))];
  }

  /* Average of best-match similarity in both directions. metric: path | wup | lin */
  function compareDocuments(termsA, termsB, D, metric) {
    if (!termsA.length || !termsB.length) return null;
    const best = (src, dst) => src.map((a) => {
      let bt = null, bv = -Infinity;
      for (const b of dst) {
        const v = D.term_term[a][b][metric];
        if (v !== null && v > bv) { bt = b; bv = v; }
      }
      return { a, b: bt, v: bv };
    });
    const ab = best(termsA, termsB), ba = best(termsB, termsA);
    const mean = (xs) => xs.reduce((s, x) => s + x.v, 0) / xs.length;
    return {
      score: (mean(ab) + mean(ba)) / 2,
      pairs: ab.sort((x, y) => y.v - x.v),
      shared: termsA.filter((t) => termsB.includes(t)),
    };
  }

  function toCSV(rows) {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ["Legal term", "Mentions", "Sentences", "Matched statute", "Confidence", "Score (0-1)", "Why"];
    const lines = rows.map((r) => [r.term, r.mentions, r.sentences.map((i) => i + 1).join(" "),
      r.statute || "-", r.confidence, r.score, r.why].map(q).join(","));
    return [head.map(q).join(","), ...lines].join("\n");
  }

  const api = { HIGH, sentenceBounds, findTerms, analyse, highlightSegments,
                documentTerms, compareDocuments, toCSV };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== "undefined" ? window : globalThis);
