"""Preprocessing for Problem 15: legal speech transcripts -> WordNet synsets.

Steps: clean -> sentence split -> tokenise -> lemmatise (WordNet morphy)
-> map legal terms to hand-checked noun synsets via a lexicon.
"""
import csv
import re
from pathlib import Path

from nltk.corpus import wordnet as wn

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def clean_text(text: str) -> str:
    """Lower-case, normalise whitespace and strip stray punctuation."""
    text = text.replace("’", "'")
    text = re.sub(r"[^\w\s.'?!-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def split_sentences(text: str) -> list[str]:
    """Regex sentence splitter (no punkt download needed)."""
    parts = re.split(r"(?<=[.?!])\s+(?=[A-Z])", text.strip())
    return [p.strip() for p in parts if p.strip()]


def tokenize(sentence: str) -> list[str]:
    return re.findall(r"[a-z]+(?:'[a-z]+)?", sentence.lower())


def lemmatize(token: str) -> str:
    """WordNet lemma (noun first), falling back to the token itself."""
    token = token.removesuffix("'s")
    return wn.morphy(token, wn.NOUN) or token


def load_lexicon(path: Path = DATA / "annotated" / "legal_lexicon.csv") -> dict[str, str]:
    with open(path, newline="") as f:
        return {r["term"]: r["synset"] for r in csv.DictReader(f)}


def load_statutes(path: Path = DATA / "annotated" / "statute_definitions.csv") -> list[dict]:
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def load_gold(path: Path = DATA / "annotated" / "gold_pairs.csv") -> list[dict]:
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["gold"] = float(r["gold"])
    return rows


def load_transcript(path: Path = DATA / "raw_transcripts" / "oral_argument_sample.txt") -> str:
    return Path(path).read_text()


def extract_legal_terms(text: str, lexicon: dict[str, str] | None = None) -> list[dict]:
    """Return one record per legal term occurrence: sentence index, term, synset name."""
    lexicon = lexicon or load_lexicon()
    out = []
    for i, sent in enumerate(split_sentences(text)):
        for tok in tokenize(sent):
            lem = lemmatize(tok)
            if lem in lexicon:
                out.append({"sentence": i, "token": tok, "term": lem, "synset": lexicon[lem]})
    return out
