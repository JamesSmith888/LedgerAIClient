1. 样式风格参考Google、telegram
2. 架构、源代码路径规范已现有为准
3. 代码需考虑后续复用性
4. 前后端代码，都需要考虑性能问题。禁止生成性能极差的代码。比如 N+1查询 等基本优化
5. AI Agent目前使用langchain TS版实现。需遵循ReAct模式。如有必要请查阅官方最新文档：https://docs.langchain.com/oss/javascript/langchain/agents