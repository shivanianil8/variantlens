# VariantLens — Explainable Genetic Variant Explorer

**VariantLens** is an educational and research-exploration platform designed to investigate human genetic variants, evaluate functional and structural consequences, and explore in silico pathogenicity predictions with transparent SHAP explanations.

> **Regulatory & Clinical Notice**: VariantLens is built exclusively for academic research and bioinformatics education. It is **NOT** a clinical diagnostic medical device and must never be used for clinical treatment decisions.

---

## Architecture Overview

VariantLens is designed as a decoupled, full-stack scientific application:

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Mol* (Molstar) 3D Viewer integration.
- **Backend API**: Python 3.14, FastAPI, Pydantic v2, Biopython, Uvicorn.
- **Machine Learning**: scikit-learn, XGBoost, TreeSHAP (gene-level held-out evaluation via `GroupKFold`).
- **Biological Data Sources**: NCBI ClinVar, UniProtKB, gnomAD v4.1, AlphaFold Protein Structure Database, NCBI Entrez E-utilities (PubMed).

---

## Project Structure

```
variantlens/
├── .env.example                       # Environment template
├── .gitignore                         # Git exclusion rules
├── README.md                          # Platform documentation
├── backend/
│   ├── .venv/                         # Isolated Python virtual environment
│   ├── requirements.txt               # Pinned dependencies
│   ├── pytest.ini                     # Pytest configuration
│   ├── app/
│   │   ├── main.py                    # FastAPI entrypoint, CORS, routers
│   │   ├── core/
│   │   │   ├── config.py              # Application settings
│   │   │   └── constants.py           # Biological constants, AA scales, review maps
│   │   ├── schemas/
│   │   │   ├── health.py              # Health check schema
│   │   │   ├── variant_schema.py      # Variant query & biological annotation schemas
│   │   │   └── model_info_schema.py   # Model metadata & provenance schema
│   │   └── api/
│   │       ├── routes_health.py       # GET /api/health
│   │       ├── routes_variants.py     # GET /api/variants/search & /benchmarks
│   │       └── routes_model_info.py   # GET /api/model/metadata
│   └── tests/
│       └── test_api.py                # Automated API test suite
│
└── frontend/
    ├── package.json                   # NPM packages & scripts
    ├── vite.config.ts                 # Vite config with backend /api reverse proxy
    ├── tailwind.config.js             # Custom scientific dark navy/cyan theme
    ├── tsconfig.json                  # TypeScript configuration
    └── src/
        ├── App.tsx                    # Root layout & route configuration
        ├── main.tsx                   # React DOM bootstrap
        ├── index.css                  # Tailwind styles & scientific scrollbars
        ├── types/
        │   └── variant.ts             # TypeScript biological data contracts
        ├── services/
        │   └── api.ts                 # Typed fetch client
        ├── components/
        │   ├── common/                # ClinicalBadge, NonDiagnosticBanner
        │   ├── layout/                # Navbar, Footer
        │   └── search/                # VariantSearchBar with benchmark presets
        └── pages/
            ├── OverviewPage.tsx       # Platform dashboard & benchmark cards
            ├── VariantExplorerPage.tsx# ClinVar clinical records & gnomAD frequencies
            ├── Protein3DPage.tsx      # AlphaFold 3D structural viewer
            ├── PredictionPage.tsx     # ML prediction, SHAP layout & feature matrix
            ├── EvidencePage.tsx       # PubMed biomedical citations
            └── AboutModelPage.tsx     # Model card, GroupKFold leakage safeguards
```

---

## Running the Servers

### 1. Backend Server (FastAPI)

```bash
cd /Users/shivani/.gemini/antigravity/scratch/variantlens/backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive API Documentation (Swagger)**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **Health Endpoint**: `http://localhost:8000/api/health`

### 2. Frontend Development Server (React + Vite)

```bash
cd /Users/shivani/.gemini/antigravity/scratch/variantlens/frontend
npm run dev
```

- **Frontend Application URL**: `http://localhost:5173/`

### 3. Running Verification Tests

```bash
# Backend pytest suite
cd /Users/shivani/.gemini/antigravity/scratch/variantlens/backend
.venv/bin/pytest tests/

# Frontend TypeScript & production build check
cd /Users/shivani/.gemini/antigravity/scratch/variantlens/frontend
npm run build
```

---

## Leakage Prevention & Scientific Rigor

1. **Gene-Held-Out Evaluation (`GroupKFold`)**: Prevents homolog/gene memorization across cross-validation folds.
2. **Zero Target Leakage**: Clinical submitter counts, review stars, and disease phenotype strings are strictly excluded from input feature vectors.
3. **Missingness Preservation**: Unobserved variants in gnomAD are treated as biological missingness, never silently zero-filled.
4. **Baseline Protocol**: Dummy majority, Logistic Regression (L2), and Random Forest are benchmarked prior to final XGBoost + TreeSHAP training.
