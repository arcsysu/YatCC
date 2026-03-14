# Task1 Prompt Example

请根据序言中 [AI 工具配置与使用方法](../introduction/prompt.md)
部分的教程来使用或优化如下 Meta-Prompt（元提示词，用来让 AI 生成 Prompt，从而免去自己编写、优化 Prompt 的过程）示例。

````markdown
# Task1 Meta-Prompt：词法分析器 Prompt 生成器

> **用途**：将以下内容整体输入给大模型，让它为你生成一份可直接使用的、针对 Task1（SYsU 词法分析）的实现 Prompt。
> 你可以在 `[用户配置区]` 中填入自己的偏好，然后把整个文档喂给 LLM。

---

## 角色设定

你是一位**编译原理课程助教级 Prompt 工程师**。你的任务是：根据下方提供的 Task1 完整技术规格，**生成一份结构清晰、信息完备的 Prompt**，使任意大模型（GPT-4/Claude/Gemini 等）读完该 Prompt 后，能够**直接、正确地实现** SYsU 语言的词法分析器。

---

## 你生成的 Prompt 必须覆盖的内容

### 1. 任务概述
- 明确说明这是一个**词法分析器**（Lexer/Tokenizer）实现任务
- 目标语言：**SYsU**（中山大学自定义的类 C 语言子集）
- 输入：经过 `clang -E` 预处理后的源代码（含 `# linenum "filename"` 预处理行指令）
- 输出：与 `clang -cc1 -dump-tokens` 格式兼容的 token 序列

### 2. 输出格式精确规格
Prompt 中必须包含输出格式的精确定义和示例。每行一个 token，格式为：

```

<token_type> '<token_text>'<\t>[StartOfLine]<\t>[LeadingSpace]<\t>Loc=<<file>:<line>:<col>>
```

**格式细节规则**（Prompt 中必须逐条列明）：
- `token_type`：小写的 token 类型名（如 `int`, `identifier`, `l_paren`, `numeric_constant`）
- `token_text`：token 的原始文本，用单引号包裹
- `[StartOfLine]`：仅当该 token 是逻辑行的第一个可见 token 时输出，前面加 `\t`
- `[LeadingSpace]`：仅当该 token 前有空白字符（且不是行首 token）时输出，前面加 `\t`
- 若 `[StartOfLine]` 和 `[LeadingSpace]` 都不存在，输出一个 `\t` 占位
- `Loc=<file:line:col>`：逻辑位置信息，file 是预处理行指令中的文件名，line/col 是逻辑行号和列号（1-based）
- 最后一个 token 必须是 `eof ''`，text 为空字符串

**示例输入**：
```

``c

# 1 "./basic/000_main.sysu.c"

int main(){
    return 3;
}
```

**示例输出**：
```

int 'int'  [StartOfLine] Loc=<./basic/000_main.sysu.c:1:1>
identifier 'main'  [LeadingSpace] Loc=<./basic/000_main.sysu.c:1:5>
l_paren '('  Loc=<./basic/000_main.sysu.c:1:9>
r_paren ')'  Loc=<./basic/000_main.sysu.c:1:10>
l_brace '{'  Loc=<./basic/000_main.sysu.c:1:11>
return 'return'  [StartOfLine] [LeadingSpace] Loc=<./basic/000_main.sysu.c:2:5>
numeric_constant '3'  [LeadingSpace] Loc=<./basic/000_main.sysu.c:2:12>
semi ';'  Loc=<./basic/000_main.sysu.c:2:13>
r_brace '}'  [StartOfLine] Loc=<./basic/000_main.sysu.c:3:1>
eof ''  Loc=<./basic/000_main.sysu.c:3:2>
```

### 3. 完整 Token 类型清单
Prompt 中必须包含**全部 token 类型**的映射表，按类别组织：

#### 3.1 关键字 → token_type（共 35 个）
| 关键字 | token_type |
|--------|-----------|
| `char` | `char` |
| `short` | `short` |
| `int` | `int` |
| `long` | `long` |
| `float` | `float` |
| `double` | `double` |
| `void` | `void` |
| `signed` | `signed` |
| `unsigned` | `unsigned` |
| `struct` | `struct` |
| `union` | `union` |
| `enum` | `enum` |
| `typedef` | `typedef` |
| `extern` | `extern` |
| `static` | `static` |
| `auto` | `auto` |
| `register` | `register` |
| `const` | `const` |
| `volatile` | `volatile` |
| `restrict` | `restrict` |
| `inline` | `inline` |
| `if` | `if` |
| `else` | `else` |
| `while` | `while` |
| `do` | `do` |
| `for` | `for` |
| `switch` | `switch` |
| `case` | `case` |
| `default` | `default` |
| `break` | `break` |
| `continue` | `continue` |
| `return` | `return` |
| `goto` | `goto` |
| `sizeof` | `sizeof` |

#### 3.2 标点符号和运算符
| 符号 | token_type |
|------|-----------|
| `(` | `l_paren` |
| `)` | `r_paren` |
| `[` | `l_square` |
| `]` | `r_square` |
| `{` | `l_brace` |
| `}` | `r_brace` |
| `+` | `plus` |
| `-` | `minus` |
| `*` | `star` |
| `/` | `slash` |
| `%` | `percent` |
| `&` | `amp` |
| `\|` | `pipe` |
| `^` | `caret` |
| `~` | `tilde` |
| `!` | `exclaim` |
| `<` | `less` |
| `>` | `greater` |
| `=` | `equal` |
| `?` | `question` |
| `:` | `colon` |
| `;` | `semi` |
| `,` | `comma` |
| `.` | `period` |
| `->` | `arrow` |
| `++` | `plusplus` |
| `--` | `minusminus` |
| `<<` | `lessless` |
| `>>` | `greatergreater` |
| `<<=` | `lesslessequal` |
| `>>=` | `greatergreaterequal` |
| `&&` | `ampamp` |
| `\|\|` | `pipepipe` |
| `==` | `equalequal` |
| `!=` | `exclaimequal` |
| `<=` | `lessequal` |
| `>=` | `greaterequal` |
| `+=` | `plusequal` |
| `-=` | `minusequal` |
| `*=` | `starequal` |
| `/=` | `slashequal` |
| `%=` | `percentequal` |
| `&=` | `ampequal` |
| `\|=` | `pipeequal` |
| `^=` | `caretequal` |
| `...` | `ellipsis` |

#### 3.3 其他 token 类型
| 类别 | token_type | 说明 |
|------|-----------|------|
| 标识符 | `identifier` | `[a-zA-Z_][a-zA-Z0-9_]*` |
| 数值常量 | `numeric_constant` | 十进制/八进制/十六进制整数及浮点数（含后缀） |
| 字符串字面量 | `string_literal` | `"..."` 含转义序列，可选 `L` 前缀 |
| 字符常量 | `char_constant` | `'...'` 含转义序列，可选 `L` 前缀 |
| 文件结束 | `eof` | text 为空字符串 |

### 4. 关键处理逻辑
Prompt 中必须说明以下容易出错的逻辑点：

#### 4.1 预处理行解析
- 形如 `# 1 "./basic/000_main.sysu.c"` 的行**不输出**为 token
- 从中提取**逻辑文件名**（引号之间的部分）和**逻辑行号**（数字部分）
- 提取的行号赋值后需 **减 1**（因为紧跟的换行会将行号 +1）
- 列号重置为 1

#### 4.2 空白字符跟踪
- 空格和制表符 `[ \t]`：不输出为 token，但需更新 `logicalColumn += 字符长度`，并标记 `leadingSpace = true`
- 换行 `\n`：不输出为 token，但需更新 `logicalLine++`，`logicalColumn = 1`，标记 `startOfLine = true`，`leadingSpace = false`

#### 4.3 注释处理
- 行注释 `// ...`：跳过，不输出
- 块注释 `/* ... */`：跳过，不输出

#### 4.4 多字符运算符优先级（最长匹配）
- `<<=` 优先于 `<<` 优先于 `<`
- `>>=` 优先于 `>>` 优先于 `>`
- `...` 优先于 `.`
- `->` 优先于 `-`
- `++` 优先于 `+`
- `--` 优先于 `-`
- 关键字识别优先于标识符（如 `int` 是关键字，不是标识符）

#### 4.5 数值常量正则
```

十进制整数：    [1-9][0-9]*  (后缀可选: u/U, l/L/ll/LL 及其组合)
八进制整数：    0[0-7]*      (后缀可选)
十六进制整数：  0[xX][0-9a-fA-F]+   (后缀可选)
十进制浮点：    [0-9]*\.[0-9]+ ([eE][+-]?[0-9]+)? [fFlL]?
               [0-9]+\.[0-9]* ([eE][+-]?[0-9]+)? [fFlL]?
               [0-9]+ [eE][+-]?[0-9]+ [fFlL]?
十六进制浮点：  0[xX][0-9a-fA-F]*\.[0-9a-fA-F]+ [pP][+-]?[0-9]+ [fFlL]?
               0[xX][0-9a-fA-F]+\.[0-9a-fA-F]* [pP][+-]?[0-9]+ [fFlL]?
               0[xX][0-9a-fA-F]+ [pP][+-]?[0-9]+ [fFlL]?
```

### 5. 评分标准
Prompt 中应包含评分标准，以便模型优化实现的优先级：
- **60%** — token 类型名 + 文本值完全正确
- **30%** — `Loc=<file:line:col>` 位置信息完全正确
- **10%** — `[StartOfLine]` / `[LeadingSpace]` 标志完全正确
- token 总数不匹配直接判零分

### 6. 实现路径选择
提供要求的实现方式（以下二选一或均可）：

#### 路径 A：ANTLR4 实现
- 需要生成的文件：
  - `SYsULexer.g4`：ANTLR4 lexer 语法文件
  - `main.cpp`：驱动程序（初始化 lexer、映射 token 名称、跟踪逻辑行列号、格式化输出）
- 技术要点：
  - `.g4` 中注释和空白使用 `-> skip` 或 `-> channel(HIDDEN)`
  - `main.cpp` 需遍历所有 token（含 HIDDEN channel），维护逻辑位置状态机
  - Token 名映射：ANTLR symbolic name（如 `"Int"`）→ clang 输出名（如 `"int"`）

#### 路径 B：Flex 实现
- 需要生成的文件：
  - `lex.l`：Flex 词法规则文件
  - `lex.hpp`：token 枚举 `Id`、全局状态 `G g`、辅助函数声明
  - `lex.cpp`：token 名映射表 `kTokenNames[]`、`come()`/`extract_preprocessed_info()`/`space()` 实现
  - `main.cpp`：驱动程序（打开文件、`while(yylex())` 循环、`print_token()` 输出）
- 技术要点：
  - Flex 规则的匹配顺序决定优先级（长模式在前）
  - `ADDCOL()` 更新列号，`COME(id)` 返回 token，`SPACE()` 处理空白
  - `<<EOF>>` 必须特殊处理，返回 `YYEOF`

---

## 你生成 Prompt 时的约束

1. **自包含**：生成的 Prompt 必须包含所有必要信息，读者无需查阅外部文档
2. **精确**：token 类型名、格式细节、正则表达式必须与上方规格**完全一致**，不可臆造
3. **结构化**：使用 Markdown 标题/表格/代码块组织，便于 LLM 解析
4. **包含示例**：至少包含 1 个完整的输入→输出示例
5. **包含边界情况提示**：提醒 LLM 注意多字符运算符优先级、预处理行解析、十六进制浮点、转义序列等易错点
6. **指定输出格式**：明确告诉 LLM 输出完整的源代码文件内容，每个文件用代码块包裹并标注文件名
7. **不含冗余**：去掉与实现无关的背景说明，直奔主题

---

## [用户配置区]（按需修改后再喂给 LLM）

```

``yaml

# 选择实现路径：antlr / flex / both

implementation: antlr

# 目标语言：cpp（C++17）

language: cpp

# 是否需要 CMakeLists.txt：true / false

need_cmake: false

# 额外约束（如有）：
# - "不使用正则表达式库"
# - "代码中需要中文注释"
# - "优先保证位置信息正确"

extra_constraints: []

# 是否需要测试用例验证输出：true / false

need_test_verification: true
```

---

## 执行指令

请根据以上所有技术规格和约束，生成一份**可直接使用的 Prompt**。该 Prompt 的目标读者是另一个大模型，读完后它应该能够生成完整、正确、可编译运行的 SYsU 词法分析器代码。

生成的 Prompt 应以 `---BEGIN PROMPT---` 开头，以 `---END PROMPT---` 结尾。
```

```
```

```
```

```
```
```
````
