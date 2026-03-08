# 文档开发指南

这篇文档面向维护 YatCC 文档的实验室同学与开源贡献者，说明如何使用 MkDocs 编写、检查、预览和提交文档，以及当前仓库里与文档 Agent 相关的基本结构。

!!! note "先跑通预览和严格构建，再开始大改"

    文档修改最稳妥的节奏是：先本地预览，再做严格构建检查，最后再提交。
    这样能尽早发现导航、链接、Markdown 语法和样式覆盖带来的问题。

## 仓库结构

当前文档站点基于 MkDocs Material，主要目录如下：

- `docs/`：站点内容根目录。
- `docs/home/`：主页相关页面。
- `docs/introduction/`：实验指引。
- `docs/task*_doc/`：各个 Task 的文档页面。
- `docs/images/`：文档中引用的图片资源。
- `docs/stylesheets/`：站点样式覆盖。
- `docs/javascripts/`：站点脚本增强，例如侧边栏折叠。
- `docs/overrides/`：Material 模板覆盖，例如 Agent 面板。
- `mkdocs.yml`：站点导航、主题、插件和静态资源总配置。

## 新增或修改文档

编写文档时，建议遵循下面的基本约定：

1. 普通页面优先使用 Markdown，放在 `docs/` 下合适的位置。
2. 新页面如果需要出现在导航中，必须同步更新 `mkdocs.yml` 的 `nav`。
3. 图片统一放到 `docs/images/` 的对应子目录，再用相对路径引用。
4. 站内链接尽量使用相对路径，例如 `../task3_doc/overview.md` 或 `introduction/index.md`。

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

代码块直接使用三反引号并标注语言：

````md
```bash
source .venv/bin/activate
mkdocs build --strict
```
````

## 本地预览

仓库已经验证过的本地预览命令如下：

```bash
source .venv/bin/activate
NO_MKDOCS_2_WARNING=1 mkdocs serve -a 127.0.0.1:8000
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

## 样式与脚本改动

如果你不是只改正文，而是要改站点行为或视觉，请优先看这些文件：

- `docs/stylesheets/extra.css`：站点主要样式覆盖。
- `docs/stylesheets/fonts.css`：字体定义。
- `docs/stylesheets/agent.css`：文档 Agent 面板与悬浮按钮样式。
- `docs/javascripts/navigation-accordion.js`：侧边栏折叠逻辑。
- `docs/overrides/partials/agent.html`：Agent 面板结构。

!!! tip "样式改动尽量做成站点级规则"

    如果某个视觉需求会影响很多页面，优先在 CSS 中统一处理，而不是在 Markdown 里逐页手写额外结构。
    这样后续维护成本更低，也更不容易出现风格漂移。

## Agent 相关说明

当前文档站点包含一个文档 Agent 面板，用于辅助用户查询文档内容。维护时建议了解以下位置：

- 面板结构：`docs/overrides/partials/agent.html`
- 样式：`docs/stylesheets/agent.css`
- 脚本入口：`docs/javascripts/doc-agent.js`

如果只是改文案、按钮文案、占位符或提示信息，通常修改模板即可；如果涉及位置、尺寸、对齐、配色，则需要同步调整 CSS。

## 推荐工作流

推荐按下面顺序工作：

1. 修改 Markdown、样式或配置。
2. 本地运行 `mkdocs serve` 预览。
3. 执行 `mkdocs build --strict` 做整站检查。
4. 确认导航、链接和页面样式都正常。
5. 再进行 git 提交。

!!! danger "不要把误下载或未引用的大文件直接提交"

    尤其是字体、图片和其他静态资源，提交前要确认它们确实被引用、格式正确、内容不是错误页面。
    资源文件一旦进历史，后续清理成本会更高。