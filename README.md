# Problem 15: WordNet Similarity Measures for Legal Speech Analysis

MT-AIML mini project (Module 4: Word Sense Disambiguation & WordNet Methods).
Compares taxonomic (Path, Wu-Palmer, Leacock-Chodorow) and information-theoretic
(Resnik, Lin) WordNet similarity on legal terms from oral-argument transcripts and
statute definitions.

## Structure
```
docs/Architecture_and_Methodology.pdf   formulas, design, data flow, limitations
docs/Evaluation_Report.pdf              metric tables, charts, failure analysis
src/preprocessing.py                    cleaning, sentence split, tokenise, lemmatise, loaders
src/models.py                           5 similarity measures, IC, matrices, correlations, matching
src/pipeline.py                         evaluation runner (writes outputs/)
data/raw_transcripts/                   sample oral-argument transcript (synthetic)
data/annotated/                         legal lexicon, statute definitions, gold pair ratings
app.py                                  Streamlit app: Legal Speech Analyzer (document workflow)
src/analysis.py                         document analysis: matching, explanations, highlighting, doc-vs-doc
app_old_two_term_demo.py                original two-word demo app (kept for reference)
build_reports.py                        regenerates the two PDFs from outputs/
requirements.txt
```

## Setup
```bash
pip install -r requirements.txt
python -c "import nltk; [nltk.download(p) for p in ['wordnet','omw-1.4','wordnet_ic','genesis']]"
```

## Run
```bash
python src/pipeline.py                 # Genesis IC (default); tables + charts -> outputs/
python src/pipeline.py --ic brown      # Brown IC
streamlit run app.py                   # Legal Speech Analyzer (upload/paste a document)
python build_reports.py                # rebuild PDFs (needs outputs/ from a prior run)
```
To refresh the PDFs after changing data, run the pipeline with `--ic brown`, copy
`outputs/gold_agreement.csv` and `outputs/control_separation.csv` to
`*_brown.csv`, then run the pipeline again with the default IC and `build_reports.py`.

## Data notes (read before citing results)
- `gold_pairs.csv` ratings (0-4) were assigned by the author, not independent annotators.
- The sample transcript is synthetic. Replace both with real material for a stronger evaluation.
- Genesis IC uses add-1 smoothing; the root synset gets a slightly negative IC (about -0.083).

## What the app does (real-world workflow)
1. **Analyse a document**: paste, upload .txt/.pdf, or use a sample. Legal terms are found
   automatically, linked to statutes with a confidence label and a plain-English reason,
   highlighted in the text, and exportable as CSV.
2. **Compare two documents**: overall legal-subject similarity plus the closest term pairs.
3. **Under the hood**: two-term explainer, similarity matrices, evaluation tables.
Only terms in `data/annotated/legal_lexicon.csv` are detected; extend that file to widen coverage.

## Web frontend (deployable on Vercel)
`web/` is a static glassmorphism site (HTML/CSS/JS, no build step, no Python at runtime).
All WordNet scores are precomputed into `web/data.json` by `export_data.py`.

    python export_data.py            # run once; writes web/data.json (needs NLTK data)
    cd web && python -m http.server  # local preview at http://localhost:8000

Deploy: push the repo to GitHub (commit web/data.json), import it in Vercel, set
**Root Directory = web**, Framework Preset = Other, and deploy.
