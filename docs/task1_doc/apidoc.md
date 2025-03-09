# API 速查

## ANTLR API 文档

ANTLR 提供了一套面向对象的 API，用于构建和使用由 ANTLR 生成的词法分析器。

ANTLR的官方文档可以点击[这里](https://github.com/antlr/antlr4/blob/master/doc/index.md)，完整的 API 文档可以在[这里](https://www.antlr.org/api/Java/index.html)找到。下面简单介绍实验涉及到的一些核心类和接口，方便同学们在编写代码时查阅。

### Lexer（词法分析器基础类）

`Lexer` 类是所有由 ANTLR 生成的词法分析器的基类。它负责将输入的字符流（CharStream）转换成一个个的词法单元（Token）。

主要方法和描述：

- `nextToken()`：从输入流中获取下一个词法单元。这是进行词法分析的主要方法。
- `reset()`：重置词法分析器的状态，通常在开始新的分析前调用。
- `skip()`：跳过当前正在考虑的字符或词法单元。

### Token（词法单元类）

`Token` 类表示由词法分析器生成的一个词法单元，其中包含了关于该词法单元的所有信息，如类型、文本和在输入文本中的位置。

主要方法和描述：

- `getType()`：获取词法单元的类型 ID，类型 ID 通常根据词法分析器的规则自动生成。
- `getText()`：获取词法单元的文本内容。
- `getLine()`：获取词法单元出现的行号。
- `getCharPositionInLine()`：获取词法单元在其所在行的位置（字符偏移量）。

### Vocabulary（词典类）

`Vocabulary` 类保存了词法分析器使用的词法符号的名称，并提供了一系列方法来访问，这对于打印调试信息或者在解析时生成更可读的输出非常有用。

主要方法：

- `getSymbolicName(int tokenType)`：根据词法单元的类型（tokenType）返回其符号名称，也即在`.g4`文件中定义的规则名。
- `getLiteralName(int tokenType)`：根据词法单元的类型返回其字面值名称（如果有的话）。
- `getDisplayName(int tokenType)`：根据词法单元的类型返回最适合显示的名称。

## flex API 文档

在使用 flex 构建词法分析器时，同学主要会与 flex 的宏定义、函数和配置选项打交道。flex 是一个为了快速生成词法分析器的工具，它不像 ANTLR 那样有一个面向对象的 API 集合，而是基于一系列的宏定义和函数来工作。

Github 上有 flex 的[完整文档](https://westes.github.io/flex/manual/)，下面简单介绍一些在使用 flex 构建词法分析器过程中，最可能用到的关键概念和组件：

### 宏定义和特殊规则

- `%{` 和 `%}`：这之间代码会被直接复制到生成的源文件中。
- `%option`：设置不同的 flex 选项，如`noyywrap`, `case-insensitive`等。
- `%union`：定义一个联合体，用于 yylval 可以返回的不同数据类型。
- `YY_DECL`：用于定义`yylex()`函数的原型，可以被重定义以适应特定的用户需求。
- `YY_BUF_SIZE`：定义了 flex 内部缓冲区的默认大小。
- `YY_USER_ACTION`：在每个匹配的规则执行动作前执行的代码。
- `%x`, `%s`：用于声明开始条件，控制匹配的上下文。

### 函数和全局变量

- `yylex()`：词法分析器的主要入口点，每次被调用返回下一个词法单元。
- `yy_scan_string(const char *str)`：使词法分析器从一个字符串而不是标准输入或文件中读取输入。
- `yy_switch_to_buffer(YY_BUFFER_STATE new_buffer)`：切换当前的输入缓冲区。
- `yy_create_buffer(FILE *file, int size)`：为给定的文件创建一个新的输入缓冲区。
- `yy_delete_buffer(YY_BUFFER_STATE b)`：删除一个输入缓冲区。
- `yyrestart(FILE *file)`：重置词法分析器的状态并从新的文件开始读取输入。
- `YY_BUFFER_STATE`：表示输入缓冲区的状态的类型。
- `yylval`：在与 yacc/bison 配合使用时，用于传递词法单元的值。
- `yytext`：包含当前匹配的文本。
- `yyleng`：当前匹配文本的长度。
- `yylineno`：跟踪当前的行号（设置`%option yylineno`以启用）。

### 规则和模式

一条规则由一个**模式**和随后的 C 代码块组成，基本结构为`模式 { ... }`。模式可以使用正则表达式来定义，模式匹配后执行后面的代码块。

一些特殊正则表达式符号的含义如下：

- `.`匹配除了换行符以外的任意单个字符。
- `*`、`+`和`?`分别表示前面的元素出现任意次、至少一次、至多一次。
- `|`用于分隔选择项，表示或的关系。
