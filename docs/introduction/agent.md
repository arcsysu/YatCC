# AI 工具使用方法

为了给同学们提供一个智能化的开发体验，我们在天河星逸超级计算机上部署了实验室 AI HUB 工具，并接入了多种前沿 AI 模型。本文将介绍使用 API-Key 的规范、Roo Code 插件的配置与使用方法，以及 Copilot 与 VSCode 的联动教程，帮助同学们更高效地利用 AI 工具完成实验任务。

## 第一部分：个人API Key使用规范

在开始介绍Roo Code的使用方法之前，我们需要强调个人API Key的使用规范。每位同学在实验中都会获得一个与学号绑定的API Key，它应该内置于你的 Roo Code 配置文件中，用于访问实验室AI HUB提供的模型服务。请务必知悉以下规范：

1. **仅限实验使用**：个人API Key仅限于本次编译器构造实验的相关任务和练习中使用。请勿将API Key用于其他个人项目、商业用途或任何与实验无关的活动。

2. **禁止共享**：请勿与他人共享你的API Key。每个API Key都是唯一的，任何滥用行为都可能导致账号被禁用，从而影响实验的公平性和资源的合理分配。

3. **限额使用**：实验室AI HUB的模型服务有一定的使用限额。当前AI Hub提供的API都是实验室购买的，并不是无限、免费的资源，所以请同学们合理规划你的API调用，避免不必要的浪费。我们建议在使用Roo Code等工具时，优先使用高效的提示词和合理的模式切换，以最大化每次API调用的价值。

4. **多种模型**：我们建议同学们根据任务需求选择合适的模型进行调用，而不是盲目追求性能最强的模型。当前可选模型的整体Coding能力类似，在使用场景上各有优势，合理选择可以更高效地完成实验任务。

5. **对话内容**：在使用Roo Code等工具时，请注意对话内容的规范性和专业性，严禁输入任何敏感、违法或不当的内容。违反规定将会导致API Key被禁用，并按照校规处理。在AI Hub的后台，我们会定期检查API调用的内容和频率，确保资源的合理使用和实验的安全性。同时，对话内容可能被调取并用于后续的教学科研分析和改进，请保持对话内容的规范和专业。

<div align="center">

![AI Hub主页](../images/llmtools/AIHub主页.png ':size=500')

</div>




## 第二部分：Roo Code 使用教程

Roo Code（原名 Roo Cline）是一款强大的 AI 编程套件，它作为你的“自主型 AI 开发团队”直接集成在 VS Code 中。与传统的自动补全工具不同，Roo Code 拥有文件系统直接访问权限、终端控制能力以及多步工作流编排能力，旨在为开发者处理从架构设计到代码实施的完整软件开发生命周期。

<div align="center">

![Roo Code插件](../images/llmtools/RooCode插件.png ':size=500')

</div>

在我们的实验中，我们已经将 Roo Code 内置于实验容器的Code server中，并连接到了实验室 AI Hub 的相关 API 接口，从而使同学们能够直接在 VS Code 中体验到 Roo Code 的强大功能，提升实验的效率和智能化水平。无论是代码补全、错误修复还是复杂任务的分解与执行，Roo Code 都能成为你得力的 AI 助手。

### 1. 安装指南

如果你使用的是 VS Code，推荐直接通过官方插件市场安装 Roo Code 插件：

#### 1.1 通过 VS Code 插件市场（推荐）
1. 打开 VS Code（或 Cursor）。
2. 进入侧边栏的 **扩展 (Extensions)** 视图（快捷键 `Ctrl+Shift+X` 或 macOS 下的 `Cmd+Shift+X`）。
3. 在搜索框中输入 `Roo Code`。
4. 找到由 **RooVeterinaryInc** / **RooCodeInc** 发布的插件，点击 **Install** 进行安装。
5. 安装完成后，如果出现提示请重新加载窗口。此时侧边栏会出现一个 Roo Code 的专属图标（🦘）。

#### 1.2 其他安装方式
* **Open VSX Registry**：适用于 VSCodium 等开源兼容编辑器。
* **本地 VSIX 安装**：可前往 Roo Code GitHub 的 Releases 页面下载最新的 `.vsix` 文件，并在扩展视图点击 `...` 菜单选择 `Install from VSIX...` 进行手动安装。

---

### 2. 初始配置 (API 与模型)

Roo Code 采用**模型不可知 (Model-agnostic)** 的设计理念，它本身不捆绑固定的 LLM，让你可以随时切换当前性能最强的模型。

我们在各位同学的实验环境中预设了连接 AI Hub 的默认配置，接入了当前世界LLM Coding榜单上前十五的模型，如Kimi-k2.5、Minimax-m2.5、Deepseek R1等，覆盖了从轻量级到旗舰级的多种选择。你可以在设置中查看当前使用的模型，并根据需要切换到其他模型。

 > **但请注意，私自将免费分配的 API Key 截取并使用到其他环境（如私人工作、其他课程等）中是违反实验规定的行为。** 每位同学的API Key与学号绑定，我们会定期检查 API Key 的使用情况，确保资源的合理分配和实验的公平性。

如果你需要修改或添加新的 API 提供商，可以按照以下步骤操作：

1. **设置 API 提供商**：点击 Roo Code 面板顶部的设置齿轮 (⚙️)。
2. **选择 Provider**：支持 OpenAI、Anthropic、OpenRouter、Gemini、AWS Bedrock、本地 LLM (如 Ollama) 以及其他兼容 OpenAI 格式的网关（如 TrueFoundry）。
3. **选择模型**：官方建议不要在 Token 上过度吝啬——Roo 的多步代理能力极度依赖高质量模型的推理逻辑。推荐使用 `claude-3-5-sonnet`（擅长代码理解与指令遵循）或 `gpt-4o`（擅长复杂生成）。

---

### 3. 核心模式 (Modes) 分工

Roo Code 使用了基于角色的工作流 (Role-specific Modes)，让模型在特定任务上保持专注，避免越界和幻觉：

* 🏗️ **Architect (架构师)** ：用于前期规划。它能帮你分析需求、设计系统架构、规划重构步骤以及拆解复杂任务。
* 💻 **Code (程序员)** ：日常核心编码模式。负责实现 Architect 规划的具体步骤，执行文件读写、跨文件批量修改等操作。
* 🔎 **Debug (调试员)** ：专职追踪报错。它会分析错误日志、自主在代码中安插输出日志进行诊断，并提出可靠的修复方案。
* 💬 **Ask (问答)** ：快速答疑与探索模式。可以用来解释现有代码、生成文档，此模式下 AI 被限制修改代码库，保障安全。
* 🛠️ **Custom (自定义)** ：你可以通过创建 `.roomodes` 配置文件，根据自身需求定义专属角色（如“文档编写专家”、“前端安全审计员”等）。

通常，同学们在编译器构造实验课上会使用到的是 Architect 模式和 Code 模式。Architect 模式帮助你进行需求分析、系统设计和任务拆解，而 Code 模式则负责具体的代码实现和修改。通过合理切换这两种模式，你可以更高效地完成实验任务，同时也能更好地利用 AI 的能力来辅助你的开发过程。

---

### 4. 基础工作流与交互

#### 4.1 上下文引用 (@ Mentions)
在聊天框输入 `@` 符号，可以将精确的上下文塞给 AI：
* `@/path/to/file`：引用特定文件夹、文件或指定行数（如 `@task/1/antlr`）。
* `@terminal`：直接提取终端的报错输出。
* `@git-changes`：将目前尚未 Commit 的所有差异代码发给 AI。
* `@open-tabs`：自动打包你当前在编辑器中打开的所有文件作为上下文。

#### 4.2 审批与自主执行 (Auto-Approve)
在默认情况下，Roo Code 执行的每一个动作（创建文件、修改代码、执行终端命令）都需要你的显式批准 (Approve)。
* 当你熟悉工具并确认模型表现稳定后，可在设置中开启 **Auto-Approve**。此时 Roo 可以像一个真实的打工人一样，连续数十分钟自主运行并解决复杂需求。
* 但我们并不推荐在除了task0以外的地方开启 Auto-Approve，因为在更复杂的任务中，AI 的错误率会显著增加，自动化可能导致：①大范围的代码破坏，如果没有备份可能导致作业白做；②在我们对于agent自主完成task1-4的测试中，我们发现ai很容易陷入死循环，从而导致大量token浪费，鉴于每个人的token配额有限，过度使用Auto-Approve可能会导致API Key过早耗尽。

#### 4.3 自动检查点与回滚 (Checkpoints)
* 每次 Roo 触发操作（修改文件、执行命令）时，系统都会自动保存一个 **检查点 (Checkpoint)** 。
* 如果 AI 的某个改动破坏了代码，你只需在对话时间线中找到之前的检查点，点击比较差异 (Diff) 并执行回滚 (Rollback)，即可安全撤销 AI 的错误操作。

---

### 5. Roo Code 高级功能与进阶使用指南

在掌握了基础的模式切换和自动审批后，Roo Code 还提供了一系列极具扩展性的高级功能。以下是关于 **存档点、MCP 协议、技能系统、斜杠命令** 的详细操作与作用解析。

#### ① 存档点系统 (Checkpoints)

**有什么作用：**
Roo Code 内置了类似 Git 的快照机制。AI 的代码修改能力很强，但有时也会产生“幻觉”改坏代码库。每次 AI 触发文件修改或执行终端命令后，系统都会在当前会话的后台自动生成一个独立的存档点。它让你有了“后悔药”，可以毫无顾虑地让 AI 进行大规模重构。

**如何操作：**
1. **对比差异 (Diff Viewer)** ：在 Roo Code 的对话历史时间线（Timeline）中，找到 AI 汇报 `Edited file` 或执行完毕的步骤气泡。点击该气泡，VS Code 会打开一个 Diff 视图，直观展示 AI 究竟修改了哪些代码。
2. **一键回滚 (Rollback)** ：如果发现 AI 改错了逻辑或破坏了功能，在当前聊天会话的历史气泡底部找到 **“Restore Checkpoint”（恢复到此存档点）** 的回退图标。点击后，项目文件的状态会瞬间倒退回该操作之前的状态。
3. **继续对话** ：回滚后，你可以直接补充提示词：“刚才的修改导致了组件报错，请换一种思路，注意保持原来的状态管理机制”，AI 会基于回滚后的代码重新尝试。

#### ② MCP 协议集成 (Model Context Protocol)

**有什么作用：**
MCP（模型上下文协议）是打破 AI 孤岛的核心。默认情况下，AI 只能“看”到你的本地代码。通过接入外部 MCP Servers，你可以赋予 Roo Code 诸如“查询本地 PostgreSQL 数据库”、“使用 Puppeteer 自动控制浏览器抓取文档”、“连接 Jira 获取需求任务”等超能力。AI 会在需要时自主调用 `use_mcp_tool` 工具。

**如何操作：**
1. **通过 Marketplace 安装（最简方式）**：点击 Roo Code 面板顶部的 **Marketplace（商店）图标** 。你可以浏览社区提供的各类 MCP 插件，选择并点击 **Install** 一键安装。
2. **全局/项目级 JSON 配置文件**：
   * **全局生效** ：点击设置图标 -> 找到 **MCP Settings**，修改 `mcp_settings.json`。配置的数据库或工具将在所有 VS Code 窗口中可用。
   * **项目级生效（推荐团队协作使用）**：在你的项目根目录下新建 `.roo/mcp.json`。你可以将项目专用的 API 测试服信息或内部私有 MCP 配置写在这里，并提交到 Git。
3. **参数配置** ：如果是手动修改 JSON，通常格式如下：
```json
   {
     "mcpServers": {
       "my-database": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
       }
     }
   }
```

配置保存后，Roo Code 会自动重启 MCP Hub 建立连接。

#### ③ 技能系统 (Skills)

**有什么作用：**
Skills 系统是用来封装“专家经验”的。相比于每次都在聊天框里教 AI “怎么手写一个符合某某规范的组件”，你可以将这些成熟的工作流、特定库的最佳实践、或是复杂的复用逻辑转化为一个个独立的“技能”。当 AI 遇到匹配的任务时，它会主动查阅并加载这些技能指导，极大降低大范围报错的概率。

**如何操作：**

1. **技能管理 UI**：在 Roo Code 最新的设置面板中，找到 **Skills Management (技能管理)** 。
2. **创建与管理**：你可以查看到**全局级别** (`~/.roo/skills/`) 和 **工作区级别** (`.roo/skills/`) 的可用技能。点击新建技能，编辑器会自动为你打开对应的 Markdown 文件（如 `SKILL.md`）。
3. **编写技能文档**：在 Markdown 文件中使用明确的语言定义技能。比如定义一个“Tailwind V4 最佳实践”技能，在里面写明不需要写配置文件的特性、最新的 `@theme` 语法等。
4. **调用**：你可以通过自然语言明确要求 AI：“请使用 Tailwind V4 技能来美化这个页面”；如果不指定，具备强推理能力的模型能在分析项目时自动寻找到合适的技能进行加载。

#### ④ 斜杠命令 (Slash Commands)

**有什么作用：**
斜杠命令提供了一种高频操作的快捷键机制。既包含了快速切换模式的系统命令，也支持自定义的宏指令，能让你省去重复打字的烦恼，将一套复杂的 Prompt 固化为一个简短的指令。

**如何操作：**

1. **系统预置命令**：在聊天输入框键入 `/` 即可触发自动补全。
* `/ask <问题>`：不改变代码，安全地询问问题。
* `/code <需求>`：切换为程序员模式立刻开始实施代码。
* `/architect <需求>`：切换为架构师模式进行规划。
* `/clear`：清空当前上下文，释放 Token（这在长对话变卡或跑偏时非常有用）。


2. **自定义工作流命令**：在项目中的 `.roo/commands/` 目录下创建 Markdown 模板。例如创建 `/plan-feature.md`，在内容中写明：“1. 分析需求；2. 整理涉及到的数据表结构；3. 输出一个 markdown 格式的实施路径...”。
3. **使用**：以后只需要输入 `/plan-feature 新增支付接口`，Roo Code 就会无缝加载完整的指令模板去执行。

---

### 6. 高效使用建议

1. **规划先行**：不要直接让 Code 模式处理一个庞大的需求。先用 Architect 模式进行拆解，输出 Markdown 格式的计划书，再切换到 Code 模式逐步实现。
2. **利用记忆库 (Memory Bank)** ：对于长周期项目，可以在根目录建立项目专属规范文件（如 `activeContext.md`），确保 Roo Code 每次启动时都能继承项目的架构决策与编码标准。
3. **限制非必要范围**：给出明确的反向提示，比如“在实现这个 API 接口时，不要修改现有的数据库表结构代码”，以此防止模型过度发挥。
4. 如有其他问题，可以查阅 Roo Code 的[官方文档](https://docs.roocode.com/)或询问助教。







## 第三部分：Copilot + VSCode 联动教程

最后，如果有部分同学希望在本地环境使用 Copilot 来辅助完成实验任务，我们也提供了一个简单的教程，帮助你将 Copilot 与 VSCode 无缝集成。

### 1. 准备工作

- 一部电脑+一部手机，登录同一个 github 账号（还没有的话，先用 sysu 邮箱注册一个）
- 准备好教育邮箱，即 `xxx@mail2.sysu.edu.cn`
- 使用受支持的浏览器，如 chrome、edge 等
- 尽量使用真名注册 github 账号，以免后续申请 education 时被拒绝
- 个性化设置头像、简介等，如果有空就创建一个 profile 界面的 README，以增加申请成功的概率
- 一个方便启停的 vpn，如果使用奇奇怪怪的梯子，被拦的概率会增加
- 尽量自己本人就在学校，如果不在就要改 gps 定位到学校

### 2. Github Education 申请过程

#### (1) 添加教育邮箱（如果不是使用 edu 注册的）

- 在电脑浏览器打开 github，点击右上角头像，选择`Settings`
<div align="center">

![主页](../images/llmtools/1.%20gh主页.png ':size=500')

</div>

<div align="center">

![工具栏](../images/llmtools/2.%20工具栏.png ':size=500')

</div>

- 选择`Emails`，点击`Add email address`
<div align="center">

![邮箱](../images/llmtools/3.%20设置-邮箱.png ':size=500')

</div>

- 验证邮箱，点击`Send verification email`
- 完成验证后，点击`Primary`，设置为主邮箱
<div align="center">

![验证](../images/llmtools/4.%20邮箱认证.png ':size=500')

</div>

#### (2) 增加成功率的一些准备

- 在 github 上创建一个 profile 界面的 README，并把个人资料弄得更像真人，可以参考[这里](https://github.com/ouyangyipeng)
- 如果没有建过仓库，在 github 上创建一个仓库，可以提交以前你任意的代码，或者直接 fork 一个项目
- 在 github 上 star 一些项目，follow 一些人
- 完善账单信息，点击右上角头像，选择`Settings`，选择`Billing & plans`，填写账单信息，需要和后续提交的个人信息一致，特别是姓名和学校名字&地址
<div align="center">

![账单](../images/llmtools/7.%20添加账单信息.png ':size=500')

</div>

- 添加 passkey
<div align="center">

![passkey](../images/llmtools/5.%20添加passkey.png ':size=500')

</div>

- 启用 2fa，点击右上角头像，选择`Settings`，选择`Security`，启用 2fa。这里推荐在手机上装一个`Authenticator`和一个 github mobile，然后按指示操作
<div align="center">

![2fa](../images/llmtools/6.%20添加2fa.png ':size=500')

</div>
- 个人资料页的"位置"设置为学校所在地，可以在`Settings`的`Profile`中设置

#### (3) 开始申请

- 如果以前没有进行过申请，这时在主页应该会弹出一个“加入 github 教育！”的界面，点击`加入github教育！`
- 如果没有的话，打开[github education](https://education.github.com/discount_requests/application)
<div align="center">

![申请界面](../images/llmtools/8.%20申请界面.png ':size=500')

</div>

- **注意：从这里开始，确保已经关闭了 vpn 进行操作，可以用校园网**
- role 选择`Student`，对照下面的"you must:"和上述增加成功率的方法来做好准备
<div align="center">

![准备](../images/llmtools/9.%20准备.png ':size=500')

</div>

- 在 application 部分，一般来说如果已验证 sysu 邮箱，会自动填写学校名，如果没有，手动填写`Sun Yat-sen University`
- 保证这时浏览器的定位在学校范围内，并且与刚才账单信息填写的地址一致，点击 Continue 验证位置，进入 Upload proof 界面说明通过了
<div align="center">

![申请界面2](../images/llmtools/8.%20申请界面2.png ':size=500')

</div>

- **注意：从这里开始可以重新打开 vpn**
- 按 r 如下模板进行制作"学生证"，可以在电脑上填好打印，记得删除模板中的注释。

  ```text
  Ministry of Education Student Status Online Verification
  Name: Xiao Ming, // 姓名，与 GitHub 上支付信息名称一致
  Institution: Sun Yat-sen University, // 大学名称，必须是GitHub 上显示的英文名
  Level: Undergraduate,
  Class: 23 CS Class 5, // 班级，随便写
  Major: CS, // 专业，随便填
  Student ID: 1145141919810, // 学生证号，随便写
  Duration: 4 years,
  Type: Regular Higher Education,
  Mode: Full-time,
  Student Status: Registered (Expected Graduation Date: July 31,2028)// 毕业时间，随便写，但不要过于离谱
  // 写完后把注释删掉
  ```

- 用手机拍照上传（这里是因为电脑会直接显示虚拟摄像头失效），也可以直接用手机进入同一个申请界面直接拍照上传

#### (4) 后续

- 重新打开界面，会有一个绿色的`Your request has been submitted`，表示申请成功
- 一般来说，申请提交后会在 1-2 天内收到邮件（在界面上红色就是被驳回，紫色是申请通过），如果被拒绝，会有一个拒绝的理由，根据理由进行修改再次提交
<div align="center">

![已通过邮件](../images/llmtools/11.%20已通过邮件.png ':size=500')

</div>

<div align="center">

![被拒绝邮件](../images/llmtools/10.%20驳回邮件.png ':size=500')

</div>

### 3. VSCode 中激活 Copilot

#### (1) 激活 copilot

- 打开[激活网址](https://github.com/github-copilot/free_signup)，如果上面 education 通过了的话，直接有一个绿色按钮 point-and-click 就能用
- 打开设置里面的 Copilot 部分，看到 GitHub Copilot Pro is active for your account，表示激活成功
- 这时在[copilot 界面](https://github.com/copilot)处应该已经可以直接使用了

#### (2) VSCode 部分

- 安装 vscode，打开 vscode，点击搜索栏右侧的 copilot 图标可以按照指示完成
- 或者直接在 vscode 的扩展商店搜索`copilot`，安装即可
<div align="center">

![安装](../images/llmtools/12.%20vsc插件.png ':size=500')

</div>

- 然后 copilot 会提示你登录，按照指示进行操作，会自动打开浏览器登录
<div align="center">

![登录](../images/llmtools/13.%20vsc登录.png ':size=500')

</div>
