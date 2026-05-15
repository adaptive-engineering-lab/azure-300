# AI-300 · LP1 · Module 1: Experiment with Azure Machine Learning
**URL**: https://learn.microsoft.com/en-us/training/modules/experiment-azure-machine-learning/
**Units**: 10 | **Level**: Beginner → Intermediate

---

## Unit 2 — Preprocess Data and Configure Featurization

### Data asset setup for AutoML
- AutoML requires a **MLTable** data asset (not a plain CSV/URI file) — includes schema definition
- Create `MLTable` when data is stored in a folder alongside a `MLTable` file
- Reference in code: `Input(type=AssetTypes.MLTABLE, path="azureml:input-data-automl:1")`

### Automatic featurization (applied by default)
- **Scaling & normalization**: applied automatically to numeric data to prevent large-scale features from dominating
- **Missing value imputation**: fills nulls to eliminate training errors
- **Categorical encoding**: converts categorical features to numeric indicators
- **High-cardinality feature dropping**: removes columns like record IDs
- **Feature engineering**: derives date parts from DateTime features
- Featurization can be disabled or customized (e.g. specify imputation method per feature)

---

## Unit 3 — Run an AutoML Experiment

### Algorithm pool (classification tasks)
- Logistic Regression, LightGBM, Decision Tree, Random Forest, Naive Bayes, Linear SVM, XGBoost, and others
- Algorithms can be **blocked** (excluded) via configuration — useful for policy compliance or unsuitable data types

### Key configuration parameters
```python
automl.classification(
    compute="aml-cluster",
    experiment_name="...",
    training_data=my_training_data_input,   # must be MLTable
    target_column_name="Diabetic",
    primary_metric="accuracy",              # metric to rank all models
    n_cross_validations=5,
    enable_model_explainability=True
)
```

### Limits (cost + time control)
- `timeout_minutes`: total experiment timeout
- `trial_timeout_minutes`: max time per individual trial
- `max_trials`: max number of models trained
- `enable_early_termination`: stop if score isn't improving
- `max_concurrent_trials`: parallelize — limited by number of compute cluster nodes

### Submission
- `ml_client.jobs.create_or_update(classification_job)` — returns job; monitor in Studio via `returned_job.studio_url`

---

## Unit 4 — Evaluate and Compare Models

### Data guardrails (3 types for classification)
| Guardrail | States |
|-----------|--------|
| Class balancing detection | Passed / Done / Alerted |
| Missing feature values imputation | Passed / Done / Alerted |
| High cardinality feature detection | Passed / Done / Alerted |

- **Passed**: no issues
- **Done**: AutoML applied changes — review them
- **Alerted**: issue detected but not fixable — fix in source data

### Model display name convention
- e.g. `MaxAbsScaler, LightGBM` — scaling technique + algorithm
- Models sorted by primary metric; best model at top of Models tab

### Model explainability
- Enable at job config level (`enable_model_explainability=True`) for best model auto-explanation
- Can generate per-model explanations post-run via "Explain model" in Studio

---

## Unit 5 — Configure MLflow for Model Tracking in Notebooks

### Two packages required
- `mlflow` — open-source library
- `azureml-mlflow` — Azure ML integration

### On a compute instance (within AML workspace)
- MLflow is **pre-configured** — no additional setup needed
- Verify: `pip show mlflow` and `pip show azureml-mlflow`

### On a local device
1. `pip install mlflow azureml-mlflow`
2. Get **MLflow tracking URI** from Azure portal (AML service overview page)
3. Set: `mlflow.set_tracking_uri = "MLFLOW-TRACKING-URI"`

---

## Unit 6 — Train and Track Models in Notebooks

### Experiments and runs
- `mlflow.set_experiment(experiment_name="heart-condition-classifier")` — groups runs
- Default experiment name: `Default` (if not set)
- Start a tracked run: `with mlflow.start_run():`

### Autologging (simplest approach)
- `mlflow.autolog()` — framework decides what to log (params, metrics, artifacts, model)
- Framework-specific: `mlflow.xgboost.autolog()`
- Supported frameworks: XGBoost, scikit-learn, PyTorch, TensorFlow, Keras, etc.

### Custom logging functions
| Function | Purpose |
|----------|---------|
| `mlflow.log_param(key, value)` | Log a single input parameter |
| `mlflow.log_metric(key, value)` | Log a single numeric output metric |
| `mlflow.log_figure(fig, artifact_file)` | Log a matplotlib figure |
| `mlflow.log_image(image, artifact_file)` | Log a numpy/PIL image |
| `mlflow.log_artifact(local_path)` | Log any existing file |
| `mlflow.log_model(model, artifact_path)` | Log a model (with signature, env, examples) |

- Can combine autologging + custom logging in the same run

---

## Unit 7 — Evaluate Models with the Responsible AI Dashboard

### Microsoft's 6 Responsible AI Principles
1. **Fairness** — equitable outcomes, test and mitigate harmful bias
2. **Reliability & Safety** — consistent performance, prevent unsafe behavior
3. **Privacy & Security** — minimal data collection, responsible data handling
4. **Inclusiveness** — usable by people of diverse abilities and backgrounds
5. **Transparency** — explain how the model works and how to interpret outputs
6. **Accountability** — human oversight; decisions are traceable and governed

### RAI Dashboard — Pipeline structure (required order)
1. `RAI Insights dashboard constructor` (start)
2. One or more RAI tool components
3. `Gather RAI Insights dashboard` (end — collects everything)

### 4 RAI tool components
| Component | What it shows |
|-----------|--------------|
| Add Explanation | Feature importance (aggregate + individual) |
| Add Error Analysis | Error distribution — tree map + heat map by feature/subgroup |
| Add Counterfactuals | What-if: minimal input changes to flip prediction |
| Add Causal | Average causal effect of a feature on outcome |

### Finding the dashboard
- Via pipeline overview after pipeline completes
- Via **Responsible AI** tab on the registered model in Studio

### Key exam traps
- RAI dashboard requires a **pipeline** (not just a training run)
- The pipeline must start with the constructor AND end with the gather component
- Error analysis uses **error tree map** (finds subgroup combinations) and **error heat map** (across 1-2 features)
- Counterfactuals answer "which minimal changes flip the prediction?" (not just feature importance)
- Causal uses **historical data** to estimate real-world intervention effects

---

## Testable Facts Summary

| Fact | Value |
|------|-------|
| AutoML input type required | MLTable (not uri_file) |
| MLflow package for AML integration | azureml-mlflow |
| Autologging trigger | `mlflow.autolog()` |
| Metric to rank AutoML models | primary_metric (e.g. accuracy) |
| Default experiment name in MLflow | "Default" |
| RAI pipeline start component | RAI Insights dashboard constructor |
| RAI pipeline end component | Gather RAI Insights dashboard |
| Responsible AI principles count | 6 |
| Data guardrail states | Passed, Done, Alerted |
| AutoML: parallel trials limit | Determined by compute cluster max nodes |
