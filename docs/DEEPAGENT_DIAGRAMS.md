# DeepAgent 架构图解

这个文档使用 Mermaid 图表详细展示 DeepAgent 的运作方式。

---

## 1. 整体架构概览

```mermaid
graph TB
    subgraph "用户层"
        User[用户]
    end

    subgraph "DeepAgent 核心"
        Agent[DeepAgent]
        Graph[StateGraph]

        subgraph "中间件栈 Middleware Stack"
            M1[Todos Middleware]
            M2[Filesystem Middleware]
            M3[Subagents Middleware]
            M4[Summarization Middleware]
            M5[Caching Middleware]
        end

        subgraph "状态管理"
            State[State Object]
            StateFiles[state.files]
            StateTodos[state.todos]
            StateMessages[state.messages]
        end
    end

    subgraph "存储层"
        Backend[Backend]

        subgraph "Backend 类型"
            StateBackend[StateBackend<br/>内存存储]
            FilesystemBackend[FilesystemBackend<br/>磁盘存储]
            StoreBackend[StoreBackend<br/>数据库存储]
        end

        Checkpointer[Checkpointer<br/>持久化 state]
        Store[Store<br/>键值存储]
    end

    subgraph "基础设施"
        LLM[Language Model]
        Tools[Tools 工具集]
    end

    User -->|invoke| Agent
    Agent --> Graph
    Graph --> M1
    M1 --> M2
    M2 --> M3
    M3 --> M4
    M4 --> M5
    M5 --> State

    State --> StateFiles
    State --> StateTodos
    State --> StateMessages

    StateFiles --> Backend
    Backend --> StateBackend
    Backend --> FilesystemBackend
    Backend --> StoreBackend

    State --> Checkpointer
    StoreBackend --> Store

    Graph --> LLM
    Graph --> Tools

    style Agent fill:#e1f5ff
    style State fill:#fff4e1
    style Backend fill:#f0ffe1
    style Checkpointer fill:#ffe1f5
```

---

## 2. 请求处理完整流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Agent as DeepAgent
    participant Graph as StateGraph
    participant Model as LLM
    participant Backend as Backend
    participant CP as Checkpointer

    User->>Agent: invoke(messages, config)

    Note over Agent: 初始化阶段
    Agent->>Backend: 创建 Backend 实例
    Agent->>Graph: 创建 StateGraph

    alt 有 checkpointer 且有 thread_id
        Agent->>CP: 加载之前的 state
        CP-->>Agent: 返回历史 state
        Note over Agent: state 包含 files, todos, messages
    end

    Note over Agent: 执行阶段
    Agent->>Graph: 执行流程

    loop 中间件处理
        Graph->>Graph: Todos Middleware
        Note over Graph: 管理任务状态

        Graph->>Graph: Filesystem Middleware
        Note over Graph: 添加 fs 工具

        Graph->>Graph: Subagents Middleware
        Note over Graph: 添加 task 工具
    end

    Graph->>Model: 调用 LLM
    Model-->>Graph: 返回响应

    alt LLM 调用 fs 工具
        Graph->>Backend: write_file / read_file
        Backend-->>Graph: 更新 state.files
    end

    alt LLM 调用 task 工具
        Graph->>Graph: 创建子代理
        Note over Graph: 子代理有独立的 state
        Graph->>Model: 子代理调用 LLM
        Model-->>Graph: 子代理返回结果
    end

    Note over Graph: 完成阶段
    Graph-->>Agent: 返回最终 state

    alt 有 checkpointer
        Agent->>CP: 保存最终 state
        Note over CP: 持久化 files, todos, messages
    end

    Agent-->>User: 返回 result
    Note over User: result.files<br/>result.todos<br/>result.messages
```

---

## 3. 中间件栈详解

```mermaid
graph LR
    subgraph "输入"
        Input[User Message]
    end

    subgraph "中间件栈 - 按顺序执行"
        M1["1️⃣ Todos Middleware<br/>━━━━━━━━━━━<br/>📋 添加 TodoWrite 工具<br/>📋 管理任务列表<br/>📋 state.todos"]

        M2["2️⃣ Filesystem Middleware<br/>━━━━━━━━━━━<br/>📁 添加 FS 工具集<br/>📁 write_file<br/>📁 read_file<br/>📁 edit_file<br/>📁 list_files<br/>📁 state.files"]

        M3["3️⃣ Subagents Middleware<br/>━━━━━━━━━━━<br/>🤖 添加 task 工具<br/>🤖 创建子代理<br/>🤖 委托任务"]

        M4["4️⃣ Summarization<br/>━━━━━━━━━━━<br/>📝 自动摘要<br/>📝 控制上下文长度"]

        M5["5️⃣ Caching<br/>━━━━━━━━━━━<br/>💾 缓存响应<br/>💾 提升性能"]
    end

    subgraph "核心"
        Core[LLM + Tools]
    end

    subgraph "输出"
        Output[Response]
    end

    Input --> M1
    M1 --> M2
    M2 --> M3
    M3 --> M4
    M4 --> M5
    M5 --> Core
    Core --> Output

    style M1 fill:#ffe1e1
    style M2 fill:#e1f5ff
    style M3 fill:#e1ffe1
    style M4 fill:#fff4e1
    style M5 fill:#f0e1ff
```

---

## 4. Filesystem Middleware 工作流程

```mermaid
graph TB
    Start[LLM 决定创建文件]

    subgraph "工具调用"
        Tool[调用 write_file 工具]
        Params["参数:<br/>path: '/report.md'<br/>content: ['# Title', '...']"]
    end

    Tool --> Params
    Params --> Middleware[Filesystem Middleware]

    subgraph "中间件处理"
        Middleware --> GetBackend[获取 Backend 实例]
        GetBackend --> CallWrite[调用 backend.write]
    end

    CallWrite --> CheckBackend{Backend 类型?}

    subgraph "StateBackend 路径"
        SB1[StateBackend]
        SB2[写入 state.files]
        SB3["state.files['/report.md'] = {<br/>  content: ['# Title', '...'],<br/>  created_at: '...',<br/>  modified_at: '...'<br/>}"]
    end

    subgraph "FilesystemBackend 路径"
        FB1[FilesystemBackend]
        FB2[写入磁盘]
        FB3["./files/report.md<br/>(真实文件)"]
    end

    subgraph "StoreBackend 路径"
        STB1[StoreBackend]
        STB2[写入 Store]
        STB3["await store.put({<br/>  namespace: [...],<br/>  key: 'report.md',<br/>  value: {...}<br/>})"]
    end

    CheckBackend -->|StateBackend| SB1
    SB1 --> SB2 --> SB3

    CheckBackend -->|FilesystemBackend| FB1
    FB1 --> FB2 --> FB3

    CheckBackend -->|StoreBackend| STB1
    STB1 --> STB2 --> STB3

    SB3 --> UpdateState[更新 state]
    FB3 --> UpdateState
    STB3 --> UpdateState

    UpdateState --> Return[返回成功]
    Return --> Continue[继续执行]

    style SB1 fill:#e1f5ff
    style FB1 fill:#ffe1e1
    style STB1 fill:#e1ffe1
```

---

## 5. Subagent 调用流程

```mermaid
sequenceDiagram
    participant Main as 主 Agent
    participant LLM as 主 LLM
    participant SubM as Subagents Middleware
    participant Sub as 子 Agent
    participant SubLLM as 子 LLM
    participant SubTools as 子 Tools

    Note over Main: 用户请求："研究 LangGraph"

    Main->>LLM: 调用主 LLM
    LLM-->>Main: 决定使用 task 工具

    Note over LLM: 调用 task 工具<br/>subagent: "researcher"<br/>task: "研究 LangGraph 框架"

    Main->>SubM: 调用 task 工具

    Note over SubM: 查找 researcher 子代理
    SubM->>Sub: 创建子代理实例

    Note over Sub: 子代理有独立的:<br/>- state (不共享主 state)<br/>- messages (空的历史)<br/>- files (独立的文件系统)

    Sub->>SubLLM: 执行子代理任务

    loop 子代理执行
        SubLLM->>SubTools: 使用专门工具
        Note over SubTools: 例如: search_tool
        SubTools-->>SubLLM: 返回结果

        alt 子代理需要创建文件
            SubLLM->>Sub: 调用 write_file
            Note over Sub: 文件存储在子代理的 state.files
        end
    end

    SubLLM-->>Sub: 完成任务
    Sub-->>SubM: 返回结果

    Note over SubM: 提取结果:<br/>- messages (对话)<br/>- files (创建的文件)<br/>- summary (摘要)

    SubM-->>Main: 返回工具结果

    Note over Main: 将子代理的结果<br/>合并到主 state

    Main->>LLM: 继续处理
    LLM-->>Main: 生成最终响应
```

---

## 6. State 持久化流程

```mermaid
graph TB
    subgraph "运行时 State"
        State["State Object<br/>━━━━━━━━"]

        Files["files: {<br/>  '/report.md': {...},<br/>  '/data.json': {...}<br/>}"]

        Todos["todos: [<br/>  {content: '...', status: 'completed'},<br/>  {content: '...', status: 'in_progress'}<br/>]"]

        Messages["messages: [<br/>  HumanMessage(...),<br/>  AIMessage(...),<br/>  ToolMessage(...)<br/>]"]

        State --> Files
        State --> Todos
        State --> Messages
    end

    subgraph "持久化机制"
        Check{配置了<br/>Checkpointer?}

        HasThread{提供了<br/>thread_id?}
    end

    subgraph "PostgresSaver (推荐)"
        PS[PostgresSaver]

        PSDB[(PostgreSQL)]

        PSTable["checkpoints 表<br/>━━━━━━━━━<br/>thread_id: 'user-123'<br/>checkpoint: {<br/>  todos: [...],<br/>  messages: [...],<br/>  files: {<br/>    '/report.md': {...}<br/>  }<br/>}"]
    end

    subgraph "PostgresStore (备选)"
        Store[PostgresStore]

        StoreDB[(PostgreSQL)]

        StoreTable["store 表<br/>━━━━━━━━━<br/>namespace: ['files', 'user-123']<br/>key: 'report.md'<br/>value: {<br/>  content: [...],<br/>  created_at: '...'<br/>}"]
    end

    State --> Check

    Check -->|是| HasThread
    Check -->|否| Lost[❌ 数据丢失<br/>函数结束后销毁]

    HasThread -->|是| PS
    HasThread -->|否| Lost

    PS --> PSDB
    PSDB --> PSTable

    Files --> Store
    Store --> StoreDB
    StoreDB --> StoreTable

    style Lost fill:#ffe1e1
    style PS fill:#e1ffe1
    style Store fill:#e1f5ff
```

---

## 7. Serverless 环境数据流

```mermaid
sequenceDiagram
    participant User as 用户请求
    participant Lambda as Lambda 函数
    participant Agent as DeepAgent
    participant State as State Object
    participant CP as PostgresSaver
    participant DB as PostgreSQL

    Note over User: 请求 #1: 创建报告

    User->>Lambda: POST /api/agent
    activate Lambda

    Lambda->>Agent: 创建 Agent 实例
    Agent->>CP: 配置 checkpointer

    Lambda->>Agent: invoke(messages, {thread_id: 'user-123'})

    Agent->>CP: 加载 state (thread_id: 'user-123')
    CP->>DB: SELECT * WHERE thread_id = 'user-123'
    DB-->>CP: 返回空 (首次调用)
    CP-->>Agent: 返回空 state

    Agent->>State: 执行任务
    Note over State: state.files['/report.md'] = {...}

    State-->>Agent: 完成

    Agent->>CP: 保存 state
    CP->>DB: INSERT checkpoint
    Note over DB: thread_id: 'user-123'<br/>files: {'/report.md': {...}}

    Agent-->>Lambda: 返回 result
    Lambda-->>User: 返回响应

    deactivate Lambda
    Note over Lambda: ✅ Lambda 销毁<br/>但 state 已保存到数据库

    Note over User: 请求 #2: 读取报告 (1小时后)

    User->>Lambda: GET /api/agent
    activate Lambda
    Note over Lambda: 🆕 新的 Lambda 实例

    Lambda->>Agent: 创建新的 Agent 实例
    Agent->>CP: 配置 checkpointer

    Lambda->>Agent: invoke(messages, {thread_id: 'user-123'})

    Agent->>CP: 加载 state (thread_id: 'user-123')
    CP->>DB: SELECT * WHERE thread_id = 'user-123'
    DB-->>CP: 返回之前的 checkpoint
    Note over DB: files: {'/report.md': {...}}
    CP-->>Agent: 返回完整 state

    Note over Agent: ✅ state.files['/report.md'] 存在！

    Agent-->>Lambda: 返回 result (包含文件)
    Lambda-->>User: 返回响应

    deactivate Lambda
```

---

## 8. Backend 类型对比

```mermaid
graph TB
    subgraph "StateBackend (默认)"
        SB[StateBackend]
        SBMem["存储位置:<br/>state.files (内存对象)"]
        SBPers["持久化:<br/>需要配置 checkpointer"]
        SBUse["适用:<br/>✅ 开发测试<br/>✅ Serverless (with checkpointer)<br/>❌ Serverless (without checkpointer)"]

        SB --> SBMem
        SB --> SBPers
        SB --> SBUse
    end

    subgraph "FilesystemBackend"
        FB[FilesystemBackend]
        FBDisk["存储位置:<br/>磁盘文件 (./files/...)"]
        FBPers["持久化:<br/>自动 (写入磁盘)"]
        FBUse["适用:<br/>✅ 本地开发<br/>✅ 长期运行服务器<br/>❌ Vercel/Lambda"]

        FB --> FBDisk
        FB --> FBPers
        FB --> FBUse
    end

    subgraph "StoreBackend"
        STB[StoreBackend]
        STBStore["存储位置:<br/>PostgresStore (数据库)"]
        STBPers["持久化:<br/>自动 (直接写入 DB)"]
        STBUse["适用:<br/>✅ 生产环境<br/>✅ Serverless<br/>✅ 多实例共享"]

        STB --> STBStore
        STB --> STBPers
        STB --> STBUse
    end

    subgraph "CompositeBackend"
        CB[CompositeBackend]
        CBRoute["路由规则:<br/>pattern → backend"]
        CBExample["示例:<br/>*.md → StoreBackend<br/>*.tmp → StateBackend<br/>default → FilesystemBackend"]

        CB --> CBRoute
        CB --> CBExample
    end

    style SB fill:#e1f5ff
    style FB fill:#ffe1e1
    style STB fill:#e1ffe1
    style CB fill:#fff4e1
```

---

## 9. 工具调用决策树

```mermaid
graph TB
    Start[LLM 接收任务]

    Start --> Analyze{分析任务类型}

    Analyze -->|需要管理任务| TodoTool[使用 TodoWrite 工具]
    Analyze -->|需要操作文件| FSTool{文件操作类型?}
    Analyze -->|需要委托子任务| TaskTool[使用 task 工具]
    Analyze -->|需要外部数据| CustomTool[使用自定义工具]

    FSTool -->|创建/修改| Write["write_file<br/>━━━━━━━<br/>path: '/file.md'<br/>content: [...]"]
    FSTool -->|读取| Read["read_file<br/>━━━━━━━<br/>path: '/file.md'"]
    FSTool -->|编辑| Edit["edit_file<br/>━━━━━━━<br/>path: '/file.md'<br/>old_content: '...'<br/>new_content: '...'"]
    FSTool -->|列出| List["list_files<br/>━━━━━━━<br/>pattern: '*.md'"]

    TodoTool --> TodoExec["添加/更新任务列表<br/>━━━━━━━<br/>state.todos 更新"]

    TaskTool --> SubCheck{子代理类型?}
    SubCheck -->|researcher| SubResearch["创建 researcher 子代理<br/>━━━━━━━<br/>专用工具: search_tool"]
    SubCheck -->|analyst| SubAnalyst["创建 analyst 子代理<br/>━━━━━━━<br/>专用工具: data_tool"]

    Write --> Backend[Backend 处理]
    Read --> Backend
    Edit --> Backend
    List --> Backend

    Backend --> UpdateState[更新 state.files]

    SubResearch --> SubExecute[子代理执行]
    SubAnalyst --> SubExecute

    SubExecute --> MergeResults[合并结果到主 state]

    UpdateState --> Continue[继续执行]
    TodoExec --> Continue
    MergeResults --> Continue
    CustomTool --> Continue

    Continue --> Done{任务完成?}
    Done -->|否| Start
    Done -->|是| Return[返回结果]

    style TodoTool fill:#ffe1e1
    style FSTool fill:#e1f5ff
    style TaskTool fill:#e1ffe1
    style CustomTool fill:#fff4e1
```

---

## 10. 完整请求生命周期

```mermaid
stateDiagram-v2
    [*] --> 初始化

    state 初始化 {
        [*] --> 创建Agent
        创建Agent --> 配置Backend
        配置Backend --> 配置Checkpointer
        配置Checkpointer --> 加载历史State
        加载历史State --> [*]
    }

    初始化 --> 执行循环

    state 执行循环 {
        [*] --> LLM思考
        LLM思考 --> 决策

        state 决策 <<choice>>
        决策 --> 调用TodoWrite: 管理任务
        决策 --> 调用FS工具: 操作文件
        决策 --> 调用Task工具: 委托子任务
        决策 --> 调用自定义工具: 其他操作
        决策 --> 生成响应: 完成

        调用TodoWrite --> 更新Todos
        更新Todos --> LLM思考

        调用FS工具 --> 更新Files
        更新Files --> LLM思考

        调用Task工具 --> 执行子代理
        执行子代理 --> 合并结果
        合并结果 --> LLM思考

        调用自定义工具 --> 处理结果
        处理结果 --> LLM思考

        生成响应 --> [*]
    }

    执行循环 --> 持久化

    state 持久化 {
        [*] --> 检查Checkpointer
        检查Checkpointer --> 保存State: 已配置
        检查Checkpointer --> 跳过: 未配置
        保存State --> 写入数据库
        写入数据库 --> [*]
        跳过 --> [*]
    }

    持久化 --> 返回结果
    返回结果 --> [*]
```

---

## 总结

这些图表展示了 DeepAgent 的核心运作机制：

1. **分层架构**：用户 → Agent → 中间件栈 → State → Backend
2. **中间件顺序**：Todos → Filesystem → Subagents → Summarization → Caching
3. **文件存储**：根据 Backend 类型，文件可以存储在内存、磁盘或数据库
4. **子代理隔离**：每个子代理有独立的 state 和上下文
5. **持久化关键**：在 serverless 环境必须配置 checkpointer + thread_id
6. **工具决策**：LLM 智能选择合适的工具来完成任务

核心理解：
```
DeepAgent = LLM + Middleware Stack + State Management + Backend Storage
```

每个组件都有明确的职责，通过 StateGraph 协调工作。
