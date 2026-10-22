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

const fs = require("fs");
const SUM = JSON.parse(fs.readFileSync(OUT + "summary.json"));
const BROWN = fs.readFileSync(OUT + "gold_agreement_brown.csv", "utf8").trim().split("\n").slice(1).map(l => l.split(","));
const LAB = ["Path", "Wu-Palmer", "LCH", "Resnik", "Lin"];
const note = (s, t) => s.addNotes(t);
const bullets = (items, opts = {}) => items.map((t, i) => ({
  text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6, ...opts } }));

// ---------------------------------------------------------------- 1 cover
let s = pres.addSlide({ masterName: "COVER" });
s.addText("PROBLEM 15  |  MT-AIML  |  NLP PREPROCESSING & LANGUAGE MODELING", { x: 0.5, y: 0.45, w: 9, h: 0.3, fontSize: 11, color: C.accent1, bold: true, charSpacing: 2, isTextBox: true, margin: 0 });
s.addText("WordNet Similarity Measures for Legal Speech Analysis", { x: 0.5, y: 0.85, w: 5.6, h: 1.5, fontFace: "Georgia", fontSize: 30, bold: true, color: C.background1, valign: "top", isTextBox: true, margin: 0 });
s.addText("Taxonomic vs information-theoretic closeness between courtroom transcript terms and statute definitions", { x: 0.5, y: 2.4, w: 5.4, h: 0.8, fontSize: 14, color: C.background2, isTextBox: true, margin: 0 });
const det = [["Name", "[Your full name]"], ["Enrollment no.", "[Enrollment number]"], ["Programme", "B.Tech IT (AI & ML Honors), SCET, Sarvajanik University"],
  ["Academic year", "2026-27, Semester 6"], ["Email / Mobile", "[email]  /  [mobile]"], ["Submission", "Final submission: 7 Oct 2026"]];
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


// ---------------------------------------------------------------- architecture
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("System architecture and data flow", { placeholder: "title" });
const stages = [["Transcript", "raw text"], ["Preprocessing", "clean, split, tokenise, lemmatise"], ["Legal lexicon", "term to hand-checked synset"], ["Similarity engine", "Path, WuP, LCH, Resnik, Lin"], ["Outputs", "tables, charts, app, reports"]];
stages.forEach((st, i) => {
  const x = 0.5 + i * 1.85;
  s.addShape(pres.ShapeType.roundRect, { x, y: 1.3, w: 1.6, h: 1.3, rectRadius: 0.1, fill: { color: i === 3 ? C.accent2 : C.background1 }, line: { color: C.accent2, width: 1.25 }, objectName: "Stage " + (i + 1) });
  s.addText([{ text: st[0], options: { bold: true, fontSize: 13, breakLine: true, color: i === 3 ? C.background1 : C.accent2 } }, { text: st[1], options: { fontSize: 10, color: i === 3 ? C.background2 : C.text1 } }], { x, y: 1.3, w: 1.6, h: 1.3, align: "center", valign: "middle", isTextBox: true, margin: 4 });
  if (i < 4) s.addShape(pres.ShapeType.rightArrow, { x: x + 1.62, y: 1.82, w: 0.2, h: 0.26, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 } });
});
s.addText([{ text: "preprocessing.py", options: { bold: true } }, { text: "  cleaning, loaders, term extraction" }], { x: 0.5, y: 2.75, w: 9, h: 0.3, fontSize: 11, color: C.accent4, isTextBox: true, margin: 0 });
s.addText([{ text: "models.py", options: { bold: true } }, { text: "  five measures, IC tables, matrices, correlations, statute matching" }], { x: 0.5, y: 3.0, w: 9, h: 0.3, fontSize: 11, color: C.accent4, isTextBox: true, margin: 0 });
s.addText([{ text: "pipeline.py", options: { bold: true } }, { text: "  evaluation runner;   " }, { text: "app.py", options: { bold: true } }, { text: "  Streamlit interface" }], { x: 0.5, y: 3.25, w: 9, h: 0.3, fontSize: 11, color: C.accent4, isTextBox: true, margin: 0 });
s.addText(bullets([
  "One verified synset per term, so errors are not caused by sense disambiguation.",
  "Statute matching uses a normalised-score threshold (0.6); below it the tool reports no confident match.",
  "Two IC corpora supported (Genesis with add-1 smoothing, Brown).",
], { fontSize: 12 }), { x: 0.5, y: 3.7, w: 9, h: 1.4, color: C.text1, valign: "top", isTextBox: true, margin: 0 });

// ---------------------------------------------------------------- data
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Data and evaluation setup", { placeholder: "title" });
const cards = [[SUM.n_pairs, "term pairs scored"], [SUM.n_related, "related legal pairs"], [SUM.n_control, "unrelated control pairs"], [SUM.n_transcript_sentences, "transcript sentences"], [SUM.n_legal_term_occurrences, "legal-term occurrences"], [SUM.n_distinct_legal_terms, "distinct legal terms"]];
cards.forEach((c, i) => {
  const x = 0.5 + (i % 3) * 3.05, y = 1.2 + Math.floor(i / 3) * 1.45;
  s.addShape(pres.ShapeType.roundRect, { x, y, w: 2.85, h: 1.25, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: C.accent4, width: 0.75 }, objectName: "Stat card " + (i + 1) });
  s.addText(String(c[0]), { x, y: y + 0.1, w: 2.85, h: 0.65, align: "center", fontFace: "Georgia", fontSize: 34, bold: true, color: C.accent2, isTextBox: true, margin: 0 });
  s.addText(c[1], { x, y: y + 0.75, w: 2.85, h: 0.35, align: "center", fontSize: 12, color: C.text1, isTextBox: true, margin: 0 });
});
s.addText(bullets([
  "Each pair has a relatedness rating from 0 (unrelated) to 4 (closely related).",
  "Caveat: ratings were assigned by the project author, and the transcript is a short synthetic excerpt. Results show behaviour on this set, not a benchmark.",
], { fontSize: 12 }), { x: 0.5, y: 4.2, w: 9, h: 1.0, color: C.text1, valign: "top", isTextBox: true, margin: 0 });

// ---------------------------------------------------------------- 8 interface
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Web application and reports", { placeholder: "title" });
s.addText([
  { text: "Four tabs in the web app", options: { bold: true, breakLine: true, color: C.accent2, fontSize: 14, paraSpaceAfter: 6 } },
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
s.addText("Sample output: Wu-Palmer matrix, 17 legal terms", { x: 5.55, y: 4.6, w: 3.95, h: 0.4, fontSize: 10, italic: true, color: C.accent4, isTextBox: true, margin: 0 });


// ---------------------------------------------------------------- results: gold agreement
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Result 1: agreement with gold ratings", { placeholder: "title" });
const gA = SUM.gold_agreement.map(r => r.spearman), gB = BROWN.map(r => parseFloat(r[1]));
s.addChart(pres.charts.BAR, [{ name: "Genesis IC", labels: LAB, values: gA }, { name: "Brown IC", labels: LAB, values: gB }], {
  x: 0.4, y: 1.1, w: 5.7, h: 3.9, barDir: "col", barGrouping: "clustered", chartColors: ["1F3A5F", "B8893B"],
  showTitle: true, title: "Spearman correlation with gold ratings", titleFontSize: 12, titleFontFace: "+mn-lt", titleColor: "1B1F27",
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", dataLabelFontSize: 9, dataLabelFontFace: "+mn-lt",
  valAxisMinVal: 0, valAxisMaxVal: 0.8, valAxisLabelFontSize: 10, catAxisLabelFontSize: 10, valAxisLabelFontFace: "+mn-lt", catAxisLabelFontFace: "+mn-lt",
  valAxisLabelColor: "4F5B6B", catAxisLabelColor: "4F5B6B", valGridLine: { color: "D9D4C7", size: 0.5 }, catGridLine: { style: "none" },
  showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt" });
s.addText(bullets([
  `All five measures reach Spearman ${Math.min(...gA).toFixed(2)} to ${Math.max(...gA).toFixed(2)} (Genesis IC).`,
  "Lin is highest, by a small margin.",
  "With 28 pairs, 95% bootstrap intervals overlap heavily (for example Lin 0.30 to 0.80).",
  "Conclusion: all measures capture a moderate monotone link with the gold ratings; none clearly beats the others.",
], { fontSize: 13 }), { x: 6.3, y: 1.3, w: 3.3, h: 3.7, color: C.text1, valign: "top", isTextBox: true, margin: 0 });
note(s, "Bootstrap intervals are in the Evaluation Report, section 2.");

// ---------------------------------------------------------------- results: separation
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Result 2: related versus unrelated pairs", { placeholder: "title" });
const sp = SUM.control_separation;
s.addChart(pres.charts.BAR, [{ name: "Related pairs", labels: LAB, values: sp.map(r => r.related_mean) }, { name: "Unrelated controls", labels: LAB, values: sp.map(r => r.control_mean) }], {
  x: 0.4, y: 1.1, w: 5.7, h: 3.9, barDir: "col", barGrouping: "clustered", chartColors: ["5B8C6B", "A44A3F"],
  showTitle: true, title: "Mean normalised score (0 to 1)", titleFontSize: 12, titleFontFace: "+mn-lt", titleColor: "1B1F27",
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", dataLabelFontSize: 9, dataLabelFontFace: "+mn-lt",
  valAxisMinVal: 0, valAxisMaxVal: 0.7, valAxisLabelFontSize: 10, catAxisLabelFontSize: 10, valAxisLabelFontFace: "+mn-lt", catAxisLabelFontFace: "+mn-lt",
  valAxisLabelColor: "4F5B6B", catAxisLabelColor: "4F5B6B", valGridLine: { color: "D9D4C7", size: 0.5 }, catGridLine: { style: "none" },
  showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt" });
const gaps = sp.map(r => r.gap);
s.addText(bullets([
  `Every measure scores related pairs well above controls (gap ${Math.min(...gaps).toFixed(2)} to ${Math.max(...gaps).toFixed(2)}).`,
  `Lin has the largest gap (${sp[4].gap.toFixed(2)}); Path the smallest (${sp[0].gap.toFixed(2)}).`,
  "Path scores are low overall, because shortest paths between specific legal concepts are long.",
  "Wu-Palmer has the highest control score, a warning sign (see failure cases).",
], { fontSize: 13 }), { x: 6.3, y: 1.3, w: 3.3, h: 3.7, color: C.text1, valign: "top", isTextBox: true, margin: 0 });

// ---------------------------------------------------------------- disagreement
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Where the two families disagree", { placeholder: "title" });
s.addTable([
  [hdr("Pair"), hdr("Wu-Palmer"), hdr("Resnik"), hdr("WuP rank"), hdr("Resnik rank")],
  [cell("lawyer - prosecutor"), cell("0.952"), cell("4.119"), cell("1"), cell("10")],
  [cell("judge - prosecutor"), cell("0.909"), cell("4.102"), cell("3"), cell("11")],
  [cell("oath - testimony"), cell("0.615"), cell("5.373"), cell("14.5"), cell("9")],
  [cell("damages - fine"), cell("0.762"), cell("7.984"), cell("10"), cell("5")],
], { x: 0.5, y: 1.2, w: 5.6, colW: [1.7, 1.1, 0.8, 0.95, 1.05], border: { type: "solid", color: C.accent4, pt: 0.5 }, fill: { color: C.background1 }, rowH: 0.45, valign: "middle", fontSize: 11 });
s.addText(bullets([
  "Path and LCH: correlation 1.00, identical rankings (LCH is a monotone function of path length).",
  "Resnik and Lin: correlation 0.97.",
  "Path versus Resnik 0.83, Path versus Lin 0.85: the weakest links, where the families truly differ.",
], { fontSize: 12 }), { x: 6.3, y: 1.2, w: 3.3, h: 2.6, color: C.text1, valign: "top", isTextBox: true, margin: 0 });
s.addShape(pres.ShapeType.roundRect, { x: 0.5, y: 3.65, w: 9, h: 1.3, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: C.accent1, width: 1.25 } });
s.addText([{ text: "Central contrast. ", options: { bold: true, color: C.accent2 } }, { text: "Taxonomic measures reward proximity in the tree: lawyer, prosecutor and judge are close in the person branch. Information-theoretic measures reward the specificity of what is shared: damages and fine share a specific money concept." }], { x: 0.7, y: 3.7, w: 8.6, h: 1.2, fontSize: 13, color: C.text1, valign: "middle", isTextBox: true, margin: 0 });
note(s, "Spearman correlations from outputs/metric_correlations_spearman.csv.");

// ---------------------------------------------------------------- statute matching
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Transcript-to-statute matching", { placeholder: "title" });
const cm = SUM.terms_with_confident_match;
s.addChart(pres.charts.BAR, [{ name: "Confident matches", labels: LAB, values: ["Path", "Wu-Palmer", "Leacock-Chodorow", "Resnik", "Lin"].map(k => cm[k]) }], {
  x: 0.4, y: 1.1, w: 5.2, h: 3.9, barDir: "col", chartColors: ["1F3A5F"],
  showTitle: true, title: `Terms with a confident match (of ${SUM.n_distinct_legal_terms})`, titleFontSize: 12, titleFontFace: "+mn-lt", titleColor: "1B1F27",
  showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelFontFace: "+mn-lt",
  valAxisMinVal: 0, valAxisMaxVal: 25, valAxisLabelFontSize: 10, catAxisLabelFontSize: 10, valAxisLabelFontFace: "+mn-lt", catAxisLabelFontFace: "+mn-lt",
  valAxisLabelColor: "4F5B6B", catAxisLabelColor: "4F5B6B", valGridLine: { color: "D9D4C7", size: 0.5 }, catGridLine: { style: "none" }, showLegend: false });
s.addText(bullets([
  `Each distinct term is matched to the closest of 10 statute terms; threshold ${SUM.match_threshold} on a 0-1 scale.`,
  "Terms identical to a statute term score the maximum under every measure.",
  "Person terms (plaintiff, defendant, judge, attorney) get no confident match: the statute list has no person terms, and the threshold refuses to force one.",
  "Good matches: damages to Fine, trial and appeal to Verdict.",
], { fontSize: 12 }), { x: 5.8, y: 1.2, w: 3.8, h: 3.8, color: C.text1, valign: "top", isTextBox: true, margin: 0 });

// ---------------------------------------------------------------- failure cases
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Failure cases found", { placeholder: "title" });
const fails = [
  ["Similarity is not relatedness", "judge and dog score 0.67 on Wu-Palmer: both are organisms and meet at organism.n.01 (depth 5). Court and judge, strongly related, score 0.15: they meet only at the root."],
  ["Path scores compress", "contract and agreement, a near-synonym pair, score 0.33 on Path but 0.86 on Wu-Palmer. Absolute Path values are hard to threshold."],
  ["Negative information content", "Genesis with add-1 smoothing gives the root a slightly negative IC (about -0.083), so Resnik and Lin can dip just below zero. Brown gives exactly 0."],
  ["Hierarchy coverage", "statute resolves to legislative_act.n.01, far from law.n.01, so law and statute score low although a lawyer treats them as close."],
];
fails.forEach((f, i) => {
  const x = 0.5 + (i % 2) * 4.6, y = 1.15 + Math.floor(i / 2) * 2.0;
  s.addShape(pres.ShapeType.roundRect, { x, y, w: 4.4, h: 1.85, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: C.accent5, width: 1 }, objectName: "Failure card " + (i + 1) });
  s.addText(f[0], { x: x + 0.2, y: y + 0.1, w: 4.0, h: 0.35, fontSize: 13, bold: true, color: C.accent5, isTextBox: true, margin: 0 });
  s.addText(f[1], { x: x + 0.2, y: y + 0.5, w: 4.0, h: 1.25, fontSize: 11.5, color: C.text1, valign: "top", isTextBox: true, margin: 0 });
});

// ---------------------------------------------------------------- limitations and future
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Limitations and future work", { placeholder: "title" });
function box2(x, title, items, accent) {
  s.addShape(pres.ShapeType.roundRect, { x, y: 1.2, w: 4.35, h: 3.7, rectRadius: 0.1, fill: { color: C.background1 }, line: { color: accent, width: 1.25 } });
  s.addText(title, { x: x + 0.25, y: 1.3, w: 3.9, h: 0.4, fontSize: 15, bold: true, color: accent, fontFace: "Georgia", isTextBox: true, margin: 0 });
  s.addText(bullets(items), { x: x + 0.25, y: 1.8, w: 3.9, h: 3.0, fontSize: 12, color: C.text1, valign: "top", isTextBox: true, margin: 0 });
}
box2(0.5, "Limitations", [
  "28 pairs and author-assigned ratings: correlations are imprecise.",
  "Synthetic transcript; 10 statute terms.",
  "WordNet is general English; legal relations are not hypernym links.",
  "Genesis (biblical text) is a poor IC proxy for legal usage.",
  "Nouns and single words only.",
], C.accent5);
box2(5.15, "Future work", [
  "Ratings from several independent annotators.",
  "IC estimated from a legal corpus.",
  "Multi-word terms and sense disambiguation.",
  "Combine taxonomic and IC scores in one ranking.",
  "Test on real court transcripts.",
], C.accent6);

// ---------------------------------------------------------------- conclusion
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Conclusion", { placeholder: "title" });
[["1", "All five measures separate related legal pairs from unrelated ones and correlate moderately with gold ratings. None clearly dominates on 28 pairs."],
 ["2", "Path and Leacock-Chodorow are rank-equivalent; Resnik and Lin behave alike. The real comparison is path family versus information-content family."],
 ["3", "Taxonomic measures judge closeness in the hierarchy; IC measures judge the specificity of what is shared. For legal text, use both, with a legal IC corpus and expert ratings."]].forEach((c, i) => {
  const y = 1.25 + i * 1.25;
  s.addShape(pres.ShapeType.ellipse, { x: 0.5, y: y + 0.12, w: 0.7, h: 0.7, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 } });
  s.addText(c[0], { x: 0.5, y: y + 0.12, w: 0.7, h: 0.7, align: "center", valign: "middle", fontFace: "Georgia", fontSize: 22, bold: true, color: C.background1, isTextBox: true, margin: 0 });
  s.addText(c[1], { x: 1.45, y, w: 8.0, h: 0.95, fontSize: 14, color: C.text1, valign: "middle", isTextBox: true, margin: 0 });
});

(async () => {
  await pres.writeFile({ fileName: "Problem15_Final.pptx" });
  await applyTheme("Problem15_Final.pptx", THEME);
  console.log("written");
})();
