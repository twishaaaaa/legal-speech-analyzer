"""Legal Speech Analyzer (Problem 15).

Paste or upload a transcript / contract / case text and the app finds the legal
terms itself, links each to the closest statute, and explains why. The original
two-word comparison is still available under "Under the hood".

Run:  streamlit run app.py
"""
import sys
from pathlib import Path

import pandas as pd
import streamlit as st
from nltk.corpus import wordnet as wn

sys.path.insert(0, str(Path(__file__).parent / "src"))
import analysis as A  # noqa: E402
import models as M  # noqa: E402
import preprocessing as P  # noqa: E402

st.set_page_config(page_title="Legal Speech Analyzer", layout="wide")
st.title("Legal Speech Analyzer")
st.caption("Paste or upload a legal text. The app finds the legal terms, links them to "
           "statutes using WordNet similarity, and shows why. Nothing to type word by word.")

# ------------------------------------------------------------------ sidebar
st.sidebar.header("Settings")
METRIC_HELP = {
    "wup": "Wu-Palmer (best all-round here)", "path": "Path", "lch": "Leacock-Chodorow",
    "res": "Resnik", "lin": "Lin",
}
metric = st.sidebar.selectbox("Similarity method", list(METRIC_HELP), 0,
                              format_func=METRIC_HELP.get)
threshold = st.sidebar.slider("Matching strictness", 0.3, 1.0, 0.6, 0.05,
                              help="Higher = fewer but more certain matches.")
ic_name = st.sidebar.radio("Information-content corpus", ["genesis", "brown"],
                           help="Only used by Resnik and Lin.")


@st.cache_resource
def get_sim(name):
    return M.WordNetSimilarity(name)


try:
    sim = get_sim(ic_name)
except LookupError:
    st.error("NLTK data is missing. Run:\n\n"
             "`python -c \"import nltk; [nltk.download(p) for p in "
             "['wordnet','omw-1.4','wordnet_ic','genesis']]\"`")
    st.stop()

lex = P.load_lexicon()
statutes = P.load_statutes()
SAMPLES = {"Oral argument (sample)": P.DATA / "raw_transcripts" / "oral_argument_sample.txt",
           "Contract dispute (sample)": P.DATA / "raw_transcripts" / "contract_dispute_sample.txt",
           "Standard contract clause (sample)": P.DATA / "raw_transcripts" / "standard_contract_clause.txt",
           "Criminal theft trial (sample)": P.DATA / "raw_transcripts" / "criminal_theft_trial.txt",
           "Negligence / tort case (sample)": P.DATA / "raw_transcripts" / "negligence_tort_case.txt"}


def get_text(key: str, default_sample: str) -> str:
    """Sample, pasted text, or an uploaded .txt / .pdf."""
    mode = st.radio("Source", ["Sample", "Paste text", "Upload file"], horizontal=True,
                    key=f"{key}_mode")
    if mode == "Sample":
        names = list(SAMPLES)
        name = st.selectbox("Sample", names, names.index(default_sample), key=f"{key}_sample")
        return SAMPLES[name].read_text()
    if mode == "Paste text":
        return st.text_area("Text", height=180, key=f"{key}_paste")
    up = st.file_uploader("Upload a .txt or .pdf", type=["txt", "pdf"], key=f"{key}_file")
    if up is None:
        return ""
    try:
        return A.read_upload(up)
    except Exception as exc:  # unreadable / scanned PDF
        st.error(f"Could not read this file ({exc}). Scanned PDFs need OCR first.")
        return ""


tab_doc, tab_cmp, tab_hood = st.tabs(
    ["Analyse a document", "Compare two documents", "Under the hood"])

# ================================================================== tab 1
with tab_doc:
    text = get_text("doc", "Oral argument (sample)")
    if not text.strip():
        st.info("Add some text to analyse.")
    else:
        occ, sentences, df = A.analyse(text, sim, lex, statutes, metric, threshold)
        summary = A.statute_summary(df, statutes)
        touched = int((summary["Mentions"] > 0).sum())

        c = st.columns(4)
        c[0].metric("Sentences", len(sentences))
        c[1].metric("Legal term mentions", len(occ))
        c[2].metric("Distinct legal terms", len(df))
        c[3].metric("Statutes touched", f"{touched} of {len(statutes)}")

        if df.empty:
            st.warning("No known legal terms found in this text.")
        else:
            st.subheader("Which laws does this text touch?")
            left, right = st.columns([2, 3])
            hit = summary[summary["Mentions"] > 0]
            if len(hit):
                left.bar_chart(hit.set_index("Statute")["Mentions"])
            else:
                left.write("No confident statute matches. Try lowering the strictness.")
            right.dataframe(summary[["Statute", "Mentions", "Triggered by", "Definition"]],
                            hide_index=True, width="stretch")

            st.subheader("Document with legal terms highlighted")
            body, colour = A.highlight_html(text, df, statutes)
            legend = " ".join(
                f'<mark style="background:{colour[s]};color:#111;padding:1px 6px;'
                f'border-radius:4px">{s}</mark>' for s in summary[summary["Mentions"] > 0]["Statute"])
            st.markdown(legend + "<br><small>Dotted underline = legal term with no confident "
                        "statute match.</small>", unsafe_allow_html=True)
            st.markdown(f'<div style="line-height:1.9;border:1px solid #8884;border-radius:8px;'
                        f'padding:14px">{body}</div>', unsafe_allow_html=True)

            st.subheader("Term-by-term results")
            show = df.drop(columns="_synset")
            st.dataframe(show, hide_index=True, width="stretch")
            st.download_button("Download results (CSV)", show.to_csv(index=False),
                               "legal_analysis.csv", "text/csv")

            st.subheader("Read these sentences first")
            for _, row in summary[summary["Mentions"] > 0].iterrows():
                terms = df[df["Matched statute"] == row["Statute"]]
                idx = sorted({int(i) - 1 for s in terms["Sentences"] for i in s.split(", ")})
                with st.expander(f"{row['Statute']} ({len(idx)} sentence{'s' if len(idx) != 1 else ''})"):
                    st.caption(row["Definition"])
                    for i in idx:
                        st.write(f"**{i + 1}.** {sentences[i]}")

        st.caption("Only terms in the legal lexicon are detected, and WordNet is a general "
                   "dictionary, so core legal words such as plaintiff or attorney may show "
                   "no confident match. See 'Under the hood' for evaluation.")

# ================================================================== tab 2
with tab_cmp:
    st.write("Measure how close two texts are in *legal subject matter*, e.g. a new "
             "clause against a standard one, or two cases.")
    ca, cb = st.columns(2)
    with ca:
        st.markdown("**Document A**")
        text_a = get_text("a", "Oral argument (sample)")
    with cb:
        st.markdown("**Document B**")
        text_b = get_text("b", "Contract dispute (sample)")
    doc_metric = st.selectbox("Method", ["wup", "path", "lin"], format_func=METRIC_HELP.get,
                              key="doc_metric", help="These three are bounded 0-1, so the "
                              "result reads as a percentage.")
    terms_a = {o["term"]: o["synset"] for o in P.extract_legal_terms(text_a, lex)}
    terms_b = {o["term"]: o["synset"] for o in P.extract_legal_terms(text_b, lex)}
    if not terms_a or not terms_b:
        st.info("Both documents need at least one known legal term.")
    else:
        score, pairs = A.document_similarity(sim, terms_a, terms_b, doc_metric)
        verdict = ("very close in legal subject matter" if score >= 0.8 else
                   "partly overlapping" if score >= 0.5 else "mostly different")
        st.metric("Overall legal similarity", f"{score:.0%}")
        st.write(f"These documents are **{verdict}**.")
        shared = sorted(set(terms_a) & set(terms_b))
        st.write("**Terms in both:** " + (", ".join(shared) if shared else "none"))
        st.dataframe(pairs, hide_index=True, width="stretch")

# ================================================================== tab 3
with tab_hood:
    st.caption("The building blocks behind the analysis, plus the original evaluation.")
    h1, h2, h3, h4 = st.tabs(["Explain a match", "Similarity matrix", "Evaluation", "Method notes"])

    with h1:
        c1, c2 = st.columns(2)
        t1 = c1.text_input("Term 1", "contract")
        t2 = c2.text_input("Term 2", "agreement")

        def pick(col, term, key):
            senses = wn.synsets(term.strip().replace(" ", "_"), wn.NOUN)
            if not senses:
                col.warning(f"No noun senses for '{term}'.")
                return None
            default = next((i for i, s in enumerate(senses) if s.name() == lex.get(term.lower())), 0)
            labels = [f"{s.name()} - {s.definition()[:70]}" for s in senses]
            return senses[col.selectbox(f"Sense of '{term}'", range(len(senses)), default,
                                        format_func=lambda i: labels[i], key=key)]

        s1, s2 = pick(c1, t1, "s1"), pick(c2, t2, "s2")
        if s1 and s2:
            sc = sim.score(s1, s2)
            for col, m in zip(st.columns(5), M.METRICS):
                col.metric(M.LABELS[m], f"{sc[m]:.3f}")
            lcs = s1.lowest_common_hypernyms(s2)
            st.write("**Lowest common hypernym:** " +
                     (", ".join(f"`{h.name()}`" for h in lcs) or "none"))
            for s in (s1, s2):
                path = max(s.hypernym_paths(), key=len)
                st.write(f"`{s.name()}` : " + " > ".join(x.name().split(".")[0] for x in path))

    with h2:
        defaults = ["contract", "agreement", "plaintiff", "defendant", "attorney", "court",
                    "judge", "jury", "testimony", "evidence", "verdict", "larceny", "crime",
                    "fraud", "fine", "tort", "negligence"]
        chosen = st.multiselect("Terms", sorted(lex), [d for d in defaults if d in lex])
        mm = st.selectbox("Metric", M.METRICS, format_func=M.LABELS.get, key="mat_metric")
        if len(chosen) >= 2:
            mat = sim.matrix({t: lex[t] for t in chosen}, mm)
            st.dataframe(mat.style.background_gradient(cmap="viridis").format("{:.2f}"),
                         width="stretch")

    with h3:
        table = sim.pair_table(P.load_gold())
        st.caption("Gold relatedness ratings (0-4) are author-assigned, not from human annotators.")
        a, b = st.columns(2)
        a.subheader("Agreement with gold ratings")
        a.dataframe(M.gold_agreement(table).round(3), hide_index=True)
        b.subheader("Related vs unrelated pairs")
        b.dataframe(M.control_separation(table).round(3), hide_index=True)
        st.subheader("Correlation between metrics (Spearman)")
        st.dataframe(M.metric_correlations(table).round(3)
                     .rename(index=M.LABELS, columns=M.LABELS)
                     .style.background_gradient(cmap="viridis"))
        st.subheader("All scored pairs")
        st.dataframe(table.round(3), hide_index=True, width="stretch")

    with h4:
        st.markdown(
            "- Legal terms are found with a hand-checked lexicon, then mapped to WordNet synsets.\n"
            "- Each term is scored against every statute term; the best score is shown, scaled to 0-1.\n"
            "- **High / Medium / No confident match** comes from that 0-1 score and your strictness setting.\n"
            "- The sample documents are synthetic. Results on real transcripts may differ.")
