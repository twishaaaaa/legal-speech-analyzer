"""Builds docs/Architecture_and_Methodology.pdf and docs/Evaluation_Report.pdf
from the numbers in outputs/ (run `python src/pipeline.py` first)."""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer,
                                Table, TableStyle, Preformatted)
from scipy.stats import spearmanr

sys.path.insert(0, "src")
import models as M  # noqa: E402

ROOT = Path(__file__).parent
OUT, DOCS = ROOT / "outputs", ROOT / "docs"
DOCS.mkdir(exist_ok=True)
ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Heading1"], fontSize=15, spaceBefore=10, spaceAfter=6)
H2 = ParagraphStyle("H2", parent=ss["Heading2"], fontSize=12, spaceBefore=8, spaceAfter=4)
B = ParagraphStyle("B", parent=ss["BodyText"], fontSize=10, leading=14, spaceAfter=5)
SM = ParagraphStyle("SM", parent=B, fontSize=8.5, leading=11, textColor=colors.HexColor("#444444"))
CODE = ParagraphStyle("C", parent=ss["Code"], fontSize=8.5, leading=11, leftIndent=6)
TITLE = ParagraphStyle("T", parent=ss["Title"], fontSize=20, spaceAfter=4)


def P(t, s=B): return Paragraph(t, s)
def bullets(items): return [P("&bull; " + i) for i in items]


def table(df, widths=None, fs=8.5):
    data = [list(df.columns)] + [[(f"{v:.3f}" if isinstance(v, float) else str(v)) for v in r]
                                 for r in df.values.tolist()]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), fs), ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f5f9")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    return t


def img(name, w=15.5):
    from PIL import Image as PI
    iw, ih = PI.open(OUT / name).size
    return Image(str(OUT / name), width=w * cm, height=w * cm * ih / iw)


def build(path, story, title):
    SimpleDocTemplate(str(path), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
                      topMargin=2 * cm, bottomMargin=2 * cm, title=title,
                      author="Twisha").build(story)


summ = json.loads((OUT / "summary.json").read_text())
pairs = pd.read_csv(OUT / "pair_scores.csv")
agree_g = pd.read_csv(OUT / "gold_agreement.csv")
agree_b = pd.read_csv(OUT / "gold_agreement_brown.csv")
sep_g = pd.read_csv(OUT / "control_separation.csv")
sep_b = pd.read_csv(OUT / "control_separation_brown.csv")
corr = pd.read_csv(OUT / "metric_correlations_spearman.csv", index_col=0)
dis = pd.read_csv(OUT / "rank_disagreements_wup_vs_res.csv")
match = pd.read_csv(OUT / "transcript_statute_matches.csv")

# ---------------------------------------------------------------- bootstrap CIs
rng = np.random.default_rng(42)
ci = {}
for m in M.METRICS:
    bs = []
    for _ in range(2000):
        idx = rng.integers(0, len(pairs), len(pairs))
        s = spearmanr(pairs[m].iloc[idx], pairs["gold"].iloc[idx])[0]
        if not np.isnan(s): bs.append(s)
    ci[m] = (np.percentile(bs, 2.5), np.percentile(bs, 97.5))

# ================================================================ Architecture
S = [P("WordNet Similarity Measures for Legal Speech Analysis", TITLE),
     P("Architecture and Methodology - Problem 15, MT-AIML (NLP Preprocessing &amp; Language Modeling)", SM),
     P("Twisha | B.Tech IT (AI &amp; ML Honors), SCET, Sarvajanik University | Academic year 2026-27, Sem 6", SM),
     Spacer(1, 8), P("1. Problem and scope", H1),
     P("Legal speech-processing systems need a measure of conceptual closeness between the terms used in "
       "oral-argument transcripts and the terms defined in statutes. This project implements a semantic "
       "similarity tool over the WordNet noun hierarchy and compares two families of measures: "
       "<b>taxonomic</b> (Path, Wu-Palmer, Leacock-Chodorow), which use only the shape of the hierarchy, "
       "and <b>information-theoretic</b> (Resnik, Lin), which also use corpus statistics."),
     P("Scope: noun-to-noun similarity for single-word legal terms; one hand-checked WordNet sense per term; "
       "a small statute vocabulary (10 terms) for the transcript-to-statute matching demo."),
     P("2. WordNet taxonomy background", H1),
     P("WordNet groups words into synsets (sets of synonyms with one gloss). Synsets are linked by "
       "hypernymy (is-a) into a hierarchy rooted at <i>entity.n.01</i> for nouns. A <b>lowest common subsumer "
       "(LCS)</b> of two synsets is their deepest shared hypernym. For example, contract.n.01 and "
       "agreement.n.01 are close in the hierarchy, while court.n.01 and judge.n.01 meet only at the root "
       "(entity.n.01)."),
     P("3. Similarity formulas", H1),
     P("Let len(a,b) be the shortest path (in edges) between synsets a and b, depth(c) the depth of synset c "
       "(root = 1), D the maximum depth of the noun taxonomy, and IC(c) = -log P(c) the information content of c, "
       "where P(c) is the corpus probability of c or any of its hyponyms."),
     table(pd.DataFrame([
         ["Path", "1 / (len(a,b) + 1)", "0 to 1", "Shortest-path distance only"],
         ["Wu-Palmer", "2 * depth(LCS) / (depth(a) + depth(b))", "0 to 1", "Rewards deep LCS; depth-aware"],
         ["Leacock-Chodorow", "-log( (len(a,b)+1) / (2D) )", "0 to ~3.64", "Log-scaled path; D = 19 for nouns"],
         ["Resnik", "IC(LCS)", "0 to max IC", "Specificity of shared ancestor"],
         ["Lin", "2 * IC(LCS) / (IC(a) + IC(b))", "0 to 1", "Resnik normalised by both IC values"]],
         columns=["Measure", "Formula", "Range", "Idea"]),
           widths=[3 * cm, 6.2 * cm, 2.4 * cm, 5.4 * cm]),
     Spacer(1, 6),
     P("<b>Relationship between Path and LCH.</b> LCH is a monotonically decreasing function of path length, "
       "so for any set of pairs Path and LCH produce the <i>same ranking</i>. They differ only in scale (linear "
       "reciprocal vs logarithmic). This is verified empirically in the Evaluation Report."),
     P("<b>Information content.</b> Two IC tables are supported: the NLTK Genesis corpus (the suggested resource, "
       "with add-1 smoothing so unseen synsets do not receive near-infinite IC) and the Brown-corpus IC file "
       "shipped with NLTK. Genesis is small and not legal text, so its IC estimates are noisy; Brown is larger and "
       "more general. Both are reported."),
     P("4. System design and data flow", H1),
     Preformatted(
         "raw transcript (.txt)\n"
         "   |  clean_text -> split_sentences -> tokenize -> lemmatize (WordNet morphy)\n"
         "   v\n"
         "legal lexicon (term -> synset)  --lookup-->  legal term occurrences\n"
         "   |\n"
         "   v\n"
         "WordNetSimilarity.score(s1, s2) -> {path, wup, lch, res, lin}\n"
         "   |-> pair table vs gold ratings   -> Spearman/Pearson, related-vs-control gap\n"
         "   |-> term x term matrices         -> heatmaps\n"
         "   |-> term vs statute definitions  -> best match + confidence threshold\n"
         "   v\n"
         "outputs/ (CSV, PNG, summary.json)  ->  Streamlit app, PDF reports", CODE),
     Spacer(1, 4),
     P("<b>Modules.</b> <i>preprocessing.py</i>: cleaning, sentence splitting (regex), tokenisation, lemmatisation, "
       "lexicon and data loaders. <i>models.py</i>: the five similarity measures, IC loading, matrices, "
       "correlation and gold-agreement analysis, statute matching. <i>pipeline.py</i>: evaluation runner. "
       "<i>app.py</i>: web interface."),
     P("<b>Design decisions.</b>"),
     ] + bullets([
         "One manually verified synset per term (data/annotated/legal_lexicon.csv). This isolates the "
         "similarity measures from word-sense-disambiguation errors, which are a separate problem (Module 4).",
         "Statute matching uses a confidence threshold on the score normalised to 0-1 (Path, Wu-Palmer and Lin "
         "are already bounded; LCH and Resnik are divided by the largest self-similarity in the candidate set). "
         "Below the threshold the tool reports 'no confident match' instead of forcing the nearest statute.",
         "Metrics are min-max normalised only for cross-metric comparison; raw scores are always kept.",
         "Sentence splitting is regex-based so the project runs without the punkt download."]) + [
     P("5. Complexity", H1),
     P("Scoring one pair requires finding hypernym paths for both synsets and their common ancestors, which is "
       "proportional to the taxonomy depth (at most 19 for nouns) times the number of senses' paths; IC lookup is "
       "O(1) from a precomputed table. A full n x n matrix over n terms therefore costs O(n^2) pair evaluations. "
       "For the 17-term matrices used here each metric takes roughly 0.1-0.2 seconds on the development machine."),
     P("6. Known limitations of the method", H1)] + bullets([
         "Taxonomic measures treat every edge as equal distance, but WordNet is uneven: some regions are dense, "
         "others sparse. Equal path lengths therefore do not imply equal conceptual distance.",
         "WordNet is a general-English resource. Legal senses are present for many terms (e.g. tort, larceny, "
         "plaintiff) but legal relations such as 'judge presides over court' are not hypernym links, so "
         "<i>relatedness</i> (association) is only partly captured by <i>similarity</i> (is-a closeness).",
         "Information-content measures depend on the corpus. With add-1 smoothing the root synset "
         "<i>entity.n.01</i> receives a probability slightly above 1, giving it a small negative IC (about -0.083 for "
         "Genesis), so Resnik and Lin can be marginally negative for pairs whose only shared ancestor is the root.",
         "Only noun pairs are supported (LCH and Resnik require same part of speech)."])
build(DOCS / "Architecture_and_Methodology.pdf", S, "Architecture and Methodology - Problem 15")

# ================================================================ Evaluation
def fmt_ci(m): return f"[{ci[m][0]:.2f}, {ci[m][1]:.2f}]"


ag = agree_g.copy()
ag["95% CI (Spearman)"] = [fmt_ci(m) for m in M.METRICS]
ag = ag.rename(columns={"spearman": "Spearman (Genesis)", "pearson": "Pearson"})
ag["Spearman (Brown)"] = agree_b["spearman"].values
ag = ag[["metric", "Spearman (Genesis)", "95% CI (Spearman)", "Pearson", "Spearman (Brown)"]]
sp = corr.copy(); sp.index = [M.LABELS[i] for i in sp.index]; sp.columns = [M.LABELS[c] for c in sp.columns]
sp = sp.reset_index().rename(columns={"index": ""})
sg = sep_g.rename(columns={"metric": "metric", "related_mean": "related", "control_mean": "control"})
disp = dis.rename(columns={"wup": "WuP", "res": "Resnik", "rank_a": "WuP rank", "rank_b": "Resnik rank"})
disp = disp[["term1", "term2", "WuP", "Resnik", "WuP rank", "Resnik rank"]].copy()
for c in ("WuP rank", "Resnik rank"):
    disp[c] = disp[c].map(lambda v: f"{v:g}")
pc = lambda c: int((match[c] != "(no confident match)").sum())
jd = pairs[(pairs.term1 == "judge") & (pairs.term2 == "dog")].iloc[0]
cm_ = pairs[(pairs.term1 == "contract") & (pairs.term2 == "agreement")].iloc[0]
n = summ["n_pairs"]

E = [P("Evaluation Report", TITLE),
     P("WordNet Similarity Measures for Legal Speech Analysis - Problem 15", SM),
     P("Twisha | B.Tech IT (AI &amp; ML Honors), SCET | Sem 6, 2026-27", SM), Spacer(1, 8),
     P("1. Setup", H1),
     P(f"The evaluation set contains <b>{n} term pairs</b> ({summ['n_related']} related legal pairs and "
       f"{summ['n_control']} unrelated control pairs). Each pair uses one verified WordNet noun synset per term. "
       "Each pair has a relatedness rating from 0 (unrelated) to 4 (closely related)."),
     P("<b>Important caveat:</b> the gold ratings were assigned by the project author, not by independent "
       "annotators, and the transcript is a short synthetic oral-argument excerpt written for this project "
       f"({summ['n_transcript_sentences']} sentences, {summ['n_legal_term_occurrences']} legal-term occurrences, "
       f"{summ['n_distinct_legal_terms']} distinct terms). Results show how the measures behave on this set; "
       "they are not a benchmark. Replacing gold_pairs.csv with ratings from several annotators would be the "
       "first improvement."),
     P("2. Agreement with gold ratings", H1),
     table(ag, widths=[3.2 * cm, 3.3 * cm, 3.3 * cm, 2.3 * cm, 3.3 * cm]),
     Spacer(1, 4),
     P(f"All five measures reach Spearman correlations between {agree_g.spearman.min():.2f} and "
       f"{agree_g.spearman.max():.2f}. Lin is highest ({agree_g.spearman.iloc[4]:.2f} with Genesis IC, "
       f"{agree_b.spearman.iloc[4]:.2f} with Brown IC), but with only {n} pairs the 95% bootstrap intervals "
       "overlap heavily, so the differences between metrics are <b>not statistically meaningful</b>. "
       "The reliable conclusion is that all measures capture a moderate monotone relationship with the "
       "gold ratings, not that one beats the others."),
     img("gold_scatter.png", 16.5),
     P("Figure 1. Normalised metric score against gold rating for every pair.", SM),
     P("3. Related versus unrelated pairs", H1),
     table(sg),
     Spacer(1, 4),
     P(f"Every measure scores related pairs well above unrelated controls (gap {sep_g.gap.min():.2f} to "
       f"{sep_g.gap.max():.2f} on the 0-1 normalised scale). Lin has the largest gap "
       f"({sep_g.gap.iloc[4]:.2f}) and Path the smallest ({sep_g.gap.iloc[0]:.2f}). Path scores are low overall "
       "even for good pairs because shortest-path length in WordNet is large for specific legal concepts."),
     img("separation.png", 11),
     P("Figure 2. Mean normalised score on related pairs versus unrelated controls.", SM),
     P("4. How the metrics relate to each other", H1),
     table(sp, widths=[3.3 * cm] + [2.6 * cm] * 5),
     Spacer(1, 4),
     P(f"Path and Leacock-Chodorow have Spearman correlation {corr.loc['path', 'lch']:.2f}: they rank every pair "
       "identically, as expected because LCH is a monotone transform of path length. Resnik and Lin are also "
       f"highly correlated ({corr.loc['res', 'lin']:.2f}). The weakest relationship is between the path family and the "
       f"IC family (Path-Resnik {corr.loc['path', 'res']:.2f}, Path-Lin {corr.loc['path', 'lin']:.2f}), which is "
       "where the two approaches genuinely disagree."),
     img("metric_corr.png", 9.5),
     P("Figure 3. Spearman correlation between metrics.", SM),
     P("5. Where taxonomic and information-theoretic measures disagree", H1),
     table(disp, widths=[2.6 * cm, 2.8 * cm, 2.2 * cm, 2.2 * cm, 2.4 * cm, 2.6 * cm]),
     Spacer(1, 4),
     P("The table lists the pairs with the largest rank difference between Wu-Palmer and Resnik. "
       "Wu-Palmer ranks lawyer-prosecutor and judge-prosecutor near the top because the three are close "
       "in the person branch of the hierarchy. Resnik ranks them lower because their shared ancestor is a "
       "relatively general synset with modest information content. Conversely, Resnik rewards pairs such as "
       "damages-fine, whose shared ancestor is a specific concept about money, more than the path-based "
       "measures do. This is the central contrast of the problem: taxonomic measures reward "
       "<i>proximity in the tree</i>, information-theoretic measures reward <i>specificity of what is shared</i>."),
     img("matrix_wup.png", 9), P("Figure 4. Wu-Palmer similarity matrix over 17 legal terms.", SM),
     img("matrix_res.png", 9), P("Figure 5. Resnik similarity matrix (Genesis IC).", SM),
     P("6. Transcript-to-statute matching", H1),
     P(f"Each distinct legal term in the transcript was matched to the closest of 10 statute terms with a "
       f"normalised-score threshold of {summ['match_threshold']}. Terms receiving a confident match: "
       f"Path {pc('path_best')}, Wu-Palmer {pc('wup_best')}, LCH {pc('lch_best')}, Resnik {pc('res_best')}, "
       f"Lin {pc('lin_best')} of {summ['n_distinct_legal_terms']}. Terms identical to a statute term score the "
       "maximum under every measure. Roles such as plaintiff, defendant, judge and attorney receive "
       "no confident match under any measure because the statute list contains no person terms; "
       "the threshold correctly refuses to force a match. Terms that do match well are mostly "
       "those whose statute counterpart is a near neighbour (e.g. damages to Fine, trial and appeal to Verdict)."),
     P("7. Failure analysis", H1)] + bullets([
         f"<b>Similarity is not relatedness.</b> judge.n.01 and dog.n.01 receive a Wu-Palmer score of {jd.wup:.2f}, "
         f"higher than several legitimate legal pairs, because both are organisms and meet at organism.n.01, which is fairly deep (depth 5) "
         "relative to their own depths. Meanwhile court-judge, a strongly related pair, scores low on every "
         "measure because institution and person meet only at the root, entity.n.01. Wu-Palmer alone would be unreliable "
         "for filtering unrelated terms.",
         "<b>Path scores compress.</b> Even contract-agreement, a near-synonym pair, scores only "
         f"{cm_.path:.2f} on Path (but {cm_.wup:.2f} on Wu-Palmer), so absolute Path values are hard to threshold.",
         "<b>Negative information content.</b> Add-1 smoothing on the small Genesis corpus gives the root "
         "synset a slightly negative IC (about -0.083), so Resnik and Lin can be marginally negative for "
         "pairs that only share the root (e.g. plaintiff and contract). Brown IC returns exactly 0 there. "
         "Genesis is also biblical text, so its IC is a poor proxy for legal usage.",
         "<b>Hierarchy coverage.</b> Terms like 'statute' resolve to legislative_act.n.01, which sits far from "
         "law.n.01 in the hierarchy, so the pair law-statute scores low although a lawyer would treat "
         "them as close.",
         f"<b>Sample size.</b> With {n} pairs and author-assigned ratings, correlations are imprecise "
         "(see the confidence intervals in Section 2)."]) + [
     P("8. Conclusions", H1)] + bullets([
         "All five measures separate related legal pairs from unrelated controls and correlate moderately with "
         "the gold ratings; none clearly dominates on this evidence.",
         "Path and Leacock-Chodorow are rank-equivalent; Resnik and Lin behave very similarly. The meaningful "
         "comparison is between the path family and the information-content family.",
         "Taxonomic measures suit judging how close two concepts are in the hierarchy; information-content "
         "measures suit judging how specific the shared concept is. For legal text a combination, plus a "
         "legal-domain IC corpus and expert-rated pairs, would be a stronger design.",
         "Future work: build IC from a legal corpus, add multi-word terms and sense disambiguation, and "
         "evaluate against independent annotators."])
build(DOCS / "Evaluation_Report.pdf", E, "Evaluation Report - Problem 15")
print("built", [p.name for p in DOCS.glob("*.pdf")])
