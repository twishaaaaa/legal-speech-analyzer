"""Document-level analysis for the Problem 15 app.

Turns a whole document (pasted, .txt or .pdf) into something a person can use:
legal terms found automatically, the statute each one points to, a plain-English
confidence label and reason, highlighted text, and document-to-document similarity.
No term has to be typed in by hand.
"""
import html
import io
import math
import re
from collections import defaultdict

import pandas as pd
from nltk.corpus import wordnet as wn

import models as M
import preprocessing as P

HIGH = 0.85  # normalised score at or above this is labelled "High"
PALETTE = ["#fde68a", "#bfdbfe", "#bbf7d0", "#fecaca", "#e9d5ff",
           "#fed7aa", "#a5f3fc", "#fbcfe8", "#d9f99d", "#ddd6fe"]


# ------------------------------------------------------------ reading files
def read_upload(uploaded) -> str:
    """Text from a Streamlit UploadedFile (.txt or .pdf)."""
    data = uploaded.read()
    if uploaded.name.lower().endswith(".pdf"):
        from pypdf import PdfReader
        pages = [(p.extract_text() or "") for p in PdfReader(io.BytesIO(data)).pages]
        text = "\n".join(pages)
        return re.sub(r"[ \t]*\n[ \t]*", " ", text)  # PDF line breaks are not sentence breaks
    return data.decode("utf-8", errors="ignore")


# ------------------------------------------------------------ explanations
def _name(s) -> str:
    return s.name().split(".")[0].replace("_", " ")


def explain_match(term_synset: str, statute_synset: str) -> str:
    """One plain-English reason for why two concepts are related."""
    a, b = wn.synset(term_synset), wn.synset(statute_synset)
    if a == b:
        return "Same legal concept"
    lcs = a.lowest_common_hypernyms(b)
    if not lcs:
        return "No shared category in WordNet"
    c = lcs[0]
    if c == b:
        return f"'{_name(a)}' is a kind of '{_name(b)}'"
    if c == a:
        return f"'{_name(b)}' is a kind of '{_name(a)}'"
    return f"Both are kinds of '{_name(c)}'"


def confidence_label(norm: float, threshold: float) -> str:
    if norm >= HIGH and norm >= threshold:
        return "High"
    if norm >= threshold:
        return "Medium"
    return "No confident match"


# ------------------------------------------------------------ main analysis
def analyse(text: str, sim: "M.WordNetSimilarity", lex: dict, statutes: list[dict],
            metric: str, threshold: float):
    """Returns (occurrences, results_df). One results row per distinct legal term."""
    occ = P.extract_legal_terms(text, lex)
    sentences = P.split_sentences(text)
    stat_syn = {s["statute_term"]: s["synset"] for s in statutes}
    rows, seen = [], {}
    for o in occ:
        seen.setdefault(o["term"], {"synset": o["synset"], "sents": [], "n": 0})
        seen[o["term"]]["n"] += 1
        if o["sentence"] not in seen[o["term"]]["sents"]:
            seen[o["term"]]["sents"].append(o["sentence"])
    for term, info in seen.items():
        name, raw, norm = M.best_statute_match(sim, info["synset"], statutes, metric, threshold)
        label = confidence_label(norm, threshold)
        rows.append({
            "Legal term": term,
            "Mentions": info["n"],
            "Sentences": ", ".join(str(i + 1) for i in info["sents"]),
            "Matched statute": name or "-",
            "Confidence": label,
            "Score (0-1)": round(norm, 2),
            "Why": explain_match(info["synset"], stat_syn[name]) if name else "",
            "_synset": info["synset"],
        })
    df = pd.DataFrame(rows)
    if not df.empty:
        order = {"High": 0, "Medium": 1, "No confident match": 2}
        df = df.sort_values(by=["Confidence", "Score (0-1)"],
                            key=lambda c: c.map(order) if c.name == "Confidence" else -c)
        df = df.reset_index(drop=True)
    return occ, sentences, df


def statute_summary(df: pd.DataFrame, statutes: list[dict]) -> pd.DataFrame:
    """Which statutes does the document touch, and through which terms?"""
    hits = df[df["Matched statute"] != "-"] if not df.empty else df
    rows = []
    for s in statutes:
        sub = hits[hits["Matched statute"] == s["statute_term"]] if not hits.empty else hits
        rows.append({"Statute": s["statute_term"], "Mentions": int(sub["Mentions"].sum()) if len(sub) else 0,
                     "Triggered by": ", ".join(sub["Legal term"]) if len(sub) else "",
                     "Definition": s["definition"]})
    return pd.DataFrame(rows).sort_values("Mentions", ascending=False).reset_index(drop=True)


def highlight_html(text: str, df: pd.DataFrame, statutes: list[dict]) -> tuple[str, dict]:
    """Original text as HTML with each matched legal term colour-coded by statute."""
    colour = {s["statute_term"]: PALETTE[i % len(PALETTE)] for i, s in enumerate(statutes)}
    term_to_stat = {r["Legal term"]: r["Matched statute"] for _, r in df.iterrows()
                    if r["Matched statute"] != "-"} if not df.empty else {}
    all_terms = set(df["Legal term"]) if not df.empty else set()
    out, pos = [], 0
    norm = text.replace("’", "'")
    for m in re.finditer(r"[A-Za-z]+(?:'[A-Za-z]+)?", norm):
        lem = P.lemmatize(m.group().lower())
        if lem not in all_terms:
            continue
        out.append(html.escape(text[pos:m.start()]))
        word = html.escape(text[m.start():m.end()])
        stat = term_to_stat.get(lem)
        if stat:
            out.append(f'<mark style="background:{colour[stat]};color:#111;padding:1px 4px;'
                       f'border-radius:4px" title="{html.escape(stat)}">{word}</mark>')
        else:
            out.append(f'<span style="border-bottom:1px dotted #888">{word}</span>')
        pos = m.end()
    out.append(html.escape(text[pos:]))
    return "".join(out).replace("\n", "<br>"), colour


# ------------------------------------------------------------ two documents
def document_similarity(sim: "M.WordNetSimilarity", terms_a: dict, terms_b: dict,
                        metric: str = "wup"):
    """Overall similarity of two documents from their legal terms.

    For every term in one document take its best match in the other, then average
    both directions. `metric` must be bounded by 1 (path, wup or lin).
    Returns (score 0-1, DataFrame of best pairs).
    """
    if not terms_a or not terms_b:
        return float("nan"), pd.DataFrame()
    rows, best_a, best_b = [], [], []

    def best(src, dst):
        out = []
        for ta, sa in src.items():
            cand = [(tb, sim.score(sa, sb)[metric]) for tb, sb in dst.items()]
            cand = [(t, v) for t, v in cand if not math.isnan(v)]
            tb, v = max(cand, key=lambda x: x[1])
            out.append((ta, tb, v))
        return out

    ab, ba = best(terms_a, terms_b), best(terms_b, terms_a)
    best_a = [v for _, _, v in ab]
    best_b = [v for _, _, v in ba]
    score = (sum(best_a) / len(best_a) + sum(best_b) / len(best_b)) / 2
    for ta, tb, v in ab:
        rows.append({"Term in document A": ta, "Closest term in document B": tb,
                     "Similarity": round(v, 2)})
    return score, pd.DataFrame(rows).sort_values("Similarity", ascending=False).reset_index(drop=True)
