# AI-300 · LP1 · Module 2: Perform Hyperparameter Tuning with Azure Machine Learning
**URL**: https://learn.microsoft.com/en-us/training/modules/perform-hyperparameter-tuning-azure-machine-learning-pipelines/
**Units**: 8 | **Level**: Beginner

---

## Unit 2 — Define a Search Space

### Discrete hyperparameters
| Expression | Behaviour |
|------------|-----------|
| `Choice(values=[10,20,30])` | Pick from explicit list (list, range, or tuple) |
| `QUniform(min, max, q)` | round(Uniform(min,max)/q)*q |
| `QLogUniform(min, max, q)` | round(exp(Uniform(min,max))/q)*q |
| `QNormal(mu, sigma, q)` | round(Normal(mu,sigma)/q)*q |
| `QLogNormal(mu, sigma, q)` | round(exp(Normal(mu,sigma))/q)*q |

### Continuous hyperparameters
| Expression | Behaviour |
|------------|-----------|
| `Uniform(min, max)` | Uniform distribution between min and max |
| `LogUniform(min, max)` | exp(Uniform(min,max)) — log of result is uniform |
| `Normal(mu, sigma)` | Normal distribution |
| `LogNormal(mu, sigma)` | exp(Normal(mu,sigma)) — log of result is normal |

### Example definition
```python
from azure.ai.ml.sweep import Choice, Normal

command_job_for_sweep = job(
    batch_size=Choice(values=[16, 32, 64]),
    learning_rate=Normal(mu=10, sigma=3),
)
```

---

## Unit 3 — Configure a Sampling Method

### Three main sampling methods

| Method | How it works | Use when |
|--------|-------------|----------|
| **Grid** | Tries every combination | All hyperparameters are discrete; small search space |
| **Random** | Randomly selects values | Mix of discrete and continuous; faster exploration |
| **Sobol** | Random with a seed | Need reproducibility + even distribution |
| **Bayesian** | Uses previous results to choose next values | Maximize efficiency over many trials |

### Grid sampling — only for discrete params
```python
sweep_job = command_job_for_sweep.sweep(sampling_algorithm="grid", ...)
```

### Random sampling
```python
sweep_job = command_job_for_sweep.sweep(sampling_algorithm="random", ...)
```

### Sobol (reproducible random)
```python
from azure.ai.ml.sweep import RandomSamplingAlgorithm
sweep_job = command_job_for_sweep.sweep(
    sampling_algorithm=RandomSamplingAlgorithm(seed=123, rule="sobol"), ...
)
```

### Bayesian sampling — restricted expressions
- Only supports: `Choice`, `Uniform`, `QUniform`
- Does **not** work with: `Normal`, `LogNormal`, `LogUniform`, etc.
```python
sweep_job = command_job_for_sweep.sweep(sampling_algorithm="bayesian", ...)
```

---

## Unit 4 — Configure Early Termination

### When to use
- Especially useful with **continuous hyperparameters** + random or Bayesian sampling (infinite possibilities)
- May be unnecessary with small discrete grid (e.g. 6-trial grid sweep)

### Common parameters
- `evaluation_interval`: how often to evaluate (every N times the primary metric is logged)
- `delay_evaluation`: skip policy evaluation for the first N trials (let some complete freely)

### Three policy types

#### Bandit Policy
- Stops if new trial underperforms the best by a slack amount (absolute) or factor (relative)
- `slack_amount`: absolute; `slack_factor`: relative ratio
```python
from azure.ai.ml.sweep import BanditPolicy
sweep_job.early_termination = BanditPolicy(
    slack_amount=0.2, delay_evaluation=5, evaluation_interval=1
)
```
- Example: best accuracy = 0.9, slack_amount = 0.2 → any trial below 0.7 is stopped

#### Median Stopping Policy
- Stops if trial performs worse than the **median of running averages** of all trials
```python
from azure.ai.ml.sweep import MedianStoppingPolicy
sweep_job.early_termination = MedianStoppingPolicy(delay_evaluation=5, evaluation_interval=1)
```

#### Truncation Selection Policy
- Cancels the **lowest X% of trials** at each evaluation interval
```python
from azure.ai.ml.sweep import TruncationSelectionPolicy
sweep_job.early_termination = TruncationSelectionPolicy(
    evaluation_interval=1, truncation_percentage=20, delay_evaluation=4
)
```
- Example: 20% = cancel 1 out of every 5 trials if it's the worst performer

---

## Unit 5 — Run a Sweep Job

### Submit sweep job
```python
returned_sweep_job = ml_client.jobs.create_or_update(sweep_job)
# Get best trial
best_run = ml_client.jobs.get(returned_sweep_job.name + "_0")  # example — best child job
```

### Relationship to pipeline
- Sweep job runs multiple **child jobs** (trials), each training with a different hyperparameter combination
- Each child job is a command job; sweep job is the parent

---

## Testable Facts Summary

| Fact | Value |
|------|-------|
| Grid sampling constraint | All hyperparameters must be discrete |
| Bayesian sampling — allowed expressions | Choice, Uniform, QUniform only |
| Sobol — purpose | Reproducible random sampling (add seed) |
| Bandit policy — what triggers stop | Trial metric below (best - slack_amount) or (best * (1 - slack_factor)) |
| Median stopping — stop condition | Trial metric below median of running averages |
| Truncation selection — stop condition | Trial is in the lowest X% at evaluation interval |
| `delay_evaluation` purpose | Protect early trials from premature termination |
| `evaluation_interval` meaning | Evaluate policy every N metric logs |
| When early termination is most useful | Continuous hyperparameters + random/Bayesian sampling |
