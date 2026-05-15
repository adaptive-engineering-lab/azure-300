# AI-300 · LP1 · Module 3: Run Pipelines in Azure Machine Learning
**URL**: https://learn.microsoft.com/en-us/training/modules/run-pipelines-azure-machine-learning/
**Units**: 7 | **Level**: Beginner

---

## Unit 2 — Create Components

### What is a component?
- Reusable script (any language) stored in the AML workspace
- Designed to perform **one specific action** in an ML workflow (e.g. normalize data, train model, evaluate)
- Can be shared across users and reused in multiple pipelines

### A component has 3 parts
1. **Metadata**: name, version, display name
2. **Interface**: expected inputs (datasets, hyperparameters) and outputs (metrics, artifacts)
3. **Command, code, and environment**: how to run the code

### Two files required to create a component
1. A **script** (e.g. `prep.py`) containing the workflow
2. A **YAML file** (e.g. `prep.yml`) defining metadata, interface, command, and environment

### Example YAML structure
```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandComponent.schema.json
name: prep_data
display_name: Prepare training data
version: 1
type: command
inputs:
  input_data:
    type: uri_file
outputs:
  output_data:
    type: uri_file
code: ./src
environment: azureml:AzureML-sklearn-0.24-ubuntu18.04-py37-cpu@latest
command: >-
  python prep.py
  --input_data ${{inputs.input_data}}
  --output_data ${{outputs.output_data}}
```

### Load and register a component
```python
from azure.ai.ml import load_component
loaded_component_prep = load_component(source="./prep.yml")

# Register to workspace (makes it accessible to all users)
prep = ml_client.components.create_or_update(prepare_data_component)
```

---

## Unit 3 — Create a Pipeline

### Pipeline definition
- A **pipeline** = workflow of ML tasks where each task = a **component**
- Components can run **sequentially** or **in parallel**
- Each component can use a **different compute target**
- Defined in YAML or via the `@pipeline()` decorator

### Build with `@pipeline()` decorator
```python
from azure.ai.ml.dsl import pipeline

@pipeline()
def pipeline_function_name(pipeline_job_input):
    prep_data = loaded_component_prep(input_data=pipeline_job_input)
    train_model = loaded_component_train(training_data=prep_data.outputs.output_data)
    return {
        "pipeline_job_transformed_data": prep_data.outputs.output_data,
        "pipeline_job_trained_model": train_model.outputs.model_output,
    }
```

### Key pipeline concepts
- **Parent job**: the pipeline itself
- **Child job**: each component's execution within the pipeline
- Outputs of one component flow as inputs to the next via `outputs.output_data`
- Calling the function with inputs creates the pipeline job object

---

## Unit 4 — Run a Pipeline Job

### Configure compute and datastore defaults
```python
pipeline_job.settings.default_compute = "aml-cluster"
pipeline_job.settings.default_datastore = "workspaceblobstore"
pipeline_job.outputs.pipeline_job_trained_model.mode = "upload"
```

### Submit the pipeline
```python
pipeline_job = ml_client.jobs.create_or_update(
    pipeline_job, experiment_name="pipeline_job"
)
```

### Troubleshooting failures
- **Pipeline-level failure** → check outputs and logs of the pipeline job
- **Component-level failure** → check outputs and logs of the **child job** of the failed component

### Schedule a pipeline with RecurrenceTrigger
```python
from azure.ai.ml.entities import RecurrenceTrigger, JobSchedule

recurrence_trigger = RecurrenceTrigger(frequency="minute", interval=1)
job_schedule = JobSchedule(
    name="run_every_minute", trigger=recurrence_trigger, create_job=pipeline_job
)
ml_client.schedules.begin_create_or_update(schedule=job_schedule).result()
```

### Delete a schedule (must disable first)
```python
ml_client.schedules.begin_disable(name=schedule_name).result()
ml_client.schedules.begin_delete(name=schedule_name).result()
```

### RecurrenceTrigger frequency values
- `minute`, `hour`, `day`, `week`, `month`

---

## Testable Facts Summary (Module 3)

| Fact | Value |
|------|-------|
| Component parts count | 3: Metadata, Interface, Command/code/environment |
| Files needed to create a component | 2: script + YAML |
| Register component method | `ml_client.components.create_or_update()` |
| Pipeline parent job vs child job | Parent = pipeline; child = each component's execution |
| Default compute set location | `pipeline_job.settings.default_compute` |
| To delete a schedule, you must first... | Disable it with `begin_disable()` |
| Troubleshoot component failure → look at... | Child job logs of the failed component |

---

# AI-300 · LP1 · Module 4: Trigger Azure Machine Learning Jobs with GitHub Actions
**URL**: https://learn.microsoft.com/en-us/training/modules/trigger-azure-machine-learn-jobs-github-actions/
**Units**: 7 | **Level**: Intermediate

---

## Unit 3 — Solution Architecture (MLOps Loops)

### 6 stages of the MLOps architecture
1. **Setup** — create all Azure resources
2. **Model development (inner loop)** — explore, process data, train and evaluate model
3. **Continuous integration** — package and register the model
4. **Model deployment (outer loop)** — deploy the model
5. **Continuous deployment** — test and promote to production
6. **Monitoring** — monitor model and endpoint performance

### Inner loop vs outer loop
- **Inner loop**: data scientist's iterative work — train, experiment, evaluate
- **Outer loop**: CI/CD automation — package, register, deploy, monitor
- GitHub Actions automates the transition from inner to outer loop

---

## Unit 4 — Use GitHub Actions for Model Training

### Authentication: service principal
- GitHub Actions needs a **service principal** to authenticate to Azure ML
- Service principal must have permissions to use the AML workspace and compute
- Store credentials as a **GitHub Secret** named `AZURE_CREDENTIALS` (never in code)

### Store credentials in GitHub
1. Settings tab → Security → Secrets → Actions
2. Add secret named `AZURE_CREDENTIALS`
3. Reference in YAML: `creds: '${{secrets.AZURE_CREDENTIALS}}'`

### GitHub Actions workflow triggers
| Trigger | Syntax | Use when |
|---------|--------|----------|
| Manual | `on: workflow_dispatch` | Testing |
| Push event | `on: [push]` | Automation on code push |
| Pull request | `on: [pull_request]` | Trigger quality checks |
| Merge to main | `on: push: branches: [main]` | Post-merge pipeline run |

### Example workflow snippet
```yaml
name: Manually trigger an Azure Machine Learning job
on:
  workflow_dispatch:
jobs:
  train-model:
    runs-on: ubuntu-latest
    steps:
    - name: Trigger Azure Machine Learning job
      run: |
        az ml job create --file src/job.yml
```

---

# AI-300 · LP1 · Module 5: Trigger GitHub Actions with Feature-Based Development
**URL**: https://learn.microsoft.com/en-us/training/modules/trigger-github-actions-trunk-based-development/
**Units**: 7 | **Level**: Intermediate

---

## Unit 4 — Trigger a Workflow

### Feature-based (trunk-based) development
- **No one** should push directly to the main branch
- Developers work in **feature branches** → open **pull request** → merge to main
- Pull requests allow verification and code review before merge

### Branch protection rule setup
1. Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable: **Require a pull request before merging** + **Require approvals**
- Prevents direct pushes to main

### Triggers for pull requests vs merges
| Event | Trigger syntax |
|-------|---------------|
| PR opened | `on: [pull_request]` |
| PR merged (push to main) | `on: push: branches: [main]` |

### Exam trap: PR merge ≠ PR trigger
- Merging a PR = a **push** to main, not a pull_request event
- Use `on: push: branches: [main]` to trigger after merge

---

# AI-300 · LP1 · Module 6: Work with Environments in GitHub Actions
**URL**: https://learn.microsoft.com/en-us/training/modules/work-environments-github-actions/
**Units**: 7 | **Level**: Intermediate

---

## Unit 4 — Set Up Environments

### GitHub environments = deployment stages
- Create named environments (e.g. `development`, `staging`, `production`) in Settings → Environments
- Each environment gets its own **environment secrets** (e.g. `AZURE_CREDENTIALS`)
- Environment secrets scope credentials to specific AML workspaces per environment

### Approval gates
- Configure **Required reviewers** on an environment
- Whenever a GitHub Actions job targets that environment, reviewers are notified and must approve before the job runs
- Use case: review model training output before promotion to staging or production

### Why environments matter in MLOps
- Allows training and evaluation in dev, testing in staging, and final deploy in production
- Each environment can point to a separate AML workspace
- Manual approval gates prevent bad models from being promoted automatically

---

# AI-300 · LP1 · Module 7: Deploy a Model with GitHub Actions
**URL**: https://learn.microsoft.com/en-us/training/modules/deploy-model-github-actions/
**Units**: 7 | **Level**: Intermediate

---

## Unit 4 — Model Deployment

### Steps to deploy a model automatically
1. **Package and register** the model (MLflow model from job output or datastore)
2. **Create an endpoint** (HTTPS; stays stable across model updates)
3. **Deploy the model** to the endpoint (using AML CLI v2)
4. **Test the model** (automated testing in the same or separate workflow job)

### MLflow model advantages
- Enable **no-code deployment** — Azure ML handles scoring script automatically
- Use `mlflow.autolog()` during training to log the model

### Register model from job output
- Point registration at the job's output artifact
- Or point at a location in an AML datastore

### Endpoint stability — exam key point
- Endpoint URL remains **constant** across model deployments
- This means the consuming web app does NOT need updating when the model is retrained

### Testing deployed models
- Test can be added to the same workflow, but model deployment takes time
- Ensure test step only runs after deployment completes successfully (use `needs` in GitHub Actions)

---

## Testable Facts Summary (Modules 4-7)

| Fact | Value |
|------|-------|
| GitHub secret name for Azure credentials | `AZURE_CREDENTIALS` |
| Manual trigger syntax | `on: workflow_dispatch` |
| Trigger after PR merge | `on: push: branches: [main]` |
| Trigger when PR is opened | `on: [pull_request]` |
| Branch protection purpose | Block direct pushes to main; require PR + approvals |
| GitHub environment secrets scope | Per environment (can point to different AML workspaces) |
| Approval gate effect | Reviewers must approve before job runs in that environment |
| Endpoint URL stability | Remains constant across deployments — consuming app never needs updating |
| MLflow no-code deployment | Possible when model is logged with MLflow (no scoring script needed) |
| Deploy model CLI command | `az ml job create --file src/job.yml` (job), `az ml online-endpoint create` (endpoint) |
