# 使用antlr完成实验二
使用`antlr`完成实验时所需要用到的文件如下所示，其中`common`文件夹内的内容是不管使用`antlr`还是`bison`进行实现都需要用到的代码。
```bash
-- antlr
  |-- Ast2Asg.cpp
  |-- Ast2Asg.hpp
  |-- CMakeLists.txt
  |-- README.md
  |-- SYsULexer.cpp
  |-- SYsULexer.hpp
  |-- SYsULexer.py
  |-- SYsULexer.tokens
  |-- SYsUParser.g4
  `-- main.cpp
-- common
   |-- Asg2Json.cpp
   |-- Asg2Json.hpp
   |-- Typing.cpp
   |-- Typing.hpp
   `-- asg.hpp
```

这些代码使用 `antlr` 实现了一个简单的语法分析器，用于将 `SYsU_lang` 语言的源代码转换为抽象语法树（`AST`），再进一步转换为抽象语法图（`ASG`），最后再将 `ASG` 转换为 `JSON` 格式进行输出（将 `ASG` 转换为 `JSON` 格式输出的原因是 `ASG` 是存在于内存中的不便于阅读的数据结构，输出为 `JSON` 格式方便同学们与实验标准答案对应的输出进行对比差错）。下面是对主要代码文件的结构和关键功能的分析，以便同学们对代码的整体架构有一定的了解，方便后续进行编码。

## `main.cpp`相关代码

`main.cpp` 使用`ANTLR`的流接口和`Lexer`进行词法分析，生成`token`流。基于`token`流，通过`Parser`生成`AST`。然后创建一个 `Ast2Asg` 实例，用于将`ANTLR`生成的`AST`转换为内部使用的`ASG`结构。然后通过 `Typing `类对`ASG`中的节点执行类型推导。接着创建一个 `Asg2Json` 实例，将`ASG`转换为`JSON`格式的数据。


## `Ast2Asg` 相关代码介绍
### `Ast2Asg` 在整个代码逻辑中被调用的位置
`Ast2Asg.cpp` 和 `Ast2Asg.hpp`  中的 `Ast2Asg` 类负责将 `AST` 转换为 `ASG`。包括对各种语法结构（如表达式、语句、声明等）的处理方法。
`Ast2Asg` 相关的代码在 `main.cpp` 中是通过如下方法进行调用的。

```c++
  asg::Obj::Mgr mgr;
  asg::Ast2Asg ast2asg(mgr);
  auto asg = ast2asg(ast->translationUnit());
```
上面这段代码发生了从 `AST`（抽象语法树）到 `ASG`（抽象语法图）的转换过程。下面是详细的解释：

首先是
```c++
asg::Ast2Asg ast2asg(mgr);
```
这行代码创建了 `Ast2Asg` 类的一个实例 `ast2asg`，并将对象管理器 `mgr` 作为构造函数的参数传递给它。这个对象管理器 mgr 负责在 AST 到 ASG 的转换过程中创建和管理所有 ASG 节点的生命周期。

然后是

```c++
auto asg = ast2asg(ast->translationUnit());
```

这行代码调用了 `ast2asg` 实例的操作符 `()` 函数，传入了由 `ANTLR` 生成的 `AST` 的根节点 —— 通常是表示整个程序的 `translationUnit` 节点。这个函数的任务是遍历 `AST`，为每个节点创建相应的 `ASG` 节点，并根据 `AST` 节点之间的关系构建 `ASG` 的结构。其中的过程细节是：
1. 遍历`AST`：函数首先遍历 `AST` 的每个节点。`AST` 是根据源代码的语法结构自顶向下递归构建的树形结构，每个节点代表了源代码中的一个语法结构（如表达式、语句、声明等）。
2. 节点转换：对于 `AST` 的每个节点，`Ast2Asg` 类中定义的对应的转换方法会被调用。这些方法负责将 `AST` 节点转换为 `ASG` 节点。转换过程中可能会创建新的 `ASG` 节点对象，并利用对象管理器 `mgr` 进行管理。
3. 构建`ASG`结构：在转换各个 `AST` 节点的同时，转换方法还会根据 `AST` 节点之间的父子关系和兄弟关系来构建 `ASG` 的图形结构。这一步骤确保了转换后的 `ASG` 能够准确反映程序的逻辑结构和语法结构。
4. 返回ASG的根节点：整个转换过程完成后，`ast2asg(ast->translationUnit())` 会返回转换后的 `ASG` 的根节点。这个根节点代表了整个程序的抽象语法图，是后续编译过程中进行语义分析、优化和代码生成等操作的基础。

接下来会向大家介绍`Ast2Asg.cpp`相关类和方法的定义。

### Ast2Asg 类定义
Ast2Asg类负责将由ANTLR解析器生成的AST转换为更方便处理的ASG形式。它包含一个对象管理器（Obj::Mgr）的引用，用于创建和管理AST节点对应的ASG节点。
```c++
class Ast2Asg
{
public:
  Obj::Mgr& mMgr;

  Ast2Asg(Obj::Mgr& mgr)
    : mMgr(mgr)
  {
  }

  TranslationUnit* operator()(ast::TranslationUnitContext* ctx);
  ...
  Decl* operator()(ast::InitDeclaratorContext* ctx, SpecQual sq);

private:
  struct Symtbl;
  Symtbl* mSymtbl{ nullptr };

  FunctionDecl* mCurrentFunc{ nullptr };

  template<typename T, typename... Args>
  T* make(Args... args)
  {
    return mMgr.make<T>(args...);
  }
};
```
- 类成员变量 `Obj::Mgr& mMgr` 是对对象管理器的引用，用于创建和管理`AST`节点对象。
- 构造函数接受一个对象管理器的引用，用于初始化 `mMgr` 成员。
- `operator()` 方法被重载多次，每个重载对应处理`AST`中不同节点类型的转换逻辑。
- `SpecQual` 是一个类型别名，用于表示变量或函数的类型和限定符。
- `Symtbl` 结构是一个符号表，用于在转换过程中管理作用域内的符号信息。
- `mSymtbl` 成员指向当前的符号表，`mCurrentFunc` 指向当前正在处理的函数声明，以便在处理表达式时可以访问函数的上下文信息。
- `make<T>()` 模板函数用于通过对象管理器创建新的AST节点对象。

此外，`Ast2Asg` 类的方法主要负责将`AST`中的每个节点转换为`ASG`的对应表示。包括但不限于：

- 处理整个编译单元（`TranslationUnit`）。
- 转换类型说明符（`DeclarationSpecifiersContext`）和声明符（`DeclaratorContext`、`DirectDeclaratorContext`）。
- 转换各种表达式（如`AssignmentExpressionContext`、`AdditiveExpressionContext`等）。
- 转换语句（`StatementContext`、`CompoundStatementContext`等）。
- 转换声明和函数定义（`DeclarationContext`、`FunctionDefinitionContext`等）。



### Symtbl 结构
```c++
struct Ast2Asg::Symtbl : public std::unordered_map<std::string, Decl*>
{
  Ast2Asg& m;
  Symtbl* mPrev;

  Symtbl(Ast2Asg& m)
    : m(m)
    , mPrev(m.mSymtbl)
  {
    m.mSymtbl = this;
  }

  ~Symtbl() { m.mSymtbl = mPrev; }

  Decl* resolve(const std::string& name);
};
```
- 作用: `Symtbl` 是一个内嵌在 `Ast2Asg` 类中的结构，用于实现符号表，保存当前作用域内所有声明的符号及其对应的声明节点。它继承自 `std::unordered_map<std::string, Decl*>`，键是符号名称，值是指向声明节点的指针。
- 字段:
`Ast2Asg& m`: 引用外层的 `Ast2Asg` 对象，以便于访问其成员。
`Symtbl* mPrev`: 指向上一个符号表的指针，用于实现作用域的嵌套。
- 构造和析构函数:
构造函数中，将新创建的符号表实例设置为当前符号表，并将旧的符号表保存为 `mPrev`。
析构函数中，将符号表恢复到上一个符号表。


### resolve 方法

```c++
Decl*
Ast2Asg::Symtbl::resolve(const std::string& name)
{
  auto iter = find(name);
  if (iter != end())
    return iter->second;
  ASSERT(mPrev != nullptr); // 标识符未定义
  return mPrev->resolve(name);
}
```
- 作用: 在符号表中查找给定名称的符号，如果当前作用域中没有找到，会递归地在上一个作用域中查找。
- 参数: `const std::string& name` - 需要查找的符号名称。
- 返回: 找到的 `Decl*`，如果符号未定义，则断言失败。


### `Ast2Asg`其他关键方法
```c++
TranslationUnit* Ast2Asg::operator()(ast::TranslationUnitContext* ctx)
```
其中这个方法负责处理整个编译单元（通常是一个文件），它接收`ANTLR`生成的 `TranslationUnitContext` 对象作为参数，这个对象代表了整个文件的`AST`根节点。
```c++
auto ret = make<asg::TranslationUnit>();
if (ctx == nullptr)
  return ret;

Symtbl localDecls(self);

for (auto&& i : ctx->externalDeclaration()) {
  ...
}
```
- 首先，它创建了一个 `asg::TranslationUnit` 对象，这是`ASG`中对应的根节点。
- 然后，通过遍历`AST`中的所有外部声明（`externalDeclaration`），将它们转换为`ASG`中的声明和函数定义，并添加到 `asg::TranslationUnit` 的声明列表中。
- 如果遇到函数定义，还会将函数名添加到当前作用域的符号表中。


```c++
Ast2Asg::SpecQual Ast2Asg::operator()(ast::DeclarationSpecifiersContext* ctx)
```
这个方法处理变量或函数的类型说明符，例如 `int` 或 `char` 等。其中,
```c++
SpecQual ret = { Type::Spec::kINVALID, Type::Qual() };

for (auto&& i : ctx->declarationSpecifier()) {
  ...
}
```
它遍历`AST`节点中的所有类型说明符，确定变量或函数的类型，并返回一个包含类型和限定符的 `SpecQual` 对象。

最后，

```c++
std::pair<TypeExpr*, std::string> Ast2Asg::operator()(ast::DeclaratorContext* ctx, TypeExpr* sub)
//这个方法处理声明符（declarator），它可能包含数组、函数等更复杂的类型信息。
//方法接收一个声明上下文和可能的子类型表达式（例如数组的元素类型），并返回一个包含类型表达式和变量名的pair。


Expr* Ast2Asg::operator()(各种表达式的Context* ctx)
//对于AST中的各种表达式类型（如赋值表达式、二元表达式、一元表达式等），实现了对应的转换逻辑，将AST节点转换为ASG中的表达式节点。
//例如，operator()(ast::AssignmentExpressionContext* ctx) 处理赋值表达式，创建并返回一个表示赋值的 Expr 节点。


Stmt* Ast2Asg::operator()(ast::StatementContext* ctx) 和 CompoundStmt* Ast2Asg::operator()(ast::CompoundStatementContext* ctx)
//这些方法处理AST中的语句和复合语句。

operator()(ast::StatementContext* ctx) //根据语句类型调用相应的转换方法。
operator()(ast::CompoundStatementContext* ctx) //转换复合语句，处理其中的每一条语句或声明，并创建一个 CompoundStmt 节点。

std::vector<Decl*> Ast2Asg::operator()(ast::DeclarationContext* ctx) 
FunctionDecl* Ast2Asg::operator()(ast::FunctionDefinitionContext* ctx)
//这些方法处理声明和函数定义。

operator()(ast::DeclarationContext* ctx) //转换变量声明，创建 Decl 节点的列表。
operator()(ast::FunctionDefinitionContext* ctx) //处理函数定义，创建一个 FunctionDecl 节点，并处理函数体和参数。
```

整体上，`Ast2Asg.cpp` 中定义的 `Ast2Asg` 类通过这些方法实现了从`ANTLR`的`AST`到`ASG`的转换，涵盖了编程语言的主要构造：表达式、语句、声明和函数定义。转换过程中，它还处理了类型信息和作用域信息，为后续的语义分析和代码生成提供了基础。




## `SYsULexer`相关代码
在实验一中，我们通过编写后缀名为`g4`的`antlr`规则文件生成了`SYsULexer`类，在这里我们默认同学们启用复活机制，输入词法分析器的文件就变成了实验一输出的词法单元流，在这里我们提前为同学们手写了`SYsULexer`类，只需要同学们按照`PPT`中的内容进行`token`名字的添加即可。



## `SYsUParser.g4` 介绍
以 `g4` 为后缀名的文件是 `antlr` 中用于定义词法规则和语法规则的文件。其中 `ANTLR` 规定以大写字母开头定义的语句用于定义词法规则，以小写字母开头定义的语句用于定义语法规则。在本小节中我们默认同学都开启`复活`，即本小节直接把 `clang` 输出的词法分析结果输入到我们自己实现的语法分析器中。请同学们按照`PPT`中的内容进行语法规则的添加即可。

## 实验任务与上手思路

在该部分会详细介绍实验的详细要求与上手步骤。

助教们提前实现了实验二和实验一的解耦，将实验二的词法分析器的输入由实验一的源代码文件修改为了实验一的`answer.txt`文件（保证实验一没有完全做出来的同学，在做实验二的时候不受影响），具体流程如下图所示。

![解耦总览](../images/task2_antlr/antlr_input.jpg)

但是在解耦这一部分我们留下了一些工作需要同学们完成，具体内容请同学们先看下图

![antlr 任务一](../images/task2_antlr/task2_1.jpg)

同学们首先需要填写`/task/2/antlr/SYsULexer.tokens`中所有测试样例需要用到的`token`名字，在构建项目之后`/build/task/2/antlr/SYsULexer.tokens.hpp`中会自动生成一些`k`字母开头的`constexper`定义，最后在`/task/2/antlr/SYsULexer.cpp`中对应位置添加`clang`风格的`token`名字（也就是`answer.txt`每行的第一个单词）与`k`开头的`token`名字的映射就完成了我们的第一个任务。

在同学们完成了上述的解耦工作之后，接着就需要完成`antlr`语法分析器的完成。同学们需要完成`/SYsU-lang2/task/2/antlr/SYsUParser.g4`中的语法规则的编辑。对于语法规则应该如何编写，语法规则应该编写哪些内容，同学们可以根据测试样例的内容进行一一编写，接下来我们会以一些测试样例为例进行一些演示。

在同学们完成词法单元的名字填写之前，直接运行从远程仓库拉下来的代码大概能得到 20 分左右。 在按照上一节中的指引填写词法单元的名字映射，并依照下方指引，完成第一个语法规则的编写后，重新运行评分脚本，此时同学们可以获得 30 分左右。所以下图所示的几个样例同学们首先要解决的测试样例。

![antlr 任务一](../images/task2_antlr/scoreExam.jpg)

要想一个测试样例拿到满分我们需要完成两个步骤，第一个步骤是对该样例中首次出现的语法规则在`/SYsU-lang2/task/2/antlr/SYsUParser.g4`中进行定义。第二个步骤是在`/SYsU-lang2/task/2/antlr/Ast2Asg.cpp`和`/SYsU-lang2/task/2/antlr/Ast2Asg.hpp`中对我们新添加的语法规则进行处理，并且如果`Ast2Asg.cpp`中有新增函数，`hpp`文件**需要同步更新**。

那么就以下图所示的几个测试样例为例, 向同学们演示如何做我们的步骤一和步骤二。

![antlr 任务一](../images/task2_antlr/scoreExam.jpg)

通过观察`/SYsU-lang2/test/cases/functional-1`中的第 17 到 22 个测试样例我们会发现，这几个测试样例中新出现的语法规则有
```c++
a * 5
a / b
a / 5
a / 3
a % 3
```
前面我们提到步骤一我们需要在`/SYsU-lang2/task/2/antlr/SYsUParser.g4`中对测试样例新出现的语法规则进行定义，所以现在我们需要在`SYsUParser.g4`中对乘法表达式，除法表达式以及取模表达式进行语法规则的添加。

此时由于大家`pull`代码之后没有对`g4`文件做任何修改，它是如下图所示的。
```c++
postfixExpression
    :   primaryExpression  
    ;

unaryExpression
    :
    (postfixExpression
    |   unaryOperator unaryExpression
    )
    ;

unaryOperator
    :   Plus | Minus
    ;

additiveExpression
    :   unaryExpression ((Plus|Minus) unaryExpression)*
    ;
```

那么我们要对乘法，除法以及取模操作进行语法规则的添加的话，就需要考虑这一系列的运算和`additiveExpression`的优先级关系。所以我们采取了一个很巧妙的方式实现了乘法系列表达式的规则与加法系列表达式的规则。
```c++
multiplicativeExpression
    :   unaryExpression ((Star|Div|Mod) unaryExpression)*
    ;

additiveExpression
    :   multiplicativeExpression ((Plus|Minus) multiplicativeExpression)*
    ;
```
因为在`multiplicativeExpression`中`((Star|Div|Mod) unaryExpression)*`带了一个`*`（这意味着括号内的一堆东西可以出现 0 次），所以我们可以认为`multiplicativeExpression`可以匹配到`unaryExpression`，这种情况下就退化到了同学们拿到手里的代码。
```c++
additiveExpression
    :   unaryExpression ((Plus|Minus) unaryExpression)*
    ;
```
同时也很好理解下面的代码可以代表加号左右都是`multiplicativeExpression`，以及加号左右一侧是`unaryExpression`，一侧是` multiplicativeExpression`，以及加号的左右两侧都是`unaryExpression`的情况。
```c++
additiveExpression
    :   multiplicativeExpression ((Plus|Minus) multiplicativeExpression)*
    ;
```

那么到这里就完成了我们前面所说的步骤一了，对当前测例中新出现的语法规则在`SYsUParser.g4`文件中进行了规则的添加。

那么请同学们注意，在`SYsUParser.g4`中修改了已有的规则就需要在`Ast2Asg.cpp`中对应的处理函数处做修改。如果在`SYsUParser.g4`中添加了新的规则就需要在`Ast2Asg.cpp`中添加新的处理函数。

因为我们刚刚步骤一的操作修改了`additiveExpression`，我们在`Ast2Asg.cpp`中找到下面的重载函数，那么同学们可能会有疑问，如何把这些重载函数和我们的`SYsUParser.g4`中的语法规则进行对应呢？通过传入参数即可判断，我们找到的这个重载函数的传入参数是`additiveExpression`加上`Context`类型的指针。

```c++
Expr*
Ast2Asg::operator()(ast::AdditiveExpressionContext* ctx)
{
  auto children = ctx->children;
  Expr* ret = self(dynamic_cast<ast::UnaryExpressionContext*>(children[0]));

  for (unsigned i = 1; i < children.size(); ++i) {
    auto node = make<BinaryExpr>();

    auto token = dynamic_cast<antlr4::tree::TerminalNode*>(children[i])
                   ->getSymbol()
                   ->getType();
    switch (token) {
      case ast::Plus:
        node->op = node->kAdd;
        break;

      case ast::Minus:
        node->op = node->kSub;
        break;

      default:
        ABORT();
    }

    node->lft = ret;
    node->rht = self(dynamic_cast<ast::UnaryExpressionContext*>(children[++i]));
    ret = node;
  }

  return ret;
}
```
同学们心中可能还有一个疑问，`ast::AdditiveExpressionContext* ctx`是一个什么东西呢？因为这个类型的指针变量是`antlr`自动生成的代码中的变量类型，我们不需要进行修改，但是可以通过`vscode`的`转到定义`功能跳转到它的定义代码那里去了解，在这里我们只需要知道如何利用这个变量获取到我们想要的信息即可。

上述代码中`auto children = ctx->children;`中的`ctx->children`可以获取到当前加法表达式上下文节点的所有子节点。在ANTLR生成的语法分析树中，每个节点可能有多个子节点，它们代表了该表达式的组成部分（例如，在表达式`a + b`中，`a`和`b`是子节点。

同学们还记得你们拿到的代码吗
```c++
additiveExpression
    :   unaryExpression ((Plus|Minus) unaryExpression)*
    ;
```
这里的`unaryExpression`会被`children[0]`获取到，然后`*`代表出现0次或者无数次，那么`children[i]`如果存在的话就会代表`((Plus|Minus) unaryExpression)`。所以接下来如果函数能进入循环的话，循环首先会执行以下代码
```c++
auto node = make<BinaryExpr>();
```
通过对`BinaryExpr`进行右键点击->转到定义，会得到如下代码，这些代码是`asg.hpp`中的内容，它们位于`common`文件夹中，`common`文件夹中的所有代码都是不需要同学们进行修改的。
```c++
struct BinaryExpr : Expr
{
  enum Op
  {
    kINVALID,
    kMul,
    kDiv,
    kMod,
    kAdd,
    kSub,
    kGt,
    kLt,
    kGe,
    kLe,
    kEq,
    kNe,
    kAnd,
    kOr,
    kAssign,
    kComma,
    kIndex,
  };
```
有了上述的铺垫，详细`switch`代码段中的代码同学们可以很容易地进行理解了。接下来是
```c++
    node->lft = ret;
    node->rht =
      self(dynamic_cast<ast::UnaryExpressionContext*>(children[++i]));
    ret = node;
```
这段具体的作用是构建一个表示加法或减法操作的二元表达式树节点。这里的`node`是一个新创建的`BinaryExpr`对象，它代表了一个加法或减法运算。代码的主要步骤如下：`node->lft = ret;`：这行代码将`node`的左子节点(`lft`)设置为之前计算的表达式结果`ret`。在加法或减法表达式中，`ret`可以是前一个操作的结果，或者如果这是第一个操作，则是第一个操作数。`node->rht = self(dynamic_cast<ast::UnaryExpressionContext*>(children[++i]));`：这行代码处理加法或减法运算的右侧表达式。它首先通过`children[++i]`获取下一个子节点（即右侧的操作数），然后将这个子节点强制转换为`UnaryExpressionContextContext`类型，表示这是一个`UnaryExpression`。这个转换后的节点被传递给当前函数的递归调用`self()`，以解析这个子表达式并获取其计算结果。这个结果随后被设置为`node`的右子节点(`rht`)。

介绍完同学们拿到的代码中的`Expr* Ast2Asg::operator()(ast::AdditiveExpressionContext* ctx)`函数之后，我们在前面提到了:在`SYsUParser.g4`中修改了已有的规则就需要在`Ast2Asg.cpp`中对应的处理函数处做修改。如果在`SYsUParser.g4`中添加了新的规则就需要在`Ast2Asg.cpp`中添加新的处理函数。

由于我们将

```c++
additiveExpression
    :   unaryExpression ((Plus|Minus) unaryExpression)*
    ;
```

修改为了
```c++
additiveExpression
    :   multiplicativeExpression ((Plus|Minus) multiplicativeExpression)*
    ;
```

所以我们需要将
```c++
Expr*
Ast2Asg::operator()(ast::AdditiveExpressionContext* ctx)
{
  auto children = ctx->children;
  Expr* ret = self(dynamic_cast<ast::UnaryExpressionContext*>(children[0]));

  for (unsigned i = 1; i < children.size(); ++i) {
    auto node = make<BinaryExpr>();

    auto token = dynamic_cast<antlr4::tree::TerminalNode*>(children[i])
                   ->getSymbol()
                   ->getType();
    switch (token) {
      case ast::Plus:
        node->op = node->kAdd;
        break;

      case ast::Minus:
        node->op = node->kSub;
        break;

      default:
        ABORT();
    }

    node->lft = ret;
    node->rht = self(dynamic_cast<ast::UnaryExpressionContext*>(children[++i]));
    ret = node;
  }

  return ret;
}
```
修改成为
```c++
Expr*
Ast2Asg::operator()(ast::AdditiveExpressionContext* ctx)
{
  auto children = ctx->children;
  // assert(dynamic_cast<ast::UnaryExpressionContext*>(children[0]));
  Expr* ret =
    self(dynamic_cast<ast::MultiplicativeExpressionContext*>(children[0]));

  for (unsigned i = 1; i < children.size(); ++i) {
    auto node = make<BinaryExpr>();

    auto token = dynamic_cast<antlr4::tree::TerminalNode*>(children[i])
                   ->getSymbol()
                   ->getType();
    switch (token) {
      case ast::Plus:
        node->op = node->kAdd;
        break;

      case ast::Minus:
        node->op = node->kSub;
        break;

      default:
        ABORT();
    }

    node->lft = ret;
    node->rht =
      self(dynamic_cast<ast::MultiplicativeExpressionContext*>(children[++i]));
    ret = node;
  }

  return ret;
}
```
并且由于我们在`SYsUParser.g4`文件中添加了
```c++
multiplicativeExpression
    :   unaryExpression ((Star|Div|Mod) unaryExpression)*
    ;
```

所以我们需要对应地在`Ast2Asg.cpp`添加
```c++
Expr*
Ast2Asg::operator()(ast::MultiplicativeExpressionContext* ctx)
{
  auto children = ctx->children;
  Expr* ret = self(dynamic_cast<ast::UnaryExpressionContext*>(children[0]));

  for (unsigned i = 1; i < children.size(); ++i) {
    auto node = make<BinaryExpr>();

    auto token = dynamic_cast<antlr4::tree::TerminalNode*>(children[i])
                   ->getSymbol()
                   ->getType();
    switch (token) {
      case ast::Star:
        node->op = node->kMul;
        break;

      case ast::Div:
        node->op = node->kDiv;
        break;

      case ast::Mod:
        node->op = node->kMod;
        break;

      default:
        ABORT();
    }

    node->lft = ret;
    node->rht = self(dynamic_cast<ast::UnaryExpressionContext*>(children[++i]));
    ret = node;
  }

  return ret;
}
```
以及在`Ast2Asg.hpp`中添加
```c++
 Expr* operator()(ast::MultiplicativeExpressionContext* ctx);
```

最后做一个简单的总结，需要同学们进行修改的代码文件有

```bash
/task/2/antlr/SYsULexer.tokens
/task/2/antlr/SYsULexer.cpp
/task/2/antlr/SYsUParser.g4
/task/2/antlr/Ast2Asg.cpp
/task/2/antlr/Ast2Asg.hpp
```
并且`common`文件夹中的代码不需要进行修改。

需要同学们做的事情有两个

1. 同学们首先需要填写`/task/2/antlr/SYsULexer.tokens`中所有测试样例需要用到的`token`名字，在构建项目之后`/build/task/2/antlr/SYsULexer.tokens.hpp`中会自动生成一些`k`字母开头的`constexper`定义，最后在`/task/2/antlr/SYsULexer.cpp`中对应位置添加`clang`风格的`token`名字（也就是`answer.txt`每行的第一个单词）与`k`开头的`token`名字的映射就完成了我们的第一个任务。

2. 在`SYsUParser.g4`中修改了已有的规则就需要在`Ast2Asg.cpp`中对应的处理函数处做修改。如果在`SYsUParser.g4`中添加了新的规则就需要在`Ast2Asg.cpp`中添加新的处理函数。并且如果`Ast2Asg.cpp`中有新增函数，`hpp`文件需要同步更新。

