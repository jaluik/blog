---
id: openSourceAiResources
title: AI Agent 学习资源
sidebar_label: AI Agent 学习资源
description: AI Agent 学习指南：从基础概念、LLM 应用、RAG、工程框架到项目实践的系统学习路线。
keywords:
  - AI Agent
  - LLM
  - RAG
  - LangGraph
  - OpenAI Agents SDK
  - AutoGen
  - Hello-Agents
slug: /ai/openSourceAiResources
---

# AI Agent 学习资源

这篇文章按我自己摸出来的学习顺序整理了一组偏工程的开源资源。

## 入门

入门阶段需要循序渐进的课程, 下面的课程由浅入深, 适合零基础的同学。

### Hugging Face Agents Course

[Hugging Face Agents Course](https://github.com/huggingface/agents-course) 是我会推荐的第一门课。

它的好处是中立:不绑死某个商业平台,也不强推某个复杂框架。从"什么是 Agent"开始,一路讲到 Tool Calling、Code Agent、RAG 和 benchmark。

跟课的时候可以重点关注:

- Agent 到底是什么
- Tool Calling 是怎么发生的
- Code Agent 是哪种 pattern
- Agent 怎么和 RAG 结合
- 评测怎么做

这门课偏实操,适合先建立感性认识。

### Microsoft AI Agents for Beginners

[Microsoft AI Agents for Beginners](https://github.com/microsoft/ai-agents-for-beginners) 更像一本系统化教材。

它把 Agent 的基础概念、设计模式、多 Agent 协作、规划、工具调用都拆开来讲。和 Hugging Face 那门比,它更偏理论框架。

两者是互补关系。Hugging Face 让你"上手能跑",微软这本帮你"知道自己在跑什么"。先做一遍再回头看体系,会比纯啃理论效率高。

### Hello-Agents

[Hello-Agents](https://github.com/datawhalechina/hello-agents) 是 Datawhale 做的一套中文开源教程,主题是《从零开始构建智能体》。

它的定位介于课程和项目之间:既讲智能体定义、发展史、LLM 基础,也带你实现 ReAct、Plan-and-Solve、Reflection,再往后会碰到低代码平台、主流框架、自研 Agent 框架、记忆、RAG、上下文工程、通信协议、评估和综合案例。

如果你更习惯中文资料,或者想找一个"从概念到代码"连起来的项目,它很适合放在入门阶段跟着走。尤其值得看的不是某个 API 怎么调,而是它怎么把 Agent 的几个核心问题串起来:

- 经典范式怎么手写
- 低代码平台和代码框架各适合什么场景
- 自己实现一个 Agent 框架时要考虑哪些模块
- Memory、RAG、上下文工程怎么接进系统
- 多 Agent、MCP、A2A 这类协作和协议问题怎么理解

这类教程的价值不在"又多一个框架",而在于让你穿过框架表层,看到一个 Agent 系统从底层组件到应用案例是怎么长出来的。

## LLM 应用

Agent 不是凭空冒出来的,它本质上是 LLM 应用的一种复杂形态。

进 Agent 之前,这些概念至少要有大致印象:

- Prompt Engineering
- Embedding
- RAG
- Function Calling
- Structured Output
- Evaluation
- Observability
- Fine-tuning
- Quantization

不用每个都研究到论文级,但要知道它们各自解决什么问题、在 Agent 系统里扮演什么角色。

这里推荐 [mlabonne / LLM Course](https://github.com/mlabonne/llm-course)。它不是讲 Agent 的,但 LLM 应用这块讲得很全。

课程分三部分:

- LLM Fundamentals
- LLM Scientist
- LLM Engineer

工程导向的可以直接看 `LLM Engineer` 那部分。重点不在训模型,在于怎么把模型接进真实应用:搭 RAG、管上下文、评估输出、部署上线。

这一步偷懒的代价后面会还回来。上下文管完了又溢、工具调来调去不对、输出格式总是漂、评测没法做……这些坑大多源自 LLM 应用基础没打牢。

## LangGraph 和 OpenAI Agents SDK

概念铺完了,可以挑框架。

我自己用得比较顺手的是 LangGraph 和 OpenAI Agents SDK 这两个,理由是方向互补。

### LangGraph

[LangGraph](https://github.com/langchain-ai/langgraph) 的设计思路非常工程化,本质是把状态机、图执行、持久化和人工介入打包到一起。

适合那种需要状态流转、分支控制、任务恢复和人工干预的复杂任务。它强迫你把任务拆成图,显式管理节点、边、状态和执行过程。刚开始会觉得繁琐,但跑过几个真实项目之后,你会感激这套约束。

值得重点学:

- 有状态的 Agent
- Graph-based workflow
- Human-in-the-loop
- Agent memory
- Streaming
- Checkpoint
- 长任务恢复

研发助手、运维排障、数据分析这类应用,LangGraph 的参考价值挺高。

### OpenAI Agents SDK

[OpenAI Agents SDK TypeScript](https://github.com/openai/openai-agents-js) 是另一种思路:轻量,抽象少,上手快。

核心概念就这么几个:

- Agent
- Tool
- Handoff
- Guardrails
- Tracing
- Multi-agent workflow

比起 LangGraph 那种"大而全"的编排框架,它更适合用来理解 Agent SDK 的最小心智模型,以及快速搭原型。

Python 方向看 [OpenAI Agents SDK Python](https://github.com/openai/openai-agents-python)。

## Multi-Agent

Multi-Agent 是个绕不开的方向,但不适合作为学习主线。

多个 Agent 凑一起,问题会成倍长出来:

- 它们之间怎么通信
- 谁来拍最后一板
- 怎么避免重复劳动
- 怎么避免互相带偏
- token 成本怎么控
- 整体结果怎么评估
- 出问题了怎么调试单个 Agent 的行为

这些问题,单 Agent 都不一定解决得好,何况一群。

想看的话可以翻 [AutoGen](https://github.com/microsoft/autogen) 和 [AG2](https://github.com/ag2ai/ag2)。AutoGen 是微软早期比较有代表性的多 Agent 框架,AG2 是它后续演进的方向。

## RAG + Agent

`RAG + Agent`适合工作中的实际应用。

举些工作里实际会遇到的场景:

- 读项目文档
- 查组件库怎么用
- 分析 GitHub Issue
- 检查代码规范
- 总结 Sentry 报错
- 生成测试用例
- 分析构建失败的原因
- 查 npm 包发布规范

这些没一个是单纯问答,都得靠 Agent 把知识库、工具、流程串起来。

可以看 [Second Brain AI Assistant Course](https://github.com/decodingai-magazine/second-brain-ai-assistant-course)。项目型课程,围绕 Second Brain AI Assistant 展开,LLM、RAG、Agents、LLMOps 都涵盖到了。

它涵盖的东西比纯 API 调用多得多:知识库、检索、工具调用、任务编排、可观测性都有。做完之后,你会对"真实业务系统怎么搭"有点感觉。

## 深入研究

只是工程落地的话,前面的资料够用了。

如果想搞清楚 Agent 的研究脉络,Berkeley 的 [Large Language Model Agents MOOC](https://github.com/rrfsantos/Large-Language-Model-Agents-MOOC-Fall-2024) 可以看看。

涉及的话题更广:

- Planning
- Reasoning
- Tool Use
- Web Agent
- Code Agent
- Scientific Discovery
- Robotics
- Healthcare

我的经验是,这种偏研究型的课,带着项目里实际遇到的问题去读,会比一开始硬啃有效得多。

## 我自己走过的顺序

如果重来一遍,我大概会这么走:

1. 先读 Anthropic 的 [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents),建立判断:什么场景该用 Agent,什么场景老老实实写 workflow。
2. 跟着 [Hugging Face Agents Course](https://github.com/huggingface/agents-course) 做一遍,对 Agent、Tool Calling、RAG 和评测建立感性认识。
3. 看 [Microsoft AI Agents for Beginners](https://github.com/microsoft/ai-agents-for-beginners),补完知识地图。
4. 读 [Hello-Agents](https://github.com/datawhalechina/hello-agents),把智能体范式、框架实现、Memory、RAG、上下文工程和评估串起来。
5. 看 [mlabonne / LLM Course](https://github.com/mlabonne/llm-course) 的 `LLM Engineer` 部分,把工程基础打牢。
6. 学 [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview),重点是状态、图、节点、边、checkpoint 和 human-in-the-loop。
7. 用 [OpenAI Agents SDK TypeScript](https://openai.github.io/openai-agents-js/) 写几个贴近工作的小项目。

练手项目尽量挑工作里真用得上的,别再做天气查询那种 demo:

- 代码 Review Agent
- npm 包发布规范检查 Agent
- Vite / Webpack 配置诊断 Agent
- Sentry 错误分析 Agent
- 组件库文档问答 Agent
- GitHub Issue 自动分析 Agent

这类项目能逼你把知识检索、工具调用、流程控制、输出校验、错误处理全练一遍。练出来的能力是可迁移的。

## 资源清单

| 资源                                                                                                        | 适合阶段      | 重点                                      |
| ----------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------- |
| [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)        | 入门前        | 区分 workflow 和 agent,建立设计判断       |
| [Hugging Face Agents Course](https://github.com/huggingface/agents-course)                                  | 入门          | Agent、Tool Calling、RAG、评测            |
| [Microsoft AI Agents for Beginners](https://github.com/microsoft/ai-agents-for-beginners)                   | 入门到进阶    | Agent 基础、设计模式、多 Agent            |
| [Hello-Agents](https://github.com/datawhalechina/hello-agents)                                              | 入门到实战    | 从零构建 Agent、经典范式、Memory、评估    |
| [mlabonne / LLM Course](https://github.com/mlabonne/llm-course)                                             | 基础补齐      | LLM 应用工程、RAG、部署优化               |
| [LangGraph](https://github.com/langchain-ai/langgraph)                                                      | 工程实践      | 状态图、checkpoint、人工介入              |
| [OpenAI Agents SDK TypeScript](https://github.com/openai/openai-agents-js)                                  | 工程实践      | Agent、Tool、Handoff、Guardrails、Tracing |
| [Second Brain AI Assistant Course](https://github.com/decodingai-magazine/second-brain-ai-assistant-course) | 项目实战      | RAG + Agent + LLMOps                      |
| [Large Language Model Agents MOOC](https://github.com/rrfsantos/Large-Language-Model-Agents-MOOC-Fall-2024) | 深入研究      | Planning、Reasoning、Tool Use、Web Agent  |
| [AutoGen](https://github.com/microsoft/autogen)                                                             | 多 Agent 研究 | 多 Agent 协作思想                         |
| [AG2](https://github.com/ag2ai/ag2)                                                                         | 多 Agent 研究 | AutoGen 思路的后续演进                    |
