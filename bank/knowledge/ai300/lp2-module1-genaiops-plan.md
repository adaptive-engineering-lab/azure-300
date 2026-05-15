# AI-300 · LP2 · Module 1: Plan and Prepare a GenAIOps Solution
**URL**: https://learn.microsoft.com/en-us/training/modules/plan-prepare-genaiops/
**Units**: 8 | **Level**: Intermediate

---

## Unit 2 — Use Cases for GenAIOps

### Real-world GenAI application patterns

#### RAG-based chat (Contoso Chat example)
- User query → GenAI app → retrieves product/customer data → generates response
- Uses: GPT-4, Azure AI Search (product retrieval), Cosmos DB (customer data)
- Hosted in: Azure Container Apps (ACA)
- Pattern: **Retrieval-Augmented Generation (RAG)**

#### Multi-agent content generation (Contoso Creative Writer)
- Input → Research agent → Writer agent → Editor agent → final article
- Research agent: Bing Grounding Tool + Azure AI Search (semantic similarity)
- Writer agent: combines research into article
- Editor agent: refines before presenting to user
- Key concept: **multi-agent workflows** with specialized agents per task

---

## Unit 3 — Select the Right Generative AI Model

### 3-question structured approach
1. Can AI **solve** my use case?
2. How do I **select** the best model?
3. Can I **scale** for real-world workloads?

### Model catalogs for exploration
| Catalog | Characteristics |
|---------|----------------|
| Hugging Face | Vast open-source catalog |
| GitHub Marketplace | Diverse models via GitHub |
| **Microsoft Foundry** | Best for deployment, enterprise controls, data/privacy/security |

### LLM vs SLM
| | LLMs | SLMs |
|--|------|------|
| Examples | GPT-4, Mistral Large, Llama3 70B, Llama 405B, Command R+ | Phi3, Mistral OSS, Llama3 8B |
| Use when | Deep reasoning, complex content, large context | Cost + speed over complexity; edge devices |

### Model types by modality and task
| Type | Examples | Use |
|------|---------|-----|
| **Chat completion** | GPT-4, Mistral Large | Text response generation |
| **Reasoning** | DeepSeek-R1, o1 | Math, coding, science, strategy |
| **Multi-modal** | GPT-4o, Phi3-vision | Text + image understanding |
| **Image generation** | DALL·E 3, Stability AI | Generate visuals from text |
| **Embedding** | Ada, Cohere | Semantic search, RAG, recommendations |

### Open-source vs Proprietary
| | Proprietary | Open-source |
|--|------------|-------------|
| Examples | GPT-4, Mistral Large, Cohere Command R+ | Hundreds from HuggingFace, Meta, Databricks, Snowflake, Nvidia |
| Best for | Enterprise security, support, high accuracy | Flexibility, fine-tuning, local deployment, cost |

### Microsoft Foundry model catalog — enterprise guarantees
- **Data and privacy**: you control what happens with your data
- **Security and compliance**: built-in
- **Responsible AI and content safety**: evaluations and content safety built in

### Model selection criteria (4 filters)
1. **Task type**: text only, or multi-modal (audio, video)?
2. **Precision**: base model sufficient, or need fine-tuning?
3. **Openness**: need to fine-tune the model yourself?
4. **Deployment**: serverless endpoint, managed compute, or local?

### Benchmark metrics (for initial exploration)
| Metric | What it measures |
|--------|----------------|
| Accuracy | Match to ground truth (0 or 1) |
| Coherence | Smooth, natural, human-like text flow |
| Fluency | Grammatical correctness and natural vocabulary |
| GPT Similarity | Semantic similarity between ground truth and prediction |

---

## Unit 4 — GenAIOps Development Lifecycle

### MLOps vs GenAIOps comparison
| Dimension | Traditional MLOps | GenAIOps |
|-----------|------------------|---------|
| Audiences | Data scientists, ML engineers | ML engineers **and** app developers |
| Key assets | Data, models, environments, features | Language models, agents, plugins, prompts, chains, APIs |
| Quality metrics | Accuracy, loss | Coherence, relevance |
| Performance metrics | Same as DevOps (latency, cost) | Token per request, response time |
| Risk metrics | Data bias | Fabrications, toxicity, hallucinations |
| Underlying model | Trained from scratch | Pretrained; fine-tuned or augmented |

### GenAIOps Lifecycle — 3 loops + 1 management loop
```
Explore → Build → Operationalize
         ↑_____________↓
         Management loop (governance, security, compliance)
```

| Loop | Activities |
|------|-----------|
| **Explore** | Define business need / use case; design architecture, prompts, models |
| **Build** | Develop initial app; evaluate iteratively for quality and safety |
| **Operationalize** | Deploy for real-world use; deliver reliable, responsible service |
| **Management** | Governance, security, compliance — overarches all phases |

---

## Unit 5 — Tools and Frameworks for GenAIOps

### Phase: Get Started
| Tool | Purpose |
|------|---------|
| **AZD** (Azure Developer CLI) | Provision and deploy AI environments via IaC templates |
| **Chat playground** (Foundry portal) | Interactively test prompts with models before writing code |
| **AZD AI Templates** | Pre-built infra templates — quick Azure AI app deployment |

### Phase: Customize
| Tool | Purpose |
|------|---------|
| **Azure AI Search** | Retrieve relevant external data for RAG (semantic search) |
| **Microsoft Fabric (Eventhouse)** | Store and search embeddings for real-time similarity search |
| **Serverless fine-tuning** (Foundry) | Fine-tune models without managing infra |
| **Azure AI Agents** | Combine models + tools into specialized task agents |

### Phase: Experiment & Evaluate
| Tool | Purpose |
|------|---------|
| **Foundry SDK prompt templates** | Dynamically generate prompts with runtime inputs |
| **Prompty** | Tool-agnostic prompt management and experimentation |
| **Evaluators** | Built-in or custom — assess quality and safety of AI outputs |
| **Tracing** (Foundry) | Debug AI models by tracing actions and responses |
| **Microsoft Foundry Content Safety** | Detect harmful/biased outputs before reaching users |

### Phase: Deploy to Production
| Tool | Purpose |
|------|---------|
| **Prompt flow** | Build, test, and automate AI workflows; prompt engineering + evaluation |
| **LangChain** | Connect AI models with external data sources, APIs, memory |
| **Semantic Kernel** | Integrate AI with business logic; build agents that run functions |
| **GitHub Actions** | Automate deployment pipelines |
| **Azure Monitor** | Track real-time AI performance, failures, degradation |
| **Application Insights** | Analytics on usage, errors, user interactions |

### Orchestration frameworks — key distinctions
| Framework | Focus |
|-----------|-------|
| Prompt flow | Prompt engineering, evaluation, monitoring — structured AI workflows |
| LangChain | Connect AI to external data/APIs/memory — reasoning and retrieval |
| Semantic Kernel | Integrate AI with enterprise business logic; agent automation |

---

## Testable Facts Summary (LP2 Module 1)

| Fact | Value |
|------|-------|
| GenAIOps lifecycle loops | 3 primary (Explore, Build, Operationalize) + 1 management |
| Contoso Chat pattern | RAG with Azure AI Search + Cosmos DB + GPT-4 |
| Contoso Creative Writer pattern | Multi-agent (Research → Writer → Editor) |
| Embedding models (RAG use) | Ada, Cohere |
| Reasoning models (math, code) | DeepSeek-R1, o1 |
| Best model catalog for enterprise | Microsoft Foundry (data privacy, security, responsible AI) |
| SLM examples | Phi3, Mistral OSS models, Llama3 8B |
| Prompt flow vs Semantic Kernel | Prompt flow = workflow/evaluation; Semantic Kernel = enterprise agent integration |
| AZD purpose | Provision + deploy Azure AI apps via IaC templates |
| Prompty purpose | Tool-agnostic prompt management (runs in any dev environment) |
