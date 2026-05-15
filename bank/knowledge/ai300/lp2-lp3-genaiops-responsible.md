# AI-300 · Learning Path 2: Operationalize Generative AI Applications (GenAIOps)
**URL**: https://learn.microsoft.com/en-us/training/paths/operationalize-gen-ai-apps/  
**Modules**: 2 | **Level**: Intermediate

---

## Modules

### Module 1 — Plan and Prepare a GenAIOps Solution
- Identify use cases for generative AI applications
- Select the right generative AI model from the model catalog
- Understand the development lifecycle of a language model application
- Explore tools and frameworks to implement GenAIOps (Prompt Flow, Azure AI SDK)
- Lab: Compare language models from the model catalog

### Module 2 — Evaluating Generative AI Applications
- Understand evaluation metrics: groundedness, relevance, coherence, fluency
- Create test datasets and data mapping for model evaluation
- Run automated evaluation workflows in Foundry
- Interpret evaluation results and improve prompt quality

---

## Domain 3 Coverage — Design and Implement GenAIOps Infrastructure (20–25%)

### Implement Foundry environments and platform configuration
- Create and configure Foundry resources and project environments
- Configure identity and access management (managed identities, RBAC)
- Implement network security and private networking configurations
- Deploy infrastructure using Bicep templates and Azure CLI

### Deploy and manage foundation models for production workloads
- Deploy foundation models using serverless API endpoints and managed compute
- Select appropriate models for specific use cases
- Implement model versioning and production deployment strategies
- Configure provisioned throughput units for high-volume workloads

### Implement prompt versioning and management with source control
- Design and develop prompts
- Create prompt variants and compare performance
- Implement version control for prompts using Git repositories

---

## Domain 4 Coverage — GenAI Quality Assurance and Observability (10–15%)

### Configure evaluation and validation for GenAI apps and agents
- Create test datasets and data mapping for comprehensive model evaluation
- Implement AI quality metrics: groundedness, relevance, coherence, fluency
- Configure risk and safety evaluations for harmful content detection
- Set up automated evaluation workflows using built-in and custom metrics

### Implement observability for GenAI apps and agents
- Examine continuous monitoring in Foundry
- Monitor performance metrics: latency, throughput, response times
- Track and optimize cost metrics: token consumption, resource usage
- Configure detailed logging, tracing, and debugging for production troubleshooting

---

## Domain 5 Coverage — Optimize GenAI Systems and Model Performance (10–15%)

### Optimize RAG (Retrieval-Augmented Generation) performance and accuracy
- Optimize retrieval by tuning similarity thresholds, chunk sizes, retrieval strategies
- Select and fine-tune embedding models for domain-specific use cases
- Implement and optimize hybrid search (semantic + keyword-based)
- Evaluate and improve RAG performance using relevance metrics and A/B testing

### Implement advanced fine-tuning and model customization
- Design and implement advanced fine-tuning methods
- Create and manage synthetic data for fine-tuning
- Monitor and optimize fine-tuned model performance
- Manage fine-tuned model from development through production deployment

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| GenAIOps | DevOps/MLOps principles applied to generative AI applications |
| Microsoft Foundry | Azure platform for building, deploying, and managing GenAI apps |
| Prompt Flow | Tool in Foundry for building, testing, and deploying LLM workflows |
| Model catalog | Library of foundation models (OpenAI, Meta, Mistral, etc.) in Foundry |
| Serverless endpoint | Pay-per-token API deployment for foundation models (no infra management) |
| Managed compute | Dedicated compute for model deployment (PTU or GPU instances) |
| Provisioned throughput (PTU) | Reserved capacity for consistent, high-volume model inference |
| Groundedness | Metric: does the answer use only information from the provided context? |
| Relevance | Metric: how well does the answer address the user's question? |
| Coherence | Metric: is the answer logically structured and readable? |
| Fluency | Metric: is the answer grammatically correct and natural-sounding? |
| RAG | Retrieval-Augmented Generation — augments LLM with external knowledge sources |
| Hybrid search | Combination of semantic (vector) search and keyword (BM25) search |
| Fine-tuning | Further training a foundation model on domain-specific data |
| Data drift (GenAI) | Shifts in input distribution that degrade generative model performance |

---

# AI-300 · Learning Path 3: Operationalize AI Responsibly with Azure AI Foundry
**URL**: https://learn.microsoft.com/en-us/training/paths/operationalize-ai-responsibly/  
**Modules**: 3 | **Level**: Beginner

---

## Modules

### Module 1 — Implement Generative AI Guardrails in Azure AI Foundry
- Choose and configure generative AI guardrails in Azure AI Foundry
- Understand content filtering categories (hate, violence, sexual, self-harm)
- Configure severity thresholds for content filters
- Test guardrail configurations against sample prompts

### Module 2 — Implement Generative AI Guardrails with Azure AI Content Safety
- Use Azure AI Content Safety service programmatically
- Implement prompt shields to detect jailbreak attempts
- Detect and block protected material (copyright, code)
- Set up real-time content moderation in deployed apps

### Module 3 — Measure and Mitigate Risks for a GenAI App in Azure AI Foundry (Guided Project)
- Run red team style evaluations to surface risks
- Use built-in risk and safety evaluation metrics in Foundry
- Interpret safety scores and adjust guardrail settings
- Implement mitigations: system messages, grounding, content filters

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| Guardrails | Configuration layer that filters or blocks harmful model inputs/outputs |
| Content filtering | Foundry feature that scores content on hate, violence, sexual, self-harm |
| Prompt shield | Detection layer that identifies jailbreak and indirect prompt injection attacks |
| Red teaming | Adversarial testing of AI systems to surface safety and reliability failures |
| Responsible AI | Microsoft framework: fairness, reliability, privacy, security, inclusiveness, transparency, accountability |
| System message | Instruction given to an LLM at inference time to constrain behavior and persona |
| Grounding | Anchoring model responses to provided context to reduce hallucination |
