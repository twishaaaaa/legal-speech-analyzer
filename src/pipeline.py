"""Execution pipeline / evaluation runner for Problem 15.
Run:  python src/pipeline.py [--ic genesis|brown]
Writes tables and charts to outputs/.
"""
import argparse
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import models as M  # noqa: E402
import preprocessing as P  # noqa: E402

OUT = P.ROOT / "outputs"


def heatmap(df: pd.DataFrame, title: str, path: Path):
    fig, ax = plt.subplots(figsize=(7.5, 6.5))
    im = ax.imshow(df.values.astype(float), cmap="viridis")
    ax.set_xticks(range(len(df)), df.columns, rotation=60, ha="right", fontsize=8)
    ax.set_yticks(range(len(df)), df.index, fontsize=8)
    ax.set_title(title)
    fig.colorbar(im, ax=ax, shrink=0.8)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def run(ic: str = "genesis", min_norm: float = 0.6) -> dict:
    OUT.mkdir(exist_ok=True)
    sim = M.WordNetSimilarity(ic)
    gold = P.load_gold()
    table = sim.pair_table(gold)
    table.to_csv(OUT / "pair_scores.csv", index=False)

    spear = M.metric_correlations(table, "spearman")
    pear = M.metric_correlations(table, "pearson")
    spear.round(3).to_csv(OUT / "metric_correlations_spearman.csv")
    pear.round(3).to_csv(OUT / "metric_correlations_pearson.csv")
    agree = M.gold_agreement(table)
    agree.round(3).to_csv(OUT / "gold_agreement.csv", index=False)
    sep = M.control_separation(table)
    sep.round(3).to_csv(OUT / "control_separation.csv", index=False)
    dis_path_res = M.rank_disagreements(table, "wup", "res")
    dis_path_res.round(3).to_csv(OUT / "rank_disagreements_wup_vs_res.csv", index=False)

    # similarity matrices on distinct legal terms (one synset per term)
    lex = P.load_lexicon()
    terms = {t: lex[t] for t in
             ["contract", "agreement", "plaintiff", "defendant", "attorney", "court",
              "judge", "jury", "testimony", "evidence", "verdict", "larceny", "crime",
              "fraud", "fine", "tort", "negligence"]}
    for m in M.METRICS:
        mat = sim.matrix(terms, m)
        mat.round(3).to_csv(OUT / f"matrix_{m}.csv")
        heatmap(mat, f"{M.LABELS[m]} similarity ({ic} IC)" if m in M.IC_METRICS
                else f"{M.LABELS[m]} similarity", OUT / f"matrix_{m}.png")

    # transcript -> statute matching
    text = P.load_transcript()
    statutes = P.load_statutes()
    occ = P.extract_legal_terms(text, lex)
    seen, match_rows = set(), []
    for o in occ:
        if o["term"] in seen:
            continue
        seen.add(o["term"])
        row = {"term": o["term"], "synset": o["synset"]}
        for m in M.METRICS:
            name, val, norm = M.best_statute_match(sim, o["synset"], statutes, m, min_norm)
            row[f"{m}_best"] = name or "(no confident match)"
            row[f"{m}_score"], row[f"{m}_norm"] = round(val, 3), round(norm, 3)
        match_rows.append(row)
    match = pd.DataFrame(match_rows)
    match.to_csv(OUT / "transcript_statute_matches.csv", index=False)

    # charts
    fig, ax = plt.subplots(figsize=(6.5, 4))
    x = np.arange(len(sep))
    ax.bar(x - 0.2, sep.related_mean, 0.4, label="related pairs")
    ax.bar(x + 0.2, sep.control_mean, 0.4, label="unrelated controls")
    ax.set_xticks(x, sep.metric, rotation=20)
    ax.set_ylabel("mean normalised score")
    ax.set_title("Related vs unrelated separation")
    ax.legend()
    fig.tight_layout(); fig.savefig(OUT / "separation.png", dpi=150); plt.close(fig)

    n = M.normalise(table)
    fig, axes = plt.subplots(1, 5, figsize=(15, 3.2), sharey=True)
    for ax, m in zip(axes, M.METRICS):
        ax.scatter(table.gold, n[m + "_norm"], s=18)
        ax.set_title(M.LABELS[m], fontsize=9)
        ax.set_xlabel("gold rating")
    axes[0].set_ylabel("normalised score")
    fig.tight_layout(); fig.savefig(OUT / "gold_scatter.png", dpi=150); plt.close(fig)
    heatmap(spear, "Spearman correlation between metrics", OUT / "metric_corr.png")

    summary = {
        "ic_corpus": ic,
        "n_pairs": len(table),
        "n_related": int((table.kind == "related").sum()),
        "n_control": int((table.kind == "control").sum()),
        "n_transcript_sentences": len(P.split_sentences(text)),
        "n_legal_term_occurrences": len(occ),
        "n_distinct_legal_terms": len(seen),
        "match_threshold": min_norm,
        "terms_with_confident_match": {M.LABELS[m]: int((match[f"{m}_best"] != "(no confident match)").sum()) for m in M.METRICS},
        "gold_agreement": agree.round(3).to_dict("records"),
        "control_separation": sep.round(3).to_dict("records"),
    }
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2))
    return summary


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--ic", default="genesis", choices=["genesis", "brown"])
    ap.add_argument("--min-norm", type=float, default=0.6, help="confidence threshold for statute matching")
    a = ap.parse_args()
    s = run(a.ic, a.min_norm)
    print(json.dumps(s, indent=2))
