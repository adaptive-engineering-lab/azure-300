# AI-300 · Learning Path 1: Operationalize Machine Learning Models (MLOps)
**URL**: https://learn.microsoft.com/en-us/training/paths/build-first-machine-operations-workflow/  
**Modules**: 7 | **Level**: Intermediate

---

## Modules

### Module 1 — Experiment with Azure Machine Learning
- Find the best ML model using AutoML (automated machine learning)
- Track experiments with MLflow-enabled notebooks
- Use the Responsible AI dashboard to evaluate models
- Compare model performance across jobs

### Module 2 — Perform Hyperparameter Tuning with Azure Machine Learning
- Run sweep jobs for hyperparameter tuning
- Define parameter search spaces (discrete, continuous)
- Choose sampling strategies: grid, random, Bayesian
- Set early termination policies to save compute

### Module 3 — Run Pipelines in Azure Machine Learning
- Create pipeline components (reusable, versioned steps)
- Build and run Azure ML pipelines
- Schedule pipelines for recurring automation
- Share components via registries across workspaces

### Module 4 — Trigger Azure Machine Learning Jobs with GitHub Actions
- Set up GitHub Actions workflows for ML automation
- Authenticate GitHub to Azure Machine Learning securely
- Trigger model training jobs on code push or schedule
- Pass parameters and capture outputs from jobs

### Module 5 — Trigger GitHub Actions with Feature-Based Development
- Protect the main branch with branch policies
- Use trunk-based / feature-branch development in ML projects
- Trigger workflows on pull requests and merges
- Implement linting and unit tests as quality gates

### Module 6 — Work with Environments in GitHub Actions
- Define deployment environments (dev / staging / prod)
- Require manual approval gates between environments
- Train, test, and deploy models through environment stages
- Manage environment-specific secrets and variables

### Module 7 — Deploy a Model with GitHub Actions
- Automate model deployment to online/batch endpoints
- Use Azure ML CLI (v2) in GitHub Actions steps
- Test deployed endpoints in CD pipelines
- Implement safe rollout strategies (blue/green, canary)

---

## Domain 1 Coverage — Design and Implement MLOps Infrastructure (15–20%)

### Create and manage resources in a Machine Learning workspace
- Create and manage a workspace
- Create and manage datastores
- Create and manage compute targets
- Configure identity and access management for workspaces

### Create and manage assets in a Machine Learning workspace
- Create and manage data assets
- Create and manage environments
- Create and manage components
- Share assets across workspaces using registries

### Implement IaC for Machine Learning
- Configure GitHub integration with AML for secure access
- Deploy AML workspaces and resources using Bicep and Azure CLI
- Automate resource provisioning using GitHub Actions workflows
- Restrict network access to Machine Learning workspaces
- Manage source control for ML projects using Git

---

## Domain 2 Coverage — ML Model Lifecycle and Operations (25–30%)

### Orchestrate model training
- Configure experiment tracking with MLflow
- Use automated ML to explore optimal models
- Use notebooks for experimentation and exploration
- Automate hyperparameter tuning
- Run model training scripts
- Manage distributed training for large/deep learning models
- Implement training pipelines
- Compare model performance across jobs

### Implement model registration and versioning
- Package a feature retrieval specification with the model artifact
- Register an MLflow model
- Evaluate a model by using responsible AI principles
- Manage model lifecycle, including archiving models

### Deploy ML models for production environments
- Deploy models as real-time or batch endpoints with managed inference
- Test and troubleshoot model endpoints
- Implement progressive rollout and safe rollback strategies

### Monitor and maintain ML models in production
- Detect and analyze data drift
- Monitor performance metrics of deployed models
- Configure retraining or alert triggers when thresholds are exceeded

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| MLflow | Open-source framework for tracking experiments, registering models, packaging |
| AutoML | Azure ML feature to automatically explore algorithms and hyperparameters |
| Pipeline | Directed acyclic graph of ML steps (data prep → train → evaluate → deploy) |
| Component | Reusable, versioned pipeline step defined with inputs/outputs and environment |
| Registry | Cross-workspace sharing of models, components, environments, datasets |
| Online endpoint | Real-time inference; supports blue/green traffic split |
| Batch endpoint | Asynchronous scoring for large datasets |
| Data drift | Statistical change in model input data over time, leading to model decay |
| Responsible AI | Framework for fairness, interpretability, error analysis (RAI dashboard) |
| Sweep job | Hyperparameter tuning job that runs multiple child jobs across a search space |
