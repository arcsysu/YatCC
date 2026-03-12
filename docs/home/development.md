# 文档开发指南

这篇文档面向维护 YatCC 文档的实验室同学与外部贡献者，说明：
1. 如何配置好编写文档所需的环境
2. 当前仓库基本结构
3. 如何使用 MkDocs 编写文档、编写文档需要遵守的规范
4. 如何在本地检查、预览并提交文档

!!! note "先跑通预览和严格构建，再开始大改"

    文档修改最稳妥的节奏是：先本地预览，再做严格构建检查，最后再提交。
    这样能尽早发现导航、链接、Markdown 语法和样式覆盖带来的问题。

## 环境配置

本站使用 Mkdocs 构建，请确保已经安装 Python 并将可执行文件添加到 PATH 环境变量。参考：
> [Python 安装](https://www.python.org/downloads/)
> [MkDocs 安装](https://www.mkdocs.org/user-guide/installation/)

安装好 Python 后，可以将 MkDocs 安装到虚拟环境下，在文档**根目录**执行：

```bash
python -m venv .venv
```

进入虚拟环境，执行

```bash
# Windows Powershell
.\.venv\Scripts\activate

# Linux/MacOS
source ./.venv/bin/activate
```

安装 MkDocs：

```bash
pip install mkdocs mkdocs-material
```


## 文档编写指南

建议了解目录结构后再开始编写文档。

### 仓库结构

当前文档站点基于 MkDocs Material，主要目录如下：

- `docs/`：站点内容根目录
- `docs/home/`：主页相关页面
- `docs/introduction/`：实验指引
- `docs/task*_doc/`：各个 Task 的文档页面
- `docs/images/`：文档中引用的图片资源
- `docs/stylesheets/`：站点样式覆盖
- `docs/javascripts/`：站点脚本增强，例如侧边栏折叠
- `docs/overrides/`：Material 模板覆盖，例如 Agent 面板
- `mkdocs.yml`：站点导航、主题、插件和静态资源总配置

### 新增或修改文档

1. 普通页面优先使用 Markdown，放在 `docs/` 下合适的位置
2. 新页面如果需要出现在导航中，必须同步更新 `mkdocs.yml` 的 `nav`
3. 图片统一放到 `docs/images/` 的对应子目录，再用相对路径引用
4. 站内链接尽量使用**相对路径**，例如 `../task3_doc/overview.md` 或 `introduction/index.md`

!!! tip "优先复用现有写法"

    当前仓库已经广泛使用了提示块、引用卡片、图片居中和统一的标题层级样式。
    新文档尽量沿用已有结构，不要单独发明一套格式。

### 常用 Markdown 组件

可以直接复用 Material 支持的写法：

```md
!!! note "提示标题"

    这里写绿色提示块内容。

!!! warning "警示标题"

    这里写红色警示块内容。

!!! tip "建议标题"

    这里写黄色建议块内容。
```

### 样式与脚本改动

如果你不是只改正文，而是要改站点行为或视觉，请优先看这些文件：

- `docs/stylesheets/extra.css`：站点主要样式覆盖
- `docs/stylesheets/fonts.css`：字体定义
- `docs/stylesheets/agent.css`：文档 Agent 面板与悬浮按钮样式
- `docs/javascripts/navigation-accordion.js`：侧边栏折叠逻辑
- `docs/overrides/partials/agent.html`：Agent 面板结构

!!! tip "样式改动尽量做成站点级规则"

    如果某个视觉需求会影响很多页面，优先在 CSS 中统一处理，而不是在 Markdown 里逐页手写额外结构。
    这样后续维护成本更低，也更不容易出现风格漂移。

### 关于页面 Agent 

当前文档站点包含一个文档 Agent 面板，用于辅助用户查询文档内容。维护时建议了解以下位置：

- 面板结构：`docs/overrides/partials/agent.html`
- 样式：`docs/stylesheets/agent.css`
- 脚本入口：`docs/javascripts/doc-agent.js`

如果只是改文案、按钮文案、占位符或提示信息，通常修改模板即可；如果涉及位置、尺寸、对齐、配色等，则需要同步调整 CSS。


## 文档编写规范

### 关于空格

1. 除产品专有名词外，中英文之间需要添加空格
2. 中文与数字之间需要增加空格
3. 中文全角标点与其它字符（包括数字、英文字符）之间不加空格

### 关于标点

1. 除英文句中环境外，中文环境统一使用全角标点，不要全半角混用
2. 正确使用专有名词，如不要把 GitHub 写成 github
3. Markdown 列表项每一项最后不加句号、分号作为分隔

### 关于 Markdown 语法

1. 块级元素（标题、段落、列表、代码块、引用区块、表格）之间前后留有空行
2. 图片引用与其它元素之间前后留有空行
3. 行内代码规范：
    1. 以下场景使用行内代码
        - 终端命令与参数
        - 代码元素（函数、变量等）
        - 文件路径与文件名
        - 配置项、环境变量与字面值，如 `PATH`、`127.0.0.1`等
        - 键盘按键，如“按下 `Ctrl`+`C` 唤出终端”
    2. 以下场景不要使用行内代码
        - 技术概念、协议、架构名称，如 TCP/IP
        - 软件、工具和项目的名称，如 ANTLR
        - 常规的英文缩写与专有名词，如 CPU
        - 用于强调。应使用加粗来达到强调的目的



## 本地预览

本地预览命令如下：

```bash
source .venv/bin/activate

# Linux/MacOS
NO_MKDOCS_2_WARNING=1 mkdocs serve -a 127.0.0.1:8000       

# Windows Powershell
$env:NO_MKDOCS_2_WARNING=1
mkdocs serve -a 127.0.0.1:8000
```

启动后在浏览器访问 `http://127.0.0.1:8000` 即可预览。

!!! note "预览时重点看这几类问题"

    导航层级是否正确、页面标题是否正常、提示块和代码块样式是否协调、图片是否溢出、移动端下是否出现明显布局问题。

## 严格检查

提交前建议至少执行一次严格构建：

```bash
source .venv/bin/activate
NO_MKDOCS_2_WARNING=1 mkdocs build --strict
```

这一步主要用于发现：

- Markdown 结构错误
- 导航配置错误
- 资源路径或链接问题
- 模板覆盖或脚本改动带来的构建异常

!!! warning "不要只看页面能打开就直接提交"

    `mkdocs serve` 能跑起来，不代表配置一定没有问题。
    严格构建通过，才说明这次修改对整站是自洽的。


## 推荐工作流

推荐按下面顺序工作：

1. 修改 Markdown、样式或配置
2. 本地运行 `mkdocs serve` 预览
3. 执行 `mkdocs build --strict` 做整站检查
4. 确认导航、链接和页面样式都正常
5. 再进行 git 提交

!!! danger "不要把误下载或未引用的大文件直接提交"

    尤其是字体、图片和其他静态资源，提交前要确认它们确实被引用、格式正确、内容不是错误页面。
    资源文件一旦进历史，后续清理成本会更高。