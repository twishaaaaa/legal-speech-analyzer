"""Export every WordNet score the web frontend needs into web/data.json.

Run ONCE on your machine (needs NLTK data), then deploy the `web/` folder:
    python export_data.py

The site is fully static: no Python runs on the server. All similarity scores for
lexicon terms x statute terms and lexicon terms x lexicon terms are precomputed here.
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT / "src"))

import analysis as A  # noqa: E402
import models as M  # noqa: E402
import preprocessing as P  # noqa: E402

IC_CORPUS = "genesis"


def clean(v):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), 4)


def scores(sim, a, b):
    return {k: clean(v) for k, v in sim.score(a, b).items()}


def surface_forms(term):
    """Inflected spellings that WordNet's lemmatiser maps back to `term`."""
    forms = {term, term + "s", term + "es", term + "'s"}
    if term.endswith("y"):
        forms.add(term[:-1] + "ies")
    return {f: term for f in forms if P.lemmatize(f) == term or f == term}


def main():
    sim = M.WordNetSimilarity(IC_CORPUS)
    lex = P.load_lexicon()
    statutes = P.load_statutes()
    terms = sorted(lex)

    variants = {}
    for t in terms:
        variants.update(surface_forms(t))

    term_statute, why = {}, {}
    for t in terms:
        term_statute[t], why[t] = {}, {}
        for s in statutes:
            term_statute[t][s["statute_term"]] = scores(sim, lex[t], s["synset"])
            why[t][s["statute_term"]] = A.explain_match(lex[t], s["synset"])

    term_term = {a: {b: scores(sim, lex[a], lex[b]) for b in terms} for a in terms}
    ceilings = {m: clean(M.metric_ceiling(sim, m, [s["synset"] for s in statutes]))
                for m in M.METRICS}

    data = {
        "ic_corpus": IC_CORPUS,
        "metrics": M.METRICS,
        "ceilings": ceilings,
        "lexicon": lex,
        "variants": variants,
        "statutes": [{"name": s["statute_term"], "synset": s["synset"],
                      "definition": s["definition"]} for s in statutes],
        "term_statute": term_statute,
        "why": why,
        "term_term": term_term,
    }
    out = ROOT / "web" / "data.json"
    out.write_text(json.dumps(data, separators=(",", ":")))
    print(f"Wrote {out} ({out.stat().st_size / 1024:.0f} KB): "
          f"{len(terms)} terms, {len(statutes)} statutes")


if __name__ == "__main__":
    main()
