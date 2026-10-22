"""Streamlit demo for Problem 15: WordNet similarity for legal speech analysis.
Run:  streamlit run app.py
"""
import sys
from pathlib import Path

import pandas as pd
import streamlit as st
from nltk.corpus import wordnet as wn

sys.path.insert(0, str(Path(__file__).parent / "src"))
import models as M  # noqa: E402
import preprocessing as P  # noqa: E402

st.set_page_config(page_title="Legal Speech Similarity", layout="wide")
st.title("WordNet Similarity for Legal Speech Analysis")
st.caption("Problem 15 - taxonomic (Path, Wu-Palmer, Leacock-Chodorow) vs "
           "information-theoretic (Resnik, Lin) similarity")

ic_name = st.sidebar.radio("Information-content corpus", ["genesis", "brown"],
                           help="Used by Resnik and Lin only.")


@st.cache_resource
def get_sim(name):
    return M.WordNetSimilarity(name)


sim = get_sim(ic_name)
lex = P.load_lexicon()
statutes = P.load_statutes()

tab1, tab2, tab3, tab4 = st.tabs(
    ["Compare two terms", "Similarity matrix", "Transcript to statutes", "Evaluation"])

# ---------------------------------------------------------------- tab 1
with tab1:
    c1, c2 = st.columns(2)
    t1 = c1.text_input("Term 1", "contract")
    t2 = c2.text_input("Term 2", "agreement")

    def pick(col, term):
        senses = wn.synsets(term.strip().replace(" ", "_"), wn.NOUN)
        if not senses:
            col.warning(f"No noun senses for '{term}'.")
            return None
        default = next((i for i, s in enumerate(senses) if s.name() == lex.get(term.lower())), 0)
        labels = [f"{s.name()} - {s.definition()[:70]}" for s in senses]
        return senses[col.selectbox(f"Sense of '{term}'", range(len(senses)), default,
                                    format_func=lambda i: labels[i])]

    s1, s2 = pick(c1, t1), pick(c2, t2)
    if s1 and s2:
        sc = sim.score(s1, s2)
        cols = st.columns(5)
        for col, m in zip(cols, M.METRICS):
            col.metric(M.LABELS[m], f"{sc[m]:.3f}")
        lcs = s1.lowest_common_hypernyms(s2)
        st.write("**Lowest common hypernym:** " +
                 (", ".join(f"`{h.name()}`" for h in lcs) or "none"))
        for s in (s1, s2):
            path = max(s.hypernym_paths(), key=len)
            st.write(f"`{s.name()}` : " + " > ".join(x.name().split(".")[0] for x in path))

# ---------------------------------------------------------------- tab 2
with tab2:
    default_terms = ["contract", "agreement", "plaintiff", "defendant", "attorney", "court",
                     "judge", "jury", "testimony", "evidence", "verdict", "larceny", "crime",
                     "fraud", "fine", "tort", "negligence"]
    chosen = st.multiselect("Terms", sorted(lex), default_terms)
    metric = st.selectbox("Metric", M.METRICS, format_func=lambda m: M.LABELS[m])
    if len(chosen) >= 2:
        mat = sim.matrix({t: lex[t] for t in chosen}, metric)
        st.dataframe(mat.style.background_gradient(cmap="viridis").format("{:.2f}"),
                     width="stretch")

# ---------------------------------------------------------------- tab 3
with tab3:
    text = st.text_area("Oral-argument transcript", P.load_transcript(), height=220)
    c1, c2 = st.columns(2)
    metric3 = c1.selectbox("Metric ", M.METRICS, index=1, format_func=lambda m: M.LABELS[m])
    thr = c2.slider("Confidence threshold (normalised score)", 0.0, 1.0, 0.6, 0.05)
    occ = P.extract_legal_terms(text, lex)
    rows, seen = [], set()
    for o in occ:
        if o["term"] in seen:
            continue
        seen.add(o["term"])
        name, val, norm = M.best_statute_match(sim, o["synset"], statutes, metric3, thr)
        rows.append({"transcript term": o["term"], "sentence": o["sentence"] + 1,
                     "best statute term": name or "(no confident match)",
                     "raw score": round(val, 3), "normalised": round(norm, 3)})
    st.write(f"{len(P.split_sentences(text))} sentences, {len(occ)} legal-term occurrences, "
             f"{len(seen)} distinct terms.")
    if rows:
        st.dataframe(pd.DataFrame(rows), width="stretch", hide_index=True)
    with st.expander("Statute definitions used"):
        st.dataframe(pd.DataFrame(statutes), width="stretch", hide_index=True)

# ---------------------------------------------------------------- tab 4
with tab4:
    table = sim.pair_table(P.load_gold())
    st.caption("Gold relatedness ratings (0-4) are author-assigned, not from human annotators.")
    a, b = st.columns(2)
    a.subheader("Agreement with gold ratings")
    a.dataframe(M.gold_agreement(table).round(3), hide_index=True)
    b.subheader("Related vs unrelated pairs")
    b.dataframe(M.control_separation(table).round(3), hide_index=True)
    st.subheader("Correlation between metrics (Spearman)")
    st.dataframe(M.metric_correlations(table).round(3).rename(index=M.LABELS, columns=M.LABELS)
                 .style.background_gradient(cmap="viridis"))
    st.subheader("All scored pairs")
    st.dataframe(table.round(3), hide_index=True, width="stretch")
