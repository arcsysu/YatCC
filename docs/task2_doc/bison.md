# 使用 Bison 完成 Task2

## 任务介绍

在本次实验中，同学们需要完成以下任务：

1. 词法分析：参考 task1 的标准输出 `build/test/task1/*/*/answer.txt` 补充`lex.cpp`文件的`kTokenId`，保证可能出现的 token 类型，均在`kTokenId`中被定义。
2. 语法分析：类型检查和 ASG 生成 JSON 文件这两部分代码已经实现。同学们需要认真阅读`common/asg.hpp`以及[文法参考](task2_doc/overview.md?id=grammer-reference)，了解不同类型 ASG 节点（结构体）的成员以及含义，并在`par.y`中补充缺少的语义规则。

   你可能会需要：

   - 补充缺少的产生式
   - 补充缺少的语义动作
   - 在语义动作中，创建 ASG 节点（结构体），并填充相应的成员

## Bison 简介

我们先来打个比方，让大家对 Bison 有个基本的印象：

假如同学们在学习一种新的语言，可以通过“词典”来查找这些奇形怪状的字母组成的“单词”是什么意思。你的“语言老师”除了教你单词之外，还会教你这门语言的“语法”，例如：哪些单词是名词，哪些单词是动词，哪些单词可以放在一起组成句子，放在一起之后会产生什么样的意思等等。

同样，在计算机领域，编程语言也是一种语言。为了弄懂编程语言，计算机也需要“词典”和“老师”，前者就是我们说的“词法分析器”，后者就是“语法分析器”。在[flex 简介](task1_doc/flex.md?id=flex-intro)中，我们提到 flex 是词法分析器的生成工具，而 **Bison 就是一个语法分析器的生成工具**。你只需要告诉 Bison 你的编程语言的规则，比如这门语言是怎样建立的，有哪些单词，单词之间又是怎样组合的等等，然后 Bison 就会根据你提供的这些规则，生成一个符合这些规则的“语法分析器”。flex 和 Bison 常常配合使用，共同完成词法分析和语法分析。

### Bison 原理

首先要明白的一点是，flex 和 Bison 的代码不是 C 和 C++ 源代码，严格地说它们是专用于生成词法分析器和语法分析器的**领域特定语言**（Domain Specific Language，**DSL**）。Bison 不是语法分析器，只是用于生成语法分析器的一种语言。

在`.y`文件中编写语义分析规则之后，Bison 会根据`.y`文件生成`y.tab.h`, `y.tab.c`, `y.output`等文件，将这些文件与 flex 生成的`lex.yy.c`文件以及主文件一起编译链接，最后可以得到一个可执行文件。这个可执行文件就是一个真正的语法分析器程序。

---

flex + Bison 配合处理源代码的流程大致如下：

- 输入一个文件，flex 可以对该文件进行正则表达式的匹配，从而生成一系列的 token 流。

- lex 生成每一个 token 之后，将其传给 Bison 进行处理：Bison 会对当前传入的 token 进行语法分析，即文法的匹配，并进行相应移进归约操作。

- 同时，Bison 进行移进归约操作的时，还会执行我们自定义的语义动作，从而完成语法分析。

---

关于 flex，我们在 task1 的文档中以及进行了详细的介绍。如果你 task1 不是选用 flex 完成的实验，可以先大致浏览一下[使用 flex 完成 Task1](task1_doc/flex.md)这篇文档。

这里给出[Bison 官方文档](https://www.gnu.org/software/bison/manual/) 以供同学们参考，在熟悉 Bison 以后用于查找一些具体用法，现在可以暂时跳过。

### flex 和 Bison 的使用范式

flex 和 Bison 生成的代码分别处于两个 C 源代码文件，它们各自单独编译，然后通过外部链接机制最终链接为一个整体。flex 和 Bison 的代码文件在整体结构上都是被两个`%%`分成了三个部分：前言、主体、后记。

```text
// 前言

%%

// 主体

%%

// 后记
```

---

默认情况下，flex 和 Bison 生成的代码是为传统的命令行程序设计的，且这些代码是不可重入的（换句话说，使用全局变量来存储词法分析器或语法分析器的状态）。flex 默认从标准输入读取数据。

flex 和 Bison 之间以 Bison 为主，flex 只是辅助的可选项。Bison 根据`.y`文件，生成一个`int yyparse()`函数，其内部调用两个需要我们补充定义的函数`int yylex()`、`void yyerror(const char *)`来读取词法单元流和报告错误，flex 就是用于生成那个`yylex()`函数。

---

在联合使用时，我们首先应该在`.y`文件的前言区用`%token`定义有哪几种词法单元。然后在 flex 的`.l`文件中包含 Bison 生成的头文件，引入这些词法单元的定义。最后在`.l`文件中编写词法单元的解析规则。

下面是一个具体的例子，用于解析正负数字：

```bison
// parser.y
%code top {
int yylex (void);
void yyerror (char const *);
}

%token NUMBER
%token ADD
%token SUB

%%
start: NUMBER | ADD NUMBER | SUB NUMBER; // 写成我们熟悉的文法产生式形式也即是 start -> NUMBER | ADD NUMBER | SUB NUMBER
%%

// lexer.l
%{
#include "parser.tab.h"
%}

%option noyywrap

%%
[0-9]+    { return NUMBER; }
"+"        { return ADD; }
"-"        { return SUB; }
%%
```

为了让 Bison 生成的代码能够通过编译环节，必须在`.y`中加入`yylex()`和`yyerror()`的声明。

`.l`中的`"parser.tab.h"`是 Bison 的默认生成的头文件名，你应该填你实际指定的文件名。flex 根据`.l`文件生成的词法分析器代码默认会调用一个外部定义的函数`yywrap()`，如果你没定义就会导致编译链接失败。然而对于本实验而言这个函数是没用的，因此在前言区加入了一行`%option noyywrap`，以忽略这个函数。

---

以上就是联合使用 flex 和 Bison 的大致流程。如果同学们还是有点云里雾里，可以自行查找一些资料，例如这篇[知乎文章](https://zhuanlan.zhihu.com/p/111445997)，也欢迎同学们向助教提问。

### 定义和访问语义值

同学们已经在理论课上了解到，语法解析树的每个结点都会和一些“属性”关联起来，不同结点有哪些属性一般都是不一样的，反映到代码里就是不同非终结符和终结符的语义值及其类型是不一样的。例如一个整数字面量`123`的语义值是`int`类型的`123`，而一个字符串字面量`"hello"`的语义值是`char*`类型的`char*`。所以总而言之**文法符号的语义值是一个联合**（联合在声明时可以包含多种可能的类型，但是最终只能使用其中的一种），对应 C 语言中的`union`。但是，使用联合体是十分容易出错的，Bison 考虑到了这一点，所以它提供了`%union`和`$n`机制代替我们直接编写和操作联合体。

---

在前言区，使用`%union`定义**所有**可能的语义值，然后分别用`%nterm`和`%token`将非终结符和终结符与其语义值关联起来：

```bison
%union {
  int num;      // 可能是int 类型的语义值
  char* str;    // 也可能是 char* 类型的语义值
}

%nterm <str> start    // 非终结符 start 的语义值为（char* 类型的）str
%token <num> NUMBER   // 终结符 NUMBER 的语义值为（int 类型的）num
%token <str> STRING   // 终结符 STRING 的语义值为 （char* 类型的）str
```

---

在主体区，可以使用`$n`就可以操作文法符号对应的语义值：

```bison
start: NUMBER STRING { $$ = $2 + $1; } ;
```

`$$`代表规则/产生式左侧符号（这里是`start`）的语义值，`$n`代表规则/产生式右侧第`n`个符号的语义值（这里`$1`和`$2`分别代表`NUMBER`和`STRING`的语义值）。

**`$$`、`$1`和`$2`会被 Bison 自动拓展为类似于`start.str`、`NUMBER.num`和`STRING.str`的联合体成员引用**，并且 Bison 会帮我们检查类型的使用是否正确。这里`$$ = $2 + $1`的意思是将`NUMBER`对应的 token 的语义值和`STRING`对应的 token 的语义值相加后，赋给`start`对应的 token 的语义值。

---

归根到底，语义值的来源是词法分析器。词法分析器在分析过程中，每识别到一个 token，会给 token 提供一个语义值，并通过全局变量`yylval`传递给语法分析器。比如在`.l`规则的动作部分，手动设置语义值：

```bison
[0-9]+ {
  yylval.num = atol(yytext);
  return NUMBER;
}

[a-zA-Z]+ {；
  char* str = malloc(strlen(yytext));
  strcpy(str, yytext);
  yylval.str = str;
  return STRING;
}
```

### 编写语义动作

Bison 中，除了书写文法的产生式之外，还要编写语义动作，其基本结构如下：

```text
产生式/规则左部 ： 产生式/规则右部1 | 产生式/规则右部2 | ... {
  动作
}
```

一个具体的例子是：

```bison
start
    : translation_unit // 产生式，表示 start 可以推导为translation_unit
        {
        par::gTranslationUnit.reset($1);
        } // 动作
    ;
```

在产生式右部加入 `{}`，然后在`{}`中可以定义语义动作（用Ｃ语言代码进行撰写），表示使用这条产生式进行规约的时候应该执行的代码。

## 代码说明

实验文件的整体结构如下所示：

```text
bison/
├── lex.cpp
├── lex.hpp
├── lex.l
├── main.cpp
├── par.cpp
├── par.hpp
├── par.y
common/
├── Asg2Json.cpp
├── Asg2Json.hpp
├── Typing.cpp
├── Typing.hpp
├── asg.hpp
├── asg.cpp
├── Obj.hpp
└── Obj.cpp
```

其中 `common/` 文件夹包含了一系列公用代码，在[公用代码介绍](task2_doc/share.md)中已经详细介绍过了。

`bison/` 则是使用 Bison 完成实验会涉及到的代码，接下来在各个小节详细介绍。

### 主程序部分

`main.cpp`是整个语法分析器程序的入口。`main()`函数中：

1. 首先调用`yyparse()`进行语法分析，在其中进行填充 ASG 的结构
2. 然后进行类型检查 `typing(*par::gTranslationUnit)`
3. 最后由 ASG 生成 JSON `asg2json(par::gTranslationUnit)`，并且写入指定文件。

---

第一步语法分析中，逻辑如下：

1. 程序的输入的是 task1 的标准输出`/YatCC/build/test/task1/*/*/answer.txt`，也即 token 流。例如第一个样例的输入`/YatCC/build/test/task1/functional-0/000_main.sysu.c/answer.txt`：

   ```text
   int 'int'  [StartOfLine] Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:1:1>
   identifier 'main'  [LeadingSpace] Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:1:5>
   l_paren '('  Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:1:9>
   r_paren ')'  Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:1:10>
   l_brace '{'  Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:1:11>
   return 'return'  [StartOfLine] [LeadingSpace] Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:2:5>
   numeric_constant '3'  [LeadingSpace] Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:2:12>
   semi ';'  Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:2:13>
   r_brace '}'  [StartOfLine] Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:3:1>
   eof ''  Loc=</YatCC/test/cases/functional-0/000_main.sysu.c:3:2>
   ```

2. 词法分析器每匹配到一个 token，就会传给 Bison 进行语法分析。相比于实验一逐字符读取源文件来进行 token 的匹配，实验二中，输入每一行就是一个 token。可以查看`lex.l`中的词法分析规则：

   ```flex
   ^#[^\n]*                /* 屏蔽以#开头的行 */
   <<EOF>> {return YYEOF;}
   .*\n { COME_LINE(); }   /* 匹配每一行*/
   . {COME(YYUNDEF);}
   ```

   `COME_LINE()`是一个宏，实际调用了`lex.cpp`里的`come_line()`函数。在这个函数中，对拿到的每一行进行处理，提取出每行的第一个单词（`tokenId`）和每行的第二个单词中的引号内容（`tokenValue`）。例如，以第一个样例的第一行为例，识别出的 token 的`tokenId`为`int`，`tokenValue`也为`int`。

3. Bison 拿到该 token 后，选择移进或者规约，同时完成用户自定义的语义动作。在本实验中，语义动作一般是生成并填充 ASG 系欸点。

第二步类型检查中，`typing()` 将对生成的 ASG 中的每一个结构进行类型检查，如果类型检查未通过，程序就会停止。同学们可以利用这个特性方便地进行查错，判断自己到底是哪个类型没有写对。

第三步 ASG 生成 JSON 文件中，`asg2json()`将通过类型检查的 ASG 结构转化为 JSON 并打印出来。

---

类型检查和 ASG 生成 JSON 文件这两部分已经实现，同学们**只需要完成第一步语法分析中的文法定义和语义动作**即可，也即补充`par.y`文件。

同学们还需要补充`lex.cpp`文件的`kTokenId`，保证`answer.txt`中可能出现的 token 类型，均在`kTokenId`中被定义。task1 选用 flex 完成的同学，对于这一步应该比较熟悉了。如果你没有使用 flex 完成 task1，可以查看[使用 flex 完成 Task1](task1_doc/flex.md)的相关内容，以获得更详细的指引。

### 词法和语法分析部分

词法分析部分包含了`lex.l`，`lex.hpp`和 `lex.cpp`三个文件，其中 `lex.l`是用于写词法分析的规则部分，`.hpp`和 `.cpp`文件是用于定义相关辅助函数的文件。

语法分析部分包含了`par.y`，`par.hpp`和 `par.cpp`三个文件。其中 `par.y`是用于写语法分析相关的文法以及语义动作，`.hpp`和 `.cpp`文件是用于定义相关辅助函数的文件。

---

接下来以添加某条文法规则为例进行讲解，向同学们解释这部分的代码是如何运作的。

例如，文法中关于语句的一条规则/产生式如下：

```bison
statement
    ： compound_statement
    | expression_statement // 表达式语句
    | jump_statement // 跳转语句
    ;
```

其中跳转语句的产生式如下：

```bison
jump_statement
    : RETURN ';'
    | RETURN expression ';'
    ;
```

1. 文法撰写

   为了表示上面的规则，在`par.y`文件中应该添加如下代码：

   ```bison
   statement
   : compound_statement
   | expression_statement
   | jump_statement
   ;
   jump_statement
   : RETURN ';'
   | RETURN expression ';'
   ;
   ```

2. 语义动作撰写

   从语法解析树直接转化到 JSON 是十分困难的，我们需要进行一些封装，从而可以方便地通过定义 Bison 的语义动作，来填充 ASG 结构，为之后向 JSON 转化做铺垫。

   我们可以在`asg.hpp`中找到许多结构体的定义：

   ```cpp
   namespace asg {
   //==============================================================================
   // 类型
   //==============================================================================
   struct Type : Obj；   /* 用于表示节点的类型，包括基本类型和复合类型 */
   struct TypeExpr : Obj；   /* 表示更复杂的类型，如数组和函数 */
   struct PointerType : TypeExpr；
   struct ArrayType : TypeExpr；
   struct FunctionType : TypeExpr；

   //==============================================================================
   // 表达式
   //==============================================================================
   struct Expr : Obj；    /* 所有表达式节点的基类，比如字面量、二元运算、函数调用等 */
   struct IntegerLiteral : Expr；
   struct StringLiteral : Expr；
   struct DeclRefExpr : Expr； /* 声明引用表达式 */
   struct ParenExpr : Expr；  /* 带括号的表达式 */
   struct UnaryExpr : Expr；  /* 一元表达式 */
   struct BinaryExpr : Expr；  /* 二元表达式 */
   struct CallExpr : Expr；   /* 函数调表达式 */
   struct InitListExpr : Expr；  /* 初始化列表（如数组或结构体初始化） */
   struct ImplicitInitExpr : Expr；  /* 隐式初始化的表达式 */
   struct ImplicitCastExpr : Expr；   /* 隐式类型转换表达式 */

   //==============================================================================
   // 语句
   //==============================================================================
   struct Stmt : Obj  /* 所有语句的基类，例如表达式语句和符合语句 */
   struct NullStmt : Stmt /* 空语句 */
   struct DeclStmt : Stmt /* 声明语句 */
   struct ExprStmt : Stmt /* 表达式语句 */
   struct CompoundStmt : Stmt  /* 复合语句（大括号包围的语句块） */
   struct IfStmt : Stmt
   struct WhileStmt : Stmt
   struct DoStmt : Stmt
   struct BreakStmt : Stmt
   struct ContinueStmt : Stmt
   struct ReturnStmt : Stmt

   //==============================================================================
   // 声明
   //==============================================================================
   struct Decl : Obj  /* 所有声明的基类，例如变量声明和函数声明 */
   struct VarDecl : Decl  /* 变量声明 */
   struct FunctionDecl : Decl  /* 函数声明 */

   //==============================================================================
   // 顶层
   //==============================================================================
   struct TranslationUnit : Obj   /* 代表整个程序或一个编译单元，是ASG的根节点 */

   } // namespace asg

   ```

   不同种类的结构体就代表着不同种类的节点，我们在公用代码介绍部分已经提到过了。如果看完上面的注释，对某个结构体的含义还是不太清楚，可以查看`asg2json.cpp`中该结构体的的打印方式。

   `asg.hpp`中定义了所有会使用到的结构体，而且该文件无需同学们修改。所以同学们还可以据此文件推断，究竟需要哪些产生式/文法规则。强烈建议同学们先仔细阅读`asg.hpp`，加深对结构体的含义的理解，避免低级错误。

   有了上面的结构体，就可以填充相应的 ASG 结构。需要在原来代码的基础上，加上对应的语义动作:

   ```bison
   statement // Stmt
   : compound_statement
     {
     $$ = $1;
     }
   | expression_statement
     {
     $$ = $1;
     }
   | jump_statement
     {
     $$ = $1;
     }
   ;
   jump_statement // ReturnStmt
   : RETURN ';'
     {
     auto p = &par::gMgr.make<asg::ReturnStmt>();
     $$ = p;
     }
   | RETURN expression ';'
     {
     auto p = &par::gMgr.make<asg::ReturnStmt>();
     p->expr = $2;
     $$ = p;
     }
   ;
   ```

   `statement`部分的语义动作是`$$ = $1`，意为直接将右部第一个符号（`compound_statement`等）的语义值赋给左部（`statement`）。

   `jump_statement`部分的语义动作显式调用函数模板`&par::gMgr.make<asg::ReturnStmt>();`构造`ReturnStmt`类型的 ASG 节点，然后填充该结构体（具体可以看`make`的代码，只要是直接或间接继承于`Obj`类型的都可以用这个构造器进行构造）。

   根据`ReturnStmt`类型节点的定义，需要填充`func`、`expr`结构，在这里只有`jump_statement : RETURN expression ';'`的情况需要填充`expr`结构。

3. 在`par.y`相对应的地方进行类型的定义

   在使用文法符号类型时，还需要在`par.y`相对应的地方进行类型的定义。以`compound_statement`为例，需要在前言区补充：

   ```bison
   %union {
   asg::CompoundStmt* CompoundStmt;  // 首先添加一种语义值
   }

   %type <CompoundStmt> compound_statement // 然后使用
   ```

   最终，合法的句子会归约到开始符号，对于我们实验来说，就是生成一个`TranslationUnit`的结构体，其中包含了整个 ASG 的信息：

   ```bison
   start
   : translation_unit
    {
    par::gTranslationUnit.reset($1);
    }
   ;
   ```

   `asg2json()`就是从这个根节点，然后进行遍历，打印出所有节点的信息。

---

最后介绍一段比较特殊的的代码

```bison
function_definition
: declaration_specifiers declarator
{
auto funcDecl = $2->dcst<asg::FunctionDecl>();
ASSERT(funcDecl);
// 设置当前全局的函数作用变量
par::gCurrentFunction = funcDecl;
auto ty = par::gMgr.make<asg::Type>();
if (funcDecl->type != nullptr)
  ty->texp = funcDecl->type->texp;
ty->spec = $1->spec, ty->qual = $1->qual;
funcDecl->type = ty;
}
compound_statement
{
$$ = par::gCurrentFunction;
$$->name = $2->name;
$$->body = $4;
}
;
```

可以看到一个规则下有两个动作。可以从左往右看：在匹配到`declartion_specifiers`和`declarator`后，就执行第一个语义动作（即，想要他执行后面的代码），然后再匹配到`compund_statement`时，执行第二个语义动作。

第二个动作中用到了`$4`，代表`compound_startement`，此时第一个动作也被 Bison 视为一个部分计数。但是这种情况不建议使用`$4`，而是直接用`$+名字`，也即`$compund_statement`，因为有时候 Bison 会进行优化，导致`$4`的值不是`compound_statement`。

---

对于空产生式，可以使用`%empty`关键字，例如：

```bison
initializer_list
  : %empty;
```

## 如何调试

### yydebug

如果在评分时，有测试点显示“JSON 文件损坏”，大概率是 Bison 进行语法分析时出现了问题，ASG 没有正确生成。此时可以直接在 `main.cpp` 中加入 `yydebug=1`，开启调试模式。

![alt text](../images/bison/yydebug.png)

然后，你可以调用语法分析器程序，并提供出现错误的输入文件，运行，就可以看到输入信息了。例如，CMake 生成 task2 可执行文件后，在命令行中输入：

```bash
./build/task/2/bison/task2 ./build/test/task1/functional-0/000_main.sysu.c/answer.txt ./mylog.txt
```

可以看到类似下面的输出：

```text
程序 ./build/task/2/bison/task2
输入 ./build/test/task1/functional-0/000_main.sysu.c/answer.txt
输出 ./mylog.txt
Starting parse
Entering state 0
Stack now 0
Reducing stack by rule 1 (line 80):
-> $$ = nterm $@1 ()
Entering state 2
Stack now 0 2
Reading a token
Next token is token INT ()
Shifting token INT ()
Entering state 6
Stack now 0 2 6
Reducing stack by rule 26 (line 290):
   $1 = token INT ()
-> $$ = nterm type_specifier ()
Entering state 14
Stack now 0 2 14
...
```

详细展示了当前处于什么状态，下一个读入的 token 是什么，正在用哪条规则进行规约等。如果某个时刻出现了错误，也会有像`syntax error`这样字眼的提示。

至于其中的`state 0`，`rule 26`究竟是什么，可以查看`/build/task/2/bison/par.y.output`文件，里面包含了所有状态和规则的详细信息。

需要提醒的是，这部分是不适合使用断点进行调试的。因为调用`yyparse()`，会跳到 Bison 生成的代码中，很难知道归约到哪里了。所以文法直接设置 `yydebug=1`，必要时，还可以在语义动作中用`std::cout`打印一些信息，帮助定位问题。

### 断点调试

`Typing`和`Asg2Json`部分出现问题，可以使用[断点调试](introduction/howtouse.md#debug)，看下是哪一部分生成不到位出了问题。配合`std::cout`打印效果更佳。

### 输出到文件

有时候编译很顺畅地通过的时候，`std::cout`打印不出来。这个时候可以尝试将输出写入到文件里面。例如可以定义类似下面这样的函数，将输出打印到指定文件，辅助我们调试：

```cpp
void printToTxtFile(std::string message) {
    std::ofstream myfile;
    myfile.open ("/YatCC/task/2/Bison/log.txt", std::ios_base::app); // 'app' means appending to the end of the file, trunc: start of the file
    myfile << message << "\n";
    myfile.close();
}
```

## 常见坑点

- 指针问题

  取类型的时候，返回的指针可能是空的，如果这个时候强行访问其 `texp` 成员，就会终止，也不会有报错信息。所以最好判断一下是不是空指针再去取，例如：

  ```cpp
  auto ty = par::gMgr.make<asg::Type>();
  if($2->type != nullptr)
    ty->texp = $2->type->texp;
  ```

- 修改 ASG 结构体的`type`

  想要修改 ASG 结构体的`type`，应该像下面这样做：

  ```cpp
  auto ty = par::gMgr.make<asg::Type>();
  if($2->type != nullptr)
    ty->texp = $2->type->texp;
  ty->spec = $1->spec, ty->qual = $1->qual;
  $2->type = ty;
  ```

  首先新建一个`Type`对象`ty`，然后修改`ty`，最后令`$2->type=ty`，从而实现`type`的修改。直接`$2->type->spec=...`是不行的，因为 ASG 结构体的`type`的类型为`const Type *`。

## 其他说明

task2 中 `BreakStmt` 的 `loop` 属性暂时不用处理，本实验以及实验三均不会用到：

```cpp
struct BreakStmt : Stmt {
  Stmt *loop {nullptr};

private:
  void __mark__(Mark mark) override;
};
```
