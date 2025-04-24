# 使用 ANTLR 完成 Task1

## 任务介绍

在本次实验中，同学们需要完成以下任务：

- 补充词法规则：首先在`SYsULexer.g4`中编写词法分析规则，然后给`main.cpp`中的`tokenTypeMapping`添加对应的映射。

- 更新状态信息：除了正确识别并输出每个词法单元的类型外，还需要输出每个词法单元出现在源文件中的位置和源文件路径（初始信息可以从以`#`开头的预处理信息中获得）。由于调用`fill()`是一次性处理并生成所有的`Token`，所以我们需要在循环调用`print_token()`时，根据当前拿到的`Token`，不断更新状态信息（例如行号、文件路径等）。你可能需要自己在`main.cpp`中定义一些全局变量来保存这些状态信息。

- 输出结果：根据**当前的**状态信息，组装结果并输出到指定文件中。

## ANTLR 简介

**ANTLR**（ANother Tool for Language Recognition）是一个强大的开源生成工具，支持生成词法分析器、解析器以及树解析器。在接下来的 task2 中，我们也会用到它。

本实验中，我们提供了一个基于 ANTLR 的残缺词法分析器，其代码框架如下：

```text
-- antlr/
    ├── CMakeLists.txt
    ├── README.md
    ├── SYsULexer.g4
    └── main.cpp
```

同学们需要在此基础上完善代码，最终得到一个可以输出正确结果的词法分析器。接下来我们将详细介绍各个源代码文件以及其中关键代码的含义，方便同学们快速上手。建议先大致浏览一遍 [ANTLR API 文档](task1_doc/apidoc?id=antlr-api-文档) 的内容，再继续阅读本文档。

## 词法分析部分

### SYsULerxer.g4

`SYsULexer.g4`是词法分析器的核心文件，其中定义了词法分析器的规则。

ANTLR 会根据`.g4`文件生成`SYsULexer.cpp`和`SYsULexer.h`两个文件，其中定义了继承自`antlr4::Lexer`的`SYsULexer`类，供主程序使用。`SYsULexer`类的定义是根据我们编写的词法规则生成的，调用这个类的方法，就可以根据规则识别出各类词法单元了。在成功构建一次 task1 之后，你可以在`/YatCC/build/antlr4_generated_src/task1-antlr/`下看到 ANTLR 的产物。

---

`SYsULexer.g4`首行以`lexer grammer`开头，表示正在定义一个词法分析器。后面跟词法分析器的名字，这也将是生成的类的名字。

```antlr4
lexer grammar SYsULexer;
```

接下来就可以编写一系列规则了。规则的基本格式是`词法规则名 : 模式;`，其中词法规则名的**首字母必须大写**。对于关键字，数学运算符以及各种括号而言，规则编写起来非常简单：

```antlr4
Auto : 'auto';
LeftParen : '(';
Less : '<';
LessEqual : '<=';
```

对于编程语言中更加复杂的组成单元，例如标志符，数字，字符串等，模式就需要使用正则表达式进行表达。可以先定义一些`fragment`，相当于定义一些正则表达式并取一个别名，例如：

```antlr4
fragment
IdentifierNondigit
    :   Nondigit
    ;

fragment
Nondigit
    :   [a-zA-Z_]
    ;

fragment
Digit
    :   [0-9]
    ;
```

然后就可以使用这些`fragment`来编写更复杂的规则了，例如：

```antlr4
Identifier
    :   IdentifierNondigit
        (   IdentifierNondigit
        |   Digit
        )*
    ;
```

---

同学们可能会注意到，有些规则后加上了`-> skip`，这表示匹配到这些规则后不会生成 token 而直接跳过：

```antlr4
Newline
    :   (   '\r' '\n'?
        |   '\n'
        )
        -> skip
    ;
```

你可以**自行决定**是否要生成这些规则对应的 token，以供后续使用。

## 主程序部分

主程序部分只有`main.cpp`一个文件。`main.cpp`利用生成的`SYsULexer`类来处理输入，最终将词法分析结果输出到指定文件。

---

`main.cpp`中的 `main` 函数有三个输入参数：

- 程序名称`argv[0]`
- 输入文件路径`argv[1]`
- 输出文件路径`argv[2]`

`inFile`是一个`std::ifstream`类型的对象，用于从指定文件读取输入。在`main.cpp`中，`inFile`利用`argv[1]`进行初始化，从而使词法分析器从指定文件读取输入。

`outFile`是一个`std::ofstream`类型的对象，用于向指定文件写入输出。在`main.cpp`中，`outFile`利用`argv[2]`进行初始化，从而将词法分析结果输出到指定文件。

---

首先，我们用`inFile`初始化一个 ANTLR 输入流对象`input`。然后实例化一个`SYsULexer`类对象`lexer`，并将输入流对象`input`传入。接着，我们用`lexer`初始化一个 token 流对象`tokens`。`fill()`方法会调用`lexer`，逐个读取输入的字符流并生成 token，最后存储到`tokens`内部的列表中，直到处理完`<EOF>`。

```cpp
antlr4::ANTLRInputStream input(inFile);
SYsULexer lexer(&input);

antlr4::CommonTokenStream tokens(&lexer);
tokens.fill();
```

之后，就可以利用`getTokens()`方法，拿到一个`vector<Token*>`。最后用`for`循环遍历每个`Token`，并调用`print_token()`函数输出结果到指定文件中。

```cpp
for (auto&& token : tokens.getTokens()) {
  print_token(token, tokens, outFile, lexer);
}
```

---

ANTLR 会给我们在`SYsULexer.g4`定义的每条规则，生成一个特定的类型 ID，可以通过`Token::getType()`来获取。

同时，`SYsULexer`类中还有一个`Vocabulary`类对象`vocabulary`，用于保存类型 ID 与我们取的“规则名”之间的映射关系。

通过下面这段代码，就可以由一个`Token`对象，获取其对应的规则名了：

```cpp
auto& vocabulary = lexer.getVocabulary();

auto tokenTypeName = std::string(vocabulary.getSymbolicName(token->getType()));
```

但是这个“规则名”并不是我们要在最终文件中输出的字符串，所以`main.cpp`中含定义了一个哈希表`tokenTypeMapping`来保存每个在`SYsULexer.g4`中定义的“规则名”对应的输出字符串。

```cpp
if (tokenTypeName.empty())
  tokenTypeName = "<UNKNOWN>"; // 处理可能的空字符串情况

if (tokenTypeMapping.find(tokenTypeName) != tokenTypeMapping.end()) {
  tokenTypeName = tokenTypeMapping[tokenTypeName];
}
```
