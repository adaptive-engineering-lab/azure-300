# AI-300 · LP2 · Module 2: Evaluating Generative AI Applications
**URL**: https://learn.microsoft.com/en-us/training/modules/evaluate-generative-ai-apps/
**Units**: 9 | **Level**: Beginner

---

## Unit 2 — Evaluate Generative AI

### Why evaluations matter
- **Quality assurance**: ensure AI meets expected standards for usefulness, clarity, reliability
- **Safety validation**: surface harmful or policy-breaking behavior before reaching users
- **Change comparison**: compare prompt/retrieval/model/tool changes with evidence
- **User trust**: consistently evaluated apps are easier to improve and trust

### AI-assisted evaluators — judge model requirement
- Most quality and agent evaluators need an **Azure OpenAI connection** with a **deployed GPT model** (chat completion)
- **Exceptions** (use Microsoft's hosted evaluation service — no judge model needed):
  - All **Safety evaluators** (hate, violence, sexual, self-harm, etc.)
  - **Groundedness Pro**

### Foundry portal evaluation targets (3 options)
1. **Agent** — evaluate a deployed agent
2. **Model** — evaluate a deployed model (generates responses at runtime)
3. **Dataset** — evaluate a pre-built dataset (CSV or JSONL)

### Workflow
1. Choose target (Agent, Model, or Dataset)
2. Upload or generate dataset
3. Select evaluators (built-in or custom)
4. Map data fields to evaluator inputs
5. Inspect aggregate metrics + per-row results in portal

### Review strategy
- **Aggregate metrics**: see overall trend of a run
- **Row-level results**: see which prompts failed, scores, labels, and reasoning
- Always combine automated evaluation with **targeted human review** (surfaces tone, incomplete answers, plausible-but-misleading outputs)

---

## Unit 3 — The Role of Data in Evaluations

### Characteristics of good evaluation data
1. **Diversity** — wide range of scenarios and inputs
2. **Representativeness** — reflects real-world user interactions
3. **Quality** — clean, well-labeled, error-free
4. **Relevance** — aligned with specific app goals and requirements
5. **Regularly updated** — refresh to reflect evolving needs and policies
6. **Balanced quality and quantity** — enough data to be meaningful

### Standard evaluation fields
| Field | Description |
|-------|-------------|
| `query` | The question or prompt given to the AI |
| `response` | AI-generated answer |
| `context` | Grounding material used (e.g. retrieved chunks in RAG) |
| `ground_truth` | Trusted reference answer (human or approved source) |
| `tool_calls` | Structured tool invocation data (for agent evaluators) |
| `tool_definitions` | Descriptions of available tools (for agent evaluators) |

### Special schemas (non-standard)
- `Document Retrieval` uses `retrieval_ground_truth` + `retrieved_documents`
- `Task Navigation Efficiency` uses `actions` + `expected_actions` (not query/response)
- Agent evaluations can use **conversation-array formats** (includes system messages, tool calls, tool results)
- **Exam trap**: don't assume one schema works for all evaluators — check per evaluator

### Types of evaluation data

| Type | When to use | Caution |
|------|------------|---------|
| **Real-world data** | Best — reflects actual user interactions | Handle with privacy/compliance care |
| **Synthetic data** | When production data is scarce or sensitive | Supplement; don't replace real-world data |
| **Adversarial data** | Stress-testing, jailbreaks, prompt injection, safety | Use AI Red Teaming Agent for scale |

---

## Unit 4 — Choose and Utilize Metrics

### Built-in evaluator families (full catalog)

#### Quality — General Purpose
| Evaluator | Measures | Scale | Judge model needed? |
|-----------|---------|-------|-------------------|
| **Coherence** | Logical flow and readability | 1–5 | Yes |
| **Fluency** | Grammar, syntax, vocabulary | 1–5 | Yes |

#### Quality — Textual Similarity
| Evaluator | Measures | Notes |
|-----------|---------|-------|
| **Similarity** | Semantic similarity vs ground truth | AI-assisted; paraphrases score well |
| **F1** | Token overlap (precision + recall) | Requires ground truth; algorithmic |
| **BLEU** | N-gram overlap | Algorithmic; used for translation/summarization |
| **GLEU** | Variant of BLEU | Algorithmic |
| **ROUGE** | Returns multiple values: precision, recall, F1 | Algorithmic; not a single score |
| **METEOR** | Incorporates synonyms and stemming | Algorithmic |

#### Quality — RAG
| Evaluator | Measures | Needs | Notes |
|-----------|---------|-------|-------|
| **Retrieval** | Relevance of retrieved context | query, context | No ground truth needed |
| **Document Retrieval** | Search quality (human-labeled) | retrieval_ground_truth, retrieved_documents | Returns multiple: Fidelity, NDCG, XDCG, Max Relevance, Holes |
| **Groundedness** | Response faithful to context | query, response, context (all 3 recommended) | AI-assisted |
| **Groundedness Pro** | Response faithful to context | context, response | Uses Azure AI Content Safety — NO judge model needed; returns binary pass/fail |
| **Relevance** | Response addresses user's question | query, response, context | AI-assisted |
| **Response Completeness** | Ground truth info present in response | ground_truth, response | Preview |

#### Safety — Risk and Safety
| Evaluator | What it detects | Scale | Judge model? |
|-----------|----------------|-------|-------------|
| Hate and Unfairness | Hateful/discriminatory content | 0–7 severity | No (Microsoft hosted) |
| Sexual | Sexual content | 0–7 severity | No |
| Violence | Violent content | 0–7 severity | No |
| Self-Harm | Self-harm content | 0–7 severity | No |
| Protected Materials | Copyright/protected content | Pass/fail | No |
| Indirect Attack (XPIA) | Prompt injection in retrieved context | Pass/fail | No (model target only) |
| Code Vulnerability | Security vulnerabilities in code | Pass/fail | No |
| Ungrounded Attributes | Fabricated personal attributes | Pass/fail | No |

**Core harm evaluators severity scale:**
- Very Low: 0–1 | Low: 2–3 | Medium: 4–5 | High: 6–7
- **Default pass threshold**: 3 (severity ≤ 3 = pass)

#### Agent Evaluators
| Evaluator | Measures | Notes |
|-----------|---------|-------|
| Task Adherence | Does agent follow instructions? | Preview |
| Task Completion | Does agent complete the task? | Preview |
| Intent Resolution | Does agent resolve the user intent? | 1–5 score; Preview |
| Task Navigation Efficiency | Efficiency of action path | Uses actions + expected_actions; returns precision/recall/F1 |
| Tool Call Accuracy | Correct tool calls made? | 1–5 score |
| Tool Selection | Right tool chosen? | Pass/fail |
| Tool Input Accuracy | Correct parameters provided? | Pass/fail |
| Tool Output Utilization | Does agent use tool output well? | Pass/fail |
| Tool Call Success | Tool call succeeded? | Pass/fail |

---

## Evaluator Combinations by Scenario

| Scenario | Recommended evaluators |
|----------|----------------------|
| General chat / Q&A | Coherence, Fluency + core safety evaluators |
| Ground-truth tasks | + Similarity or textual similarity metrics |
| RAG applications | Retrieval, Groundedness, Relevance (+ Response Completeness if ground truth available) |
| RAG + security | + Indirect Attack (model-target only) |
| Agentic systems | Quality + safety + agent evaluators (Task Adherence, Tool Call Accuracy, etc.) |
| Agent safety | + Prohibited Actions, Sensitive Data Leakage (preview, agent-target only) |

---

## Result Interpretation

### Scale by evaluator type
| Type | Scale |
|------|-------|
| Judge-based quality evaluators (Coherence, Fluency, Relevance) | 1–5 (pass threshold set per run) |
| Algorithmic similarity (F1, BLEU, GLEU, METEOR) | 0–1 float |
| ROUGE | Multiple values: precision, recall, F1 |
| Document Retrieval | Multiple: Fidelity, NDCG, XDCG, Max Relevance, Holes |
| Core safety evaluators | 0–7 severity (default pass ≤ 3) |
| Other safety evaluators | Pass/fail or Boolean detected/not-detected |
| Groundedness Pro | Binary pass/fail |
| Agent evaluators (mixed) | Some pass/fail; Intent Resolution + Tool Call Accuracy also 1–5 |

### Per-item result fields
- `label` — quick comparison across evaluators
- `score` — raw numeric value
- `threshold` — pass/fail cutoff
- `reason` — why evaluator gave that result

### Use results to guide mitigations
| Problem | Likely cause and mitigation |
|---------|-----------------------------|
| Low groundedness / relevance | Fix retrieval, context construction, or prompt instructions |
| High safety severity | Tighten system instructions; add/revise content filters; rerun |
| Poor similarity / response completeness | Missing info, weak task instructions, unreliable ground truth |
| Poor tool accuracy / task completion | Better tool descriptions, clearer instructions, different orchestration |

---

## Testable Facts Summary (LP2 Module 2)

| Fact | Value |
|------|-------|
| Evaluators needing a judge model | Quality and most Agent evaluators |
| Evaluators NOT needing a judge model | Safety evaluators + Groundedness Pro |
| Core harm severity scale | 0–7 (Very Low 0-1, Low 2-3, Medium 4-5, High 6-7) |
| Default safety pass threshold | Severity ≤ 3 |
| ROUGE output | Multiple values (precision, recall, F1) — not a single score |
| Document Retrieval output | Multiple: Fidelity, NDCG, XDCG, Max Relevance, Holes |
| Groundedness Pro output | Binary pass/fail |
| Indirect Attack (XPIA) — target type | Model targets only (not agent targets) |
| Adversarial testing at scale | AI Red Teaming Agent |
| Task Navigation Efficiency fields | `actions` + `expected_actions` |
| Dataset file formats accepted | CSV or JSONL |
| Real-world data risk | Privacy and compliance — handle appropriately |
