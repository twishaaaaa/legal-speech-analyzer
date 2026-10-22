"""WordNet similarity models for Problem 15.

Taxonomic (path-based): Path, Wu-Palmer, Leacock-Chodorow
Information-theoretic:  Resnik, Lin  (IC from Genesis or Brown)
"""
import math
from itertools import combinations

import numpy as np
import pandas as pd
from nltk.corpus import genesis, wordnet as wn, wordnet_ic
from scipy.stats import pearsonr, spearmanr

PATH_METRICS = ["path", "wup", "lch"]
IC_METRICS = ["res", "lin"]
METRICS = PATH_METRICS + IC_METRICS
LABELS = {"path": "Path", "wup": "Wu-Palmer", "lch": "Leacock-Chodorow",
          "res": "Resnik", "lin": "Lin"}


def load_ic(name: str = "genesis"):
    """Information-content table. Genesis uses add-1 smoothing so unseen
    synsets do not get near-infinite IC (which breaks Lin)."""
    if name == "genesis":
        return wn.ic(genesis, False, 1.0)
    if name == "brown":
        return wordnet_ic.ic("ic-brown.dat")
    raise ValueError(f"unknown IC corpus: {name}")


class WordNetSimilarity:
    def __init__(self, ic_corpus: str = "genesis"):
        self.ic_name = ic_corpus
        self.ic = load_ic(ic_corpus)

    def score(self, s1, s2) -> dict:
        s1 = wn.synset(s1) if isinstance(s1, str) else s1
        s2 = wn.synset(s2) if isinstance(s2, str) else s2
        out = {
            "path": s1.path_similarity(s2),
            "wup": s1.wup_similarity(s2),
            "lch": s1.lch_similarity(s2),
            "res": s1.res_similarity(s2, self.ic),
            "lin": s1.lin_similarity(s2, self.ic),
        }
        return {k: (float(v) if v is not None else float("nan")) for k, v in out.items()}

    def pair_table(self, pairs: list[dict]) -> pd.DataFrame:
        rows = []
        for p in pairs:
            row = {"term1": p["term1"], "term2": p["term2"], "synset1": p["synset1"],
                   "synset2": p["synset2"], "gold": p.get("gold"), "kind": p.get("kind")}
            row.update(self.score(p["synset1"], p["synset2"]))
            rows.append(row)
        return pd.DataFrame(rows)

    def matrix(self, terms: dict[str, str], metric: str) -> pd.DataFrame:
        """Symmetric similarity matrix for {term: synset_name}."""
        names = list(terms)
        m = pd.DataFrame(np.nan, index=names, columns=names)
        for a in names:
            for b in names:
                m.loc[a, b] = self.score(terms[a], terms[b])[metric]
        return m


def normalise(df: pd.DataFrame) -> pd.DataFrame:
    """Min-max scale each metric to [0,1] so metrics can be compared on one axis."""
    out = df.copy()
    for m in METRICS:
        lo, hi = out[m].min(), out[m].max()
        out[m + "_norm"] = (out[m] - lo) / (hi - lo) if hi > lo else 0.0
    return out


def metric_correlations(df: pd.DataFrame, method: str = "spearman") -> pd.DataFrame:
    fn = spearmanr if method == "spearman" else pearsonr
    c = pd.DataFrame(index=METRICS, columns=METRICS, dtype=float)
    for a in METRICS:
        for b in METRICS:
            c.loc[a, b] = 1.0 if a == b else float(fn(df[a], df[b])[0])
    return c


def gold_agreement(df: pd.DataFrame) -> pd.DataFrame:
    """Correlation of each metric with the gold relatedness ratings."""
    rows = []
    for m in METRICS:
        rows.append({
            "metric": LABELS[m],
            "spearman": float(spearmanr(df[m], df["gold"])[0]),
            "pearson": float(pearsonr(df[m], df["gold"])[0]),
        })
    return pd.DataFrame(rows)


def control_separation(df: pd.DataFrame) -> pd.DataFrame:
    """Mean normalised score on related vs unrelated (control) pairs."""
    n = normalise(df)
    rows = []
    for m in METRICS:
        rel = n.loc[n.kind == "related", m + "_norm"].mean()
        ctl = n.loc[n.kind == "control", m + "_norm"].mean()
        rows.append({"metric": LABELS[m], "related_mean": rel, "control_mean": ctl,
                     "gap": rel - ctl})
    return pd.DataFrame(rows)


def metric_ceiling(sim: WordNetSimilarity, metric: str, synsets: list[str]) -> float:
    """Largest value a metric can take, used to put scores on a 0-1 scale.
    Path/WuP/Lin are already bounded by 1; LCH max for nouns is ln(2*depth+...)
    approximated by self-similarity of a leaf; Resnik uses the largest
    self-similarity (IC of the most specific synset) in the candidate set."""
    if metric in ("path", "wup", "lin"):
        return 1.0
    return max(sim.score(s, s)[metric] for s in synsets)


def best_statute_match(sim: WordNetSimilarity, term_synset: str, statutes: list[dict],
                       metric: str, min_norm: float = 0.0) -> tuple[str | None, float, float]:
    """Best statute term for a transcript term.
    Returns (statute_term or None, raw_score, normalised_score). If the
    normalised score is below `min_norm` the term has no confident match."""
    ceil = metric_ceiling(sim, metric, [s["synset"] for s in statutes])
    best, best_s = None, -math.inf
    for s in statutes:
        v = sim.score(term_synset, s["synset"])[metric]
        if not math.isnan(v) and v > best_s:
            best, best_s = s["statute_term"], v
    norm = max(best_s, 0.0) / ceil if ceil else 0.0
    if norm < min_norm:
        best = None
    return best, best_s, norm


def rank_disagreements(df: pd.DataFrame, a: str, b: str, top: int = 5) -> pd.DataFrame:
    """Pairs where two metrics disagree most in rank (for failure analysis)."""
    d = df.copy()
    d["rank_a"], d["rank_b"] = d[a].rank(ascending=False), d[b].rank(ascending=False)
    d["rank_gap"] = (d.rank_a - d.rank_b).abs()
    return d.sort_values("rank_gap", ascending=False).head(top)[
        ["term1", "term2", a, b, "rank_a", "rank_b", "rank_gap"]]
