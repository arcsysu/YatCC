## flex 简介

**flex**（fast lexical analyzer generator），是一个词法分析器的生成工具。在理论课上同学们应该已经了解到，有工具能够根据正则表达式形式的词法规范自动生成词法分析器。flex 就是这样一个工具。

本实验中，我们提供了一个基于 flex 的残缺词法分析器，其代码框架如下：

```text
-- flex/
    ├── CMakeLists.txt
    ├── README.md
    ├── lex.cpp
    ├── lex.hpp
    ├── lex.l
    └── main.cpp
```

同学们需要在此基础上完善代码，最终得到一个可以输出正确结果的词法分析器。接下来我们将详细介绍各个源代码文件以及其中关键代码的含义，方便同学们快速上手。建议先大致浏览一遍 [flex API 文档](task1_doc/apidoc.md?id=flex-api-文档) 的内容，再继续阅读本文档。

## 词法分析部分

代码框架中与词法分析相关的文件有三个：`lex.cpp`、`lex.hpp`和`lex.l`。

---

`lex.l`是词法分析器的核心文件，也是同学们主要需要完善的部分。这个文件中，定义了词法分析器的规则。

flex 会根据`.l`文件生成一个 C 源文件，通常是`lex.yy.c`。本实验中是`lex.l.cc`，同时还生成了一个头文件`lex.l.hh`以方便主程序调用，具体可查看同文件夹下的`CMakeLists.txt`。在构建了一次 task1 后，就可以在 `/YatCC/build/task/1/flex`下看到 flex 的产物了。这个 C 源文件中最核心的函数是`yylex()`，当它被调用时，会尝试匹配输入流中的下一个词法单元，匹配成功后执行相应的动作。

`lex.l`中规则的基本结构为`模式 { 动作 }`，其中`模式`是正则表达式，`动作`是 C 代码。所有的规则`%%...%%`包裹，在这外面你可以先定义一系列正则表达式并取一个别名，方便后续对这些正则表达式进行组合使用，例如：

```flex
D     [0-9]
L     [a-zA-Z_]
H     [a-fA-F0-9]
E     ([Ee][+-]?{D}+)
P     ([Pp][+-]?{D}+)
FS    (f|F|l|L)
IS    ((u|U)|(u|U)?(l|L|ll|LL)|(l|L|ll|LL)(u|U))

%%
...
0[0-7]*{IS}?          { ADDCOL(); COME(CONSTANT); }
[1-9]{D}*{IS}?        { ADDCOL(); COME(CONSTANT); }
%%
```

对关键字和数学符号等进行规则的编写则更简单：

```flex
"auto"        { ADDCOL(); COME(AUTO); }
"_Bool"       { ADDCOL(); COME(BOOL); }
```

在`lex.l`代码的头部用`%{ ... %}`包裹的代码，会被原样复制到生成的 C 源文件中。这里定义了一些宏和函数，方便在规则中调用，同时也是词法分析器与外部交互的地方。

```c++
%{
#include "lex.hpp"
#include <cstring>
/* 所有代码全部抽离出来，放到 lex.hpp 和 lex.cpp 里 */

using namespace lex;

#define ADDCOL() g.mColumn += yyleng;
#define COME(id) return come(id, yytext, yyleng, yylineno)
%}
```

其中用到了几个 flex 的内置变量：

- `yyleng`：代表当前词法规则匹配到的字符串的长度
- `yytext`：代表当前词法规则匹配到的文本内容，例如`auto`、`{`等词法单元
- `yylineno`：代表`yytext`文本内容在**当前文件中**出现的行号

`ADDCOL()`宏利用`yyleng`更新词法分析过程中的列信息。`COME(id)`宏封装了对`come()`函数的调用，用于处理和记录识别到的每个词法单元，并最终返回该单元的类型。

---

为了简化规则的编写，`COME(id)`宏中的`id`是一个枚举值而不是整型，所以可以直接写成`COME(AUTO)`而不用写`COME(1)`。这些枚举值是`lex.hpp`中定义的`enum Id`。

`lex.hpp`中除了定义`enum ID`以及一些函数声明之外，还定义了一个结构体`G`用于实时保存词法分析器的状态：

```c++
struct G
{
  Id mId{ YYEOF };              // 词号
  std::string_view mText;       // 对应文本
  std::string mFile;            // 文件路径
  int mLine{ 1 }, mColumn{ 1 }; // 行号、列号
  bool mStartOfLine{ true };    // 是否是行首
  bool mLeadingSpace{ false };  // 是否有前导空格
};
```

---

`lex.cpp`包含了`lex.hpp`中声明的函数的定义，并实例化了一个`G`结构体变量`g`。

由于枚举值并不是我们要在最终文件中输出的字符串，所以`lex.cpp`中还定义了一个字符串数组`kTokenNames`，用于保存每个枚举值对应的输出字符串。

## 主程序部分

主程序部分只有`main.cpp`一个文件。`main.cpp`调用暴露的`yylex()`函数来处理输入，最终将词法分析结果输出到指定文件。

`main.cpp`中的 `main` 函数有三个输入参数：

- 程序名称`argv[0]`
- 输入文件路径`argv[1]`
- 输出文件路径`argv[2]`

其中`argv[1]`在`main`函数定义`yyin`时候使用。`yyin`是 flex 词法分析器的默认输入流指针，指向文件输入源，从而使词法分析器从指定文件读取输入。

`outFile`是一个`std::ofstream`类型的对象，用于向指定文件写入输出。在`main.cpp`中，`outFile`利用`argv[2]`进行初始化，从而将词法分析结果输出到指定文件。

## 任务总结

综上所述，同学们的任务包括：

- 补充词法规则：首先在`lex.l`中编写词法分析规则，然后给`enum Id`中添加对应的枚举值，并且在`kTokenNames`的**正确位置**添加对应的输出字符串。

- 更新并记录状态信息：除了正确识别出每个词法单元的类型并输出外，我们还需要识别出词法单元出现在源文件中的位置和源文件路径，这要求我们在处理对应文本时记录与更新当前词法单元状态。相关状态保存在`lex.cpp`的全局结构体变量`G g`中。

- 输出结果：正确记录词法单元状态后，利用这些状态信息组装分析结果，最后通过`main.cpp`的`print_token()`函数输出到目标文件中。
