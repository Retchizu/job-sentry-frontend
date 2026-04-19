# Frontend API Endpoints

Base URL (local): `http://127.0.0.1:8000`

Canonical response models: `job-sentry-backend/app/schemas.py` (`PredictResponse`, `HealthResponse`, etc.).

## 1) Service Info

- **Method:** `GET`
- **Path:** `/`
- **Request body:** none

### Response (`200`)

```json
{
  "service": "job-sentry-backend",
  "version": "0.3.0",
  "docs": "/docs"
}
```

## 2) Health Check

- **Method:** `GET`
- **Path:** `/health`
- **Request body:** none

### Response (`200`) — healthy (model loaded)

```json
{
  "status": "ok",
  "model_loaded": true,
  "mode": "phase6_fused",
  "artifact_path": "artifacts/models/phase6_fused",
  "device": "cpu",
  "message": null
}
```

### Response (`200`) — degraded (no model)

When no fused model is configured, the server still returns **200** with `status: "degraded"` and `model_loaded: false`. **`artifact_path`** is **`null`** (no artifact on disk).

```json
{
  "status": "degraded",
  "model_loaded": false,
  "mode": "none",
  "artifact_path": null,
  "device": "cpu",
  "message": "No fused model configured. Set JOBSENTRY_PHASE6_FUSED_DIR to enable predictions."
}
```

Notes:

- `status` is `"ok"` or `"degraded"`.
- **`artifact_path`** may be **`null`** when no model artifact is loaded or the path is unset; do not assume a string.
- If `model_loaded` is `false`, **`POST /predict`** returns **`503`**.

## 3) Job post prediction (multiclass)

- **Method:** `POST`
- **Path:** `/predict`
- **Request body:** required JSON object with `posts` array (minimum 1 item)

### Request body schema

```json
{
  "posts": [
    {
      "text": "optional free-form text",
      "job_title": "optional",
      "job_desc": "optional",
      "skills_desc": "optional",
      "company_profile": "optional",
      "rate": {
        "amount_min": 0,
        "amount_max": 0,
        "currency": "USD",
        "type": "hourly"
      }
    }
  ]
}
```

### Request body rules

- Provide either:
  - non-empty `text`, or
  - at least one of: `job_title`, `job_desc`, `skills_desc`, `company_profile`.
- `posts` must contain at least 1 item.
- If `rate` is provided:
  - `amount_min` and `amount_max` must be `>= 0`
  - `amount_min <= amount_max`
  - `currency` must be a 3-letter uppercase ISO code (example: `USD`, `PHP`)
  - `type` must be one of: `hourly`, `daily`, `weekly`, `monthly`, `yearly`

### Example request

```json
{
  "posts": [
    {
      "job_title": "Remote Data Entry Specialist",
      "job_desc": "Work from home, immediate start, no experience needed",
      "skills_desc": "Typing, spreadsheets",
      "company_profile": "Global talent solutions provider"
    }
  ]
}
```

### Response (`200`)

Success responses use **parallel arrays** (one index per post, same order as `posts`). The UI maps tiers as **legit** / **warning** / **fraud** from `predicted_class` / `predicted_label`.

```json
{
  "predicted_class": [1],
  "predicted_label": ["warning"],
  "legit_probability": [0.15],
  "warning_probability": [0.62],
  "fraud_probability": [0.23],
  "confidence": [0.62],
  "warnings": [["upfront_payment", "off_platform_contact"]]
}
```

Notes:

- **`predicted_class`**: per post, **`0` = legit**, **`1` = warning**, **`2` = fraud**.
- **`predicted_label`**: per post, **`"legit"`**, **`"warning"`**, or **`"fraud"`** (string form of the winning class).
- **`legit_probability`**, **`warning_probability`**, **`fraud_probability`**: per-post values from the 3-class softmax (approximately sum to **1.0** per post).
- **`confidence`**: per post, the **maximum** of the three class probabilities for that post (winner probability), i.e. `max(legit, warning, fraud)` for that index. In the example, `0.62 === max(0.15, 0.62, 0.23)`.
- **`warnings`**: one entry per post, same order as `posts`. Each entry is an array of **stable string codes** from rule-based heuristics (complements the model; empty `[]` if none matched).
- Known codes (subject to backend updates): `upfront_payment`, `off_platform_contact`, `high_pressure`, `guaranteed_income`, `crypto_or_gift_card`, `sensitive_info_request`.

### Error responses

- `422 Unprocessable Entity`
  - invalid payload shape/validation
  - empty text and no structured fields for a post
  - request batch larger than server `max_batch_size`
- `503 Service Unavailable`
  - model not loaded (`JOBSENTRY_PHASE6_FUSED_DIR` not configured)
