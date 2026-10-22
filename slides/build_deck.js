const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/mnt/skills/public/pptx/scripts/apply_theme.js");
const OUT = process.env.HOME + "/problem15/outputs/";

const THEME = {
  name: "Legal Navy", headFontFace: "Georgia", bodyFontFace: "Calibri",
  colors: { dk1: "1B1F27", lt1: "FFFFFF", dk2: "14263F", lt2: "F6F3EC",
    accent1: "B8893B", accent2: "1F3A5F", accent3: "4F7CAC", accent4: "7A8CA3",
    accent5: "A44A3F", accent6: "5B8C6B", hlink: "1F3A5F", folHlink: "7A8CA3" },
};
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = "Twisha"; pres.title = "Problem 15 - WordNet Similarity for Legal Speech Analysis";
const C = pres.SchemeColor;

pres.defineSlideMaster({
  title: "COVER", background: { color: C.text2 },
  objects: [],
});
pres.defineSlideMaster({
  title: "CONTENT", background: { color: C.background2 },
  objects: [
    { rect: { x: 0, y: 0, w: 10, h: 0.95, fill: { color: C.text2 } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.12, w: 9, h: 0.7, fontFace: "Georgia", fontSize: 22, bold: true, color: C.background1, valign: "middle", align: "left", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 9.2, y: 5.25, w: 0.5, h: 0.25, fontSize: 10, color: C.accent4 },
});

const note = (s, t) => s.addNotes(t);
const bullets = (items, opts = {}) => items.map((t, i) => ({
  text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6, ...opts } }));

// ---------------------------------------------------------------- 1 cover
let s = pres.addSlide({ masterName: "COVER" });
s.addText("PROBLEM 15  |  MT-AIML  |  NLP PREPROCESSING & LANGUAGE MODELING", { x: 0.5, y: 0.45, w: 9, h: 0.3, fontSize: 11, color: C.accent1, bold: true, charSpacing: 2, isTextBox: true, margin: 0 });
s.addText("WordNet Similarity Measures for Legal Speech Analysis", { x: 0.5, y: 0.85, w: 5.6, h: 1.5, fontFace: "Georgia", fontSize: 30, bold: true, color: C.background1, valign: "top", isTextBox: true, margin: 0 });
s.addText("Taxonomic vs information-theoretic closeness between courtroom transcript terms and statute definitions", { x: 0.5, y: 2.4, w: 5.4, h: 0.8, fontSize: 14, color: C.background2, isTextBox: true, margin: 0 });
const det = [["Name", "[Your full name]"], ["Enrollment no.", "[Enrollment number]"], ["Programme", "B.Tech IT (AI & ML Honors), SCET, Sarvajanik University"],
  ["Academic year", "2026-27, Semester 6"], ["Email / Mobile", "[email]  /  [mobile]"], ["Submission", "Primary update: 3 Oct 2026"]];
s.addTable(det.map(r => [
  { text: r[0], options: { bold: true, color: C.accent1, fontSize: 11 } },
  { text: r[1], options: { color: C.background1, fontSize: 11 } }]),
  { x: 0.5, y: 3.35, w: 5.6, colW: [1.4, 4.2], border: { type: "none" }, margin: [2, 4, 2, 0], rowH: 0.3 });
s.addShape(pres.ShapeType.roundRect, { x: 6.9, y: 0.95, w: 2.4, h: 3.0, rectRadius: 0.15, fill: { color: C.accent2 }, line: { color: C.accent1, width: 1.5 }, objectName: "Photo frame" });
s.addText("Student photograph\n(insert here)", { x: 6.9, y: 0.95, w: 2.4, h: 3.0, align: "center", valign: "middle", fontSize: 12, color: C.accent4, isTextBox: true });
note(s, "Fill in name, enrollment number, email, mobile and insert the photograph before submitting.");

// ---------------------------------------------------------------- 2 problem
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("The problem: linking speech to statute terms", { placeholder: "title" });
s.addText(bullets([
  "Courtroom speech reaches software as ASR transcripts; statutes use fixed, formal terms.",
  "Speakers vary their words: agreement for contract, theft for larceny, penalty for fine.",
  "Exact keyword match misses these links; a number for conceptual closeness is needed.",
  "Task: build a tool that scores term-to-term closeness using the WordNet hierarchy and compare two families of measures.",
]), { x: 0.5, y: 1.25, w: 5.2, h: 3.6, fontSize: 15, color: C.text1, valign: "top", isTextBox: true, margin: 0 });
s.addShape(pres.ShapeType.roundRect, { x: 6.1, y: 1.3, w: 3.4, h: 3.4, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: C.accent4, width: 0.75 } });
s.addText("Closeness should look like this", { x: 6.3, y: 1.4, w: 3.0, h: 0.35, fontSize: 12, bold: true, color: C.accent2, isTextBox: true, margin: 0 });
[["contract  -  agreement", "high"], ["crime  -  larceny", "high"], ["judge  -  dog", "near zero"]].forEach((r, i) => {
  const y = 1.9 + i * 0.95;
  s.addText(r[0], { x: 6.3, y, w: 3.0, h: 0.4, fontSize: 15, bold: true, color: C.text1, isTextBox: true, margin: 0 });
  s.addText(r[1], { x: 6.3, y: y + 0.4, w: 3.0, h: 0.35, fontSize: 13, color: i < 2 ? C.accent6 : C.accent5, bold: true, isTextBox: true, margin: 0 });
});
note(s, "Motivation: legal retrieval and transcript-to-statute linking.");

// ---------------------------------------------------------------- 3 understanding
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Understanding: WordNet is a tree of is-a links", { placeholder: "title" });
s.addText("Words are grouped into synsets. Each synset points to a more general parent (hypernym) up to one root, entity.n.01. Closeness depends on where two synsets meet.", { x: 0.5, y: 1.1, w: 9, h: 0.65, fontSize: 14, color: C.text1, isTextBox: true, margin: 0 });
function chain(x, y, label, nodes, accent) {
  s.addText(label, { x, y, w: 4.2, h: 0.3, fontSize: 12, bold: true, color: accent, isTextBox: true, margin: 0 });
  nodes.forEach((n, i) => {
    const ny = y + 0.4 + i * 0.62;
    s.addShape(pres.ShapeType.roundRect, { x: x + 0.3, y: ny, w: 3.4, h: 0.44, rectRadius: 0.08, fill: { color: n.hl ? accent : C.background1 }, line: { color: accent, width: 1 } });
    s.addText(n.t, { x: x + 0.3, y: ny, w: 3.4, h: 0.44, align: "center", valign: "middle", fontSize: 12, bold: !!n.hl, color: n.hl ? C.background1 : C.text1, isTextBox: true, margin: 0 });
  });
}
chain(0.5, 1.9, "Close: crime and larceny share a specific parent", [{ t: "crime.n.01  (shared parent)", hl: true }, { t: "felony.n.01" }, { t: "larceny.n.01" }], C.accent6);
chain(5.2, 1.9, "Distant: court and judge meet only at the root", [{ t: "entity.n.01  (shared parent)", hl: true }, { t: "court.n.01  (institution)" }, { t: "judge.n.01  (person)" }], C.accent5);
s.addText("Verified with NLTK WordNet on this project's data: lowest common hypernym of crime/larceny = crime.n.01; court/judge = entity.n.01.", { x: 0.5, y: 4.85, w: 9, h: 0.4, fontSize: 11, italic: true, color: C.accent4, isTextBox: true, margin: 0 });
note(s, "Hypernym paths come from the prototype output. Depth of larceny.n.01 is 10; crime.n.01 is 8.");

// ---------------------------------------------------------------- 4 metrics
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Understanding: two families of measures", { placeholder: "title" });
const hdr = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.accent2 }, fontSize: 12 } });
const cell = (t, o = {}) => ({ text: t, options: { fontSize: 12, color: C.text1, ...o } });
s.addTable([
  [hdr("Family"), hdr("Measure"), hdr("Formula"), hdr("What it rewards")],
  [cell("Taxonomic", { bold: true }), cell("Path"), cell("1 / (len + 1)"), cell("Short route between synsets")],
  [cell(""), cell("Wu-Palmer"), cell("2·depth(LCS) / (depth a + depth b)"), cell("A deep shared ancestor")],
  [cell(""), cell("Leacock-Chodorow"), cell("-log((len + 1) / 2D)"), cell("Log-scaled path length")],
  [cell("Information-theoretic", { bold: true }), cell("Resnik"), cell("IC(LCS)"), cell("A specific shared ancestor")],
  [cell(""), cell("Lin"), cell("2·IC(LCS) / (IC a + IC b)"), cell("Resnik, normalised to 0-1")],
], { x: 0.5, y: 1.2, w: 9, colW: [2.0, 1.8, 3.1, 2.1], border: { type: "solid", color: C.accent4, pt: 0.5 }, fill: { color: C.background1 }, rowH: 0.46, valign: "middle" });
s.addText("LCS = lowest common subsumer.  IC(c) = -log P(c), estimated from a corpus (Genesis or Brown).  D = max taxonomy depth.", { x: 0.5, y: 4.15, w: 9, h: 0.35, fontSize: 11, color: C.accent4, italic: true, isTextBox: true, margin: 0 });
s.addText("Key question: do tree-distance measures and corpus-specificity measures agree on legal terms?", { x: 0.5, y: 4.6, w: 9, h: 0.45, fontSize: 14, bold: true, color: C.accent2, isTextBox: true, margin: 0 });

// ---------------------------------------------------------------- 5 scope
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Scope of the solution", { placeholder: "title" });
function box(x, title, items, accent) {
  s.addShape(pres.ShapeType.roundRect, { x, y: 1.3, w: 4.35, h: 3.4, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: accent, width: 1.25 } });
  s.addText(title, { x: x + 0.25, y: 1.4, w: 3.9, h: 0.4, fontSize: 15, bold: true, color: accent, fontFace: "Georgia", isTextBox: true, margin: 0 });
  s.addText(bullets(items), { x: x + 0.25, y: 1.9, w: 3.95, h: 3.0, fontSize: 13, color: C.text1, valign: "top", isTextBox: true, margin: 0 });
}
box(0.5, "In scope", [
  "Five WordNet measures: Path, Wu-Palmer, LCH, Resnik, Lin",
  "Noun pairs; one verified sense per legal term",
  "Pairwise matrices, correlations between metrics",
  "Transcript-to-statute matching with a confidence threshold",
  "Streamlit web app and two PDF reports",
], C.accent6);
box(5.15, "Out of scope (stated limits)", [
  "Automatic sense disambiguation (covered by Problems 13, 14, 19)",
  "Multi-word terms and verbs",
  "Training on a legal corpus; IC uses Genesis or Brown",
  "Claims of benchmark accuracy: gold ratings are small and author-assigned",
], C.accent5);

// ---------------------------------------------------------------- 6 existing 1
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Existing solutions (1/2): the research measures", { placeholder: "title" });
s.addText(bullets([
  "Wu & Palmer (1994). Verb semantics and lexical selection. ACL.",
  "Leacock & Chodorow (1998). Combining local context and WordNet similarity for word sense identification. In WordNet: An Electronic Lexical Database, MIT Press.",
  "Resnik (1995). Using information content to evaluate semantic similarity in a taxonomy. IJCAI. arXiv:cmp-lg/9511007.",
  "Lin (1998). An information-theoretic definition of similarity. ICML.",
  "Pedersen, Patwardhan & Michelizzi (2004). WordNet::Similarity: measuring the relatedness of concepts. NAACL (Demonstrations).",
  "Budanitsky & Hirst (2006). Evaluating WordNet-based measures of lexical semantic relatedness. Computational Linguistics 32(1).",
]), { x: 0.5, y: 1.2, w: 9, h: 3.6, fontSize: 14, color: C.text1, valign: "top", isTextBox: true, margin: 0 });
s.addText("These define the five measures this project implements and the similarity-versus-relatedness distinction it tests.", { x: 0.5, y: 4.9, w: 9, h: 0.4, fontSize: 12, italic: true, color: C.accent2, isTextBox: true, margin: 0 });

// ---------------------------------------------------------------- 7 existing 2
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Existing solutions (2/2): tools, and the gap", { placeholder: "title" });
s.addTable([
  [hdr("Existing tool"), hdr("What it offers"), hdr("Limit for legal speech")],
  [cell("NLTK WordNet interface\nnltk.org/howto/wordnet.html"), cell("All five measures; Brown and other IC files"), cell("General English; no legal relations")],
  [cell("Princeton WordNet\nwordnet.princeton.edu"), cell("Synsets and hypernym hierarchy"), cell("Court and judge meet only at the root")],
  [cell("LEGAL-BERT\nChalkidis et al., 2020 (Findings of EMNLP)"), cell("Contextual embeddings pre-trained on legal text"), cell("Needs compute; scores are not interpretable as tree distance")],
], { x: 0.5, y: 1.2, w: 9, colW: [3.1, 3.0, 2.9], border: { type: "solid", color: C.accent4, pt: 0.5 }, fill: { color: C.background1 }, valign: "middle", rowH: [0.4, 0.75, 0.75, 0.75] });
s.addText("Gap this project addresses", { x: 0.5, y: 4.0, w: 9, h: 0.3, fontSize: 13, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
s.addText("A small, interpretable tool that compares the measures side by side on legal terms, shows where they disagree, and documents the failure cases.", { x: 0.5, y: 4.3, w: 9, h: 0.7, fontSize: 14, color: C.text1, isTextBox: true, margin: 0 });
note(s, "Verify the links and citations against the originals before final submission.");

// ---------------------------------------------------------------- 8 interface
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Application interface and reports", { placeholder: "title" });
s.addText([
  { text: "Four tabs (prototype running)", options: { bold: true, breakLine: true, color: C.accent2, fontSize: 14, paraSpaceAfter: 6 } },
  ...bullets([
    "Compare two terms: pick senses, see all five scores and the hierarchy path",
    "Similarity matrix: choose terms and metric, heat-map table",
    "Transcript to statutes: paste text, set threshold, see best statute match",
    "Evaluation: agreement with gold ratings, metric correlations, all pair scores",
  ], { fontSize: 12 }).map((o, i, a) => i === a.length - 1 ? { ...o, options: { ...o.options, breakLine: true } } : o),
  { text: "Reports (docs/)", options: { bold: true, breakLine: true, color: C.accent2, fontSize: 14, paraSpaceBefore: 8, paraSpaceAfter: 4 } },
  { text: "Architecture & Methodology: formulas, design, limits", options: { bullet: true, breakLine: true, fontSize: 12 } },
  { text: "Evaluation Report: tables, charts, failure analysis", options: { bullet: true, fontSize: 12 } },
], { x: 0.5, y: 1.15, w: 4.9, h: 3.9, color: C.text1, valign: "top", isTextBox: true, margin: 0 });
s.addImage({ path: OUT + "matrix_wup.png", x: 5.55, y: 1.15, w: 3.95, h: 3.4, sizing: { type: "contain", w: 3.95, h: 3.4 }, altText: "Wu-Palmer similarity matrix heat map for 17 legal terms" });
s.addText("Sample output from the prototype: Wu-Palmer matrix, 17 legal terms", { x: 5.55, y: 4.6, w: 3.95, h: 0.4, fontSize: 10, italic: true, color: C.accent4, isTextBox: true, margin: 0 });

// ---------------------------------------------------------------- 9 plan
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Work plan", { placeholder: "title" });
const st = (t, c) => cell(t, { bold: true, color: c });
s.addTable([
  [hdr("Dates"), hdr("Work"), hdr("Status")],
  [cell("Up to 3 Oct"), cell("Preprocessing, five measures, evaluation pipeline, web app, two PDF reports"), st("Done (prototype)", C.accent6)],
  [cell("4-5 Oct"), cell("Replace synthetic transcript with real or public court text; collect gold ratings from 2-3 independent raters"), st("Planned", C.accent3)],
  [cell("5-6 Oct"), cell("Re-run evaluation; update reports and metric tables; record demo screenshots"), st("Planned", C.accent3)],
  [cell("6-7 Oct"), cell("Final slides (13), README check, upload code and app folders by 11:30 pm on 7 Oct"), st("Planned", C.accent3)],
], { x: 0.5, y: 1.25, w: 9, colW: [1.4, 5.9, 1.7], border: { type: "solid", color: C.accent4, pt: 0.5 }, fill: { color: C.background1 }, valign: "middle", rowH: [0.4, 0.65, 0.75, 0.65, 0.65] });
s.addText("Main risk: small, author-assigned gold set. Mitigation: independent raters and bootstrap confidence intervals (already in the report).", { x: 0.5, y: 4.55, w: 9, h: 0.5, fontSize: 12, italic: true, color: C.accent2, isTextBox: true, margin: 0 });

(async () => {
  await pres.writeFile({ fileName: "Problem15_Primary_Update.pptx" });
  await applyTheme("Problem15_Primary_Update.pptx", THEME);
  console.log("written");
})();
