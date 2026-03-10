在本实验的 `common` 文件夹下存在如下几个代码文件：

```bash
common/
├── Asg2Json.cpp
├── Asg2Json.hpp
├── Obj.cpp
├── Obj.hpp
├── Typing.cpp
├── Typing.hpp
├── asg.cpp
└── asg.hpp
```

这几个文件是无论使用 ANTLR 还是使用 Bison 进行实验二的实现都会用到的代码，接下来，我们依次介绍。

注：虽然接下来介绍的实际上都是“结构体”，但是为了表述方便，我们都称呼为“类”。

## Obj

`Obj` 类及相关的结构是一个为内存管理和类型系统设计的框架。这个框架的设计目的是为了在 ASG 构建和操作过程中，提供一个灵活、高效的内存管理和类型标注体系。

### Obj 类

`Obj` 类是所有对象的基类，它定义了一套通用的接口和一些基本的属性。这个设计允许在 ASG 中不同种类的节点之间进行通用操作，同时提供了标准的内存管理和类型识别机制。

主要特性和成员

- `any`：这是一个 `void*` 指针，可以用来存储任意类型的数据。这提供了一种灵活的方式，让不同的 ASG 节点可以附加额外的信息或状态。
- `__next__`：这是一个指向下一个`Obj`对象的指针。这样`Obj`对象形成一个链表结构，方便管理所有创建的对象，特别是垃圾回收机制。

### Obj::Mgr 类

`Obj::Mgr` 类是一个对象管理器，负责管理所有通过它创建的 `Obj` 派生对象的生命周期。它使用标记-清除算法来实现垃圾回收，防止内存泄漏。

垃圾回收机制涉及以下两个成员：

- `gc()`：执行垃圾回收。这个方法首先标记所有从根对象可达的对象，然后清扫那些未被标记的对象。
- `__mark__()`：这是一个虚函数，用于标记过程中递归标记所有可达的对象。

### Obj::Walked 类

`Obj::Walked` 是一个辅助类，用于检测和防止在对象图遍历过程中发生的循环引用问题。通过在遍历开始时构造`Obj::Walked` 实例，并在遍历结束时自动析构，它可以暂时修改对象的状态来标记已访问的对象，从而避免无限循环。例如在对 ASG 进行深度优先搜索（DFS）等操作时，`Obj::Walked` 可以确保每个节点只被访问一次，即使图中存在循环引用。

---

总的来说，在 ASG 构建和操作过程中，所有的节点都继承自 `Obj` 类，确保了类型的统一和内存的可管理性。`Obj::Mgr`实例作为对象的容器和管理者，控制着所有对象的生命周期，并提供垃圾回收机制。在遍历或分析`ASG`时，`Obj::Walked` 用于保护遍历算法不会因循环引用而陷入死循环。

感兴趣的同学还可以看看这篇由本实验的总工程师[顾宇浩](https://yhgu2000.github.io/)师兄写的[博客](https://yhgu2000.github.io/posts/%E4%B8%AD%E5%B1%B1%E5%A4%A7%E5%AD%A6SYsUlang%E5%AE%9E%E9%AA%8C%E6%94%BB%E7%95%A5/)，来了解更多内容。

## asg

`asg` 命名空间中定义了一系列类和函数，它们构成了将 AST 转换为抽象语法图 ASG 以及将 ASG 转为 JSON 的基础。ASG 是源代码抽象语法树 AST 的进一步抽象，旨在提供更丰富的语义表示，以便进行类型检查、优化等编译阶段的处理。以下是这部分代码的详细介绍：

### 核心类

1. `TranslationUnit` 类:

   - 代表整个程序或一个编译单元，是 ASG 的根节点。
   - 包含多个 `Decl` 类型的成员，代表在全局范围内声明的变量和函数。

2. `Decl` 类:

   - 是声明的基类，声明包括变量声明和函数声明等。
   - 具体的声明类由`Decl`类派生而来，例如 `VarDecl` 和 `FunctionDecl`等。

3. `Expr` 类:

   - 是表达式的基类，表达式包括字面量、二元运算、函数调用等。
   - 具体的表达式类由`Expr`类派生而来，例如 `IntegerLiteral`、`BinaryExpr` 和 `CallExpr`等。

4. `Stmt` 类:

   - 是语句的基类，语句包括表达式语句和复合语句等。
   - 具体的语句类由`Stmt`类派生而来，例如 `ExprStmt` 和 `CompoundStmt`等。

5. `Type` 类和 `TypeExpr` 类:

   - 这两者都用于表示节点的类型信息，包括基本类型和复合类型。
   - `TypeExpr` 类用于更复杂的类型表达，如数组和函数类型。

### 类之间的关系

- 从属关系：`TranslationUnit` 作为 ASG 的根节点，包含一系列的 `Decl` 实例，如 `VarDecl` 和 `FunctionDecl`，这些`Decl`实例代表全局声明的变量和函数。`Decl`实例中可能会包含对表达式的引用，例如函数返回类型或者变量初始化表达式，从而关联到 `Expr` 类及其派生类。
- 包含关系：`FunctionDecl` 类会包含 `Stmt` 类的实例，特别是复合语句 `CompoundStmt`以表示函数体。`CompoundStmt` 再包含更多的 `Stmt` 实例，形成一个语句树，这些语句可能是表达式语句 `ExprStmt`，或者是其他复合语句，形成层次结构。
- 引用关系：表达式类（`Expr` 类及其派生类）可能会（通过 `DeclRefExpr` 类）引用声明类，表示变量的使用或函数的调用。同时，表达式之间也会形成树状结构，如 `BinaryExpr` 的左右子表达式。

## Typing

`Typing` 类及其相关函数用来在 ASG 中进行类型推导和检查。`Typing` 类通过遍历 ASG 节点并分析其语义，填充或确认节点的类型信息，以便于后续的代码生成或其他分析阶段使用。接下来是对 `Typing` 类的详细介绍。

### 主要职责

1. **类型推导**：对 ASG 中的表达式和变量进行类型推导，确定它们的具体类型。
2. **类型检查**：确认代码中的类型使用是否正确，例如赋值操作的左右两侧类型是否兼容。
3. **类型转换**：根据需要插入隐式或显式的类型转换，保证操作的类型安全。

### 核心成员和方法

核心成员：

- `Obj::Mgr& mMgr`：对象管理器的引用，用于在类型推导过程中创建新的类型或表达式对象。
- `Type::Cache mTypeCache`：类型缓存，用于存储和复用类型实例，避免重复创建相同的类型对象。

核心方法

- `operator()(TranslationUnit* tu)`：对整个翻译单元进行类型推导。这是类型推导过程的入口点。
- `operator()(Expr* obj)`：对表达式进行类型推导。这个方法会根据表达式的种类调用更具体的处理函数。
- `operator()(Stmt* obj)`：对语句进行类型处理，确保语句中使用的表达式类型正确。
- `operator()(Decl* obj)`：对声明进行类型推导和检查，包括变量声明和函数声明。
- `ensure_rvalue(Expr* exp)`：确保表达式为右值，如果需要，进行左值到右值的转换。
- `promote_integer(Expr* exp, Type::Spec to = Type::Spec::kInt)`：进行整数提升，将小于 `int` 类型的整数类型提升为 `int` 或更大的整数类型。
- `assignment_cast(Expr* lft, Expr* rht)`：对赋值操作的右侧进行类型转换，确保与左侧类型兼容。

### 类型推导

在处理表达式时，`Typing` 类会根据表达式的类型进行分派，调用对应的处理函数。例如，对于整数字面量 `IntegerLiteral`，它会确定字面量的类型，判断是用 `int` 表示就够了，还是需要如 `long long`这样更大的类型。

```cpp
Expr* Typing::operator()(IntegerLiteral* obj) {
  // 确定字面量类型
  Type::Spec spec;
  if (obj->val <= INT32_MAX) {
    spec = Type::Spec::kInt;
  } else {
    spec = Type::Spec::kLongLong;
  }

  obj->type = mTypeCache(spec, Type::Qual{.const_ = true}, nullptr);
  obj->cate = Expr::Cate::kRValue;
  return obj;
}

```

### 类型检查与转换

对于赋值操作，Typing 会检查左右两侧的类型是否兼容，并在需要时插入隐式类型转换：

```cpp
Expr* Typing::assignment_cast(Expr* lft, Expr* rht) {
  // 检查类型兼容性，并进行必要的类型转换
  if (lft->type->spec != rht->type->spec) {
    auto cst = make<ImplicitCastExpr>();
    cst->kind = cst->kIntegralCast;
    cst->type = lft->type;
    cst->sub = rht;
    rht = cst;
  }
  return rht;
}

```

---

一个常见的隐式类型转换是利用声明过的变量初始化一个变量：

```cpp
int a = 1;
int b = a;
```

第二行生成 ASG 时，等式右侧的`a`要首先套一层`DeclRefExpr`，表示对已声明变量的引用，再套一层`kLValueToRValue`类型的`ImplicitCastExpr`，表示将左值转换为右值（`a`这个变量名本身是一个左值，表示地址，我们这里需要`a`的值）。

---

另一个`Typing`类处理的细节是，对于空初始化列表：

```cpp
int a[4][2] = {};
```

右侧本来是`list`为空的`InitListExpr`，`Typing`类会将其转换为一个`ImplicitInitExpr`。但是最终打印为 JSON 时，仍然会打印为`InitListExpr`，只是没有`inner`：

```json
{
  "kind": "VarDecl",
  "name": "a",
  "type": {
    "qualType": "int[4][2]"
  },
  "inner": [
    {
      "kind": "InitListExpr",
      "type": {
        "qualType": "int[4][2]"
      },
      "valueCategory": "prvalue"
    }
  ]
}
```

相对的，用非空初始化列表初始化：

```cpp
int b[4][2] = {1, 2, 3, 4, 5, 6, 7, 8};
```

生成的 JSON 应该像下面这样：

```json
{
"kind": "VarDecl",
"name": "b",
"type": {
"qualType": "int[4][2]"
},
"inner": [
{
"kind": "InitListExpr",
"type": {
  "qualType": "int[4][2]"
},
"valueCategory": "prvalue",
"inner": [
  {
    "kind": "InitListExpr",
    "type": {
      "qualType": "int[2]"
    },
    "valueCategory": "prvalue",
    "inner": [
      {
        "kind": "IntegerLiteral",
        "type": {
          "qualType": "int"
        },
        "valueCategory": "prvalue",
        "value": "1"
      },
\\...
```

---

这些方法使得 `Typing` 类可以灵活地处理各种类型相关的语义规则，包括基本的类型推导、类型兼容性检查和必要的类型转换。通过将这些功能集中在 `Typing` 类中，代码的其余部分可以在不直接处理复杂类型规则的情况下，进行语义分析和代码生成。

如果同学们想要了解更多关于本实验类型系统的设计，可以看看这篇文章——[类型、类型检查与推导](https://github.com/arcsysu/YatCC/blob/main/docs/gyh-manual/%E7%B1%BB%E5%9E%8B%E3%80%81%E7%B1%BB%E5%9E%8B%E6%A3%80%E6%9F%A5%E4%B8%8E%E6%8E%A8%E5%AF%BC.md)

[这个路径](https://github.com/arcsysu/YatCC/tree/main/docs/gyh-manual)下的其他文章也很值得一读，同学们会发现它们都深入到这个实验的底层设计理念，显得相当硬核，但相信它们会给同学们做实验时带来启发。不过需要注意的是，其中的一些信息可能已经过时。

## Asg2Json

`Asg2Json.cpp` 和 `Asg2Json.hpp` 定义了一个 `Asg2Json` 类，其作用是是将抽象语法图 ASG 转换为 JSON 格式的表示。这样的转换使得 ASG 的结构可以以文本形式展示，便于调试、可视化和进一步的处理。

### 主要职责

1. 进行转换：提供将 ASG 中不同节点（如声明、表达式、语句等）转换为 `json::Object` 对象的逻辑。
2. 输出格式化：生成的 JSON 格式化输出，使其易于阅读和理解。
3. 递归处理：能够递归处理 ASG 中的复杂结构，如函数内部的语句和表达式。

### operator() 重载

`Asg2Json` 类为 ASG 中的各种节点类型提供了 `operator()` 的重载，每个重载负责处理一种特定类型的节点，并将其转换为`json::Object`对象。

- `json::Object operator()(TranslationUnit* tu)`：用于处理整个翻译单元，作为转换的入口点。

- `json::Object operator()(Expr* obj)`：用于处理表达式。它会根据具体的表达式类型（通过动态类型识别）调用相应的处理函数。

- `json::Object operator()(Stmt* obj)`：用于处理语句，它会根据具体的语句类型调用相应的处理函数。

- `json::Object operator()(Decl* obj)` 用于处理声明。它会根据具体的声明类型（如变量声明或函数声明）调用相应的处理函数。

每种具体的表达式和语句类型（如 `IntegerLiteral`, `BinaryExpr`, `CompoundStmt` 等）都有对应的处理方法，这些方法生成代表该节点的`json::Object`对象，并递归地处理节点的子节点（如果有）。

## Ast2Asg 类

### 类定义

`Ast2Asg` 类是 ANTLR 代码框架中类，定义在`antlr/Ast2Asg.hpp`中，负责将由 ANTLR 解析器生成的 AST 转换为更方便处理的 ASG 形式。Bison 框架中，也有相同作用的东西，不过没有封装为一个类，都定义在了命名空间`par`中，可以查看`/bison/par.hpp`文件。

整体上，`Ast2Asg.cpp` 中定义的 `Ast2Asg` 类通过这些方法实现了从 `ANTLR` 的 AST 到 ASG 的转换，涵盖了编程语言的主要构造：表达式、语句、声明和函数定义。转换过程中，它还处理了类型信息和作用域信息，为后续的语义分析和代码生成提供了基础。

接下来以`antlr/Ast2Asg.hpp`中的定义为例，介绍 `Ast2Asg` 类的主要成员和方法：

```cpp
class Ast2Asg
{
public:
  Obj::Mgr& mMgr;

  Ast2Asg(Obj::Mgr& mgr)
    : mMgr(mgr)
  {
  }

  using SpecQual = std::pair<Type::Spec, Type::Qual>;

  // 此处省略若干个 operator() 的重载

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

- `Obj::Mgr& mMgr` 是对对象管理器的引用，用于创建和管理 AST 节点对象。
- `operator()` 方法被重载多次，每个重载对应处理 AST 中不同节点类型的转换逻辑。
- `SpecQual` 是一个类型别名，用于表示变量或函数的类型和限定符。
- `Symtbl` 结构是一个符号表，用于在转换过程中管理作用域内的符号信息。
- `mSymtbl` 成员指向当前的符号表，`mCurrentFunc` 指向当前正在处理的函数声明，以便在处理表达式时可以访问函数的上下文信息。
- `make<T>()` 模板函数用于通过对象管理器创建新的 AST 节点对象。

`Ast2Asg` 类的方法主要负责将 AST 中的每个节点转换为 ASG 的对应表示。包括但不限于：

- 处理整个编译单元（`TranslationUnit`）。
- 转换类型说明符（`DeclarationSpecifiersContext`）和声明符（`DeclaratorContext`、`DirectDeclaratorContext`）。
- 转换各种表达式（如`AssignmentExpressionContext`、`AdditiveExpressionContext`等）。
- 转换语句（`StatementContext`、`CompoundStatementContext`等）。
- 转换声明和函数定义（`DeclarationContext`、`FunctionDefinitionContext`等）。

### 成员函数

下面这个函数负责处理整个编译单元（通常是一个文件），它接收 ANTLR 生成的 `TranslationUnitContext` 对象作为参数，这个对象代表了整个文件的 AST 根节点。

```cpp
TranslationUnit*
Ast2Asg::operator()(ast::TranslationUnitContext* ctx)
{
  auto ret = make<asg::TranslationUnit>();
  if (ctx == nullptr)
    return ret;

  Symtbl localDecls(self);

  for (auto&& i : ctx->externalDeclaration()) {
    if (auto p = i->declaration()) {
      auto decls = self(p);
      ret->decls.insert(ret->decls.end(),
                        std::make_move_iterator(decls.begin()),
                        std::make_move_iterator(decls.end()));
    }

    else if (auto p = i->functionDefinition()) {
      auto funcDecl = self(p);
      ret->decls.push_back(funcDecl);

      // 添加到声明表
      localDecls[funcDecl->name] = funcDecl;
    }

    else
      ABORT();
  }

  return ret;
}
```

1. 首先，它创建了一个 `asg::TranslationUnit` 对象，这对应 ASG 的根节点。
2. 然后，通过遍历 AST 中的所有外部声明（`externalDeclaration`），将它们转换为 ASG 中的声明和函数定义，并添加到 `asg::TranslationUnit` 的声明列表中。
3. 如果遇到函数定义，还会将函数名添加到当前作用域的符号表中。

---

下面这个函数处理变量或函数的类型说明符和类型限定符。类型说明符（Specifier），用于指定变量或函数的基本类型或存储类别，例如`int`、`float`、`static`等。类型限定符（Qualifier），用于修饰类型的属性，例如 `const` 或 `volatile`等。

```cpp
Ast2Asg::SpecQual
Ast2Asg::operator()(ast::DeclarationSpecifiersContext* ctx)
{
  SpecQual ret = { Type::Spec::kINVALID, Type::Qual() };

  for (auto&& i : ctx->declarationSpecifier()) {
    if (auto p = i->typeSpecifier()) {
      if (ret.first == Type::Spec::kINVALID) {
        if (p->Int())
          ret.first = Type::Spec::kInt;
        else
          ABORT(); // 未知的类型说明符
      }

      else
        ABORT(); // 未知的类型说明符
    }
    else
      ABORT();
  }

  return ret;
}
```

它遍历 AST 节点中的所有类型说明符，确定变量或函数的类型，并返回一个包含类型说明符和类型限定符的 `SpecQual` 对象。

---

部分 `operator()` 重载的简要说明：

```cpp
std::pair<TypeExpr*, std::string> Ast2Asg::operator()(ast::DeclaratorContext* ctx, TypeExpr* sub)
// 这个方法处理声明符（declarator）。它可能包含数组、函数等更复杂的类型信息。
// 方法接收一个声明上下文和可能的子类型表达式（例如数组的元素类型），并返回一个包含类型表达式和变量名的pair。


Expr* Ast2Asg::operator()(各种表达式的Context* ctx)
// 这些方法处理AST中的各种表达式类型（如赋值表达式、二元表达式、一元表达式等）。实现了将AST中的表达式节点转换为ASG节点的转换逻辑。
// 例如，Expr* Ast2Asg::operator()(ast::AssignmentExpressionContext* ctx) 处理赋值表达式，创建并返回一个表示赋值的 Expr 节点。


Stmt* Ast2Asg::operator()(ast::StatementContext* ctx) 和 CompoundStmt* Ast2Asg::operator()(ast::CompoundStatementContext* ctx)
// 这些方法处理AST中的语句和复合语句。

operator()(ast::StatementContext* ctx)
// 根据语句类型调用相应的转换方法。

operator()(ast::CompoundStatementContext* ctx)
// 转换复合语句，处理其中的每一条语句或声明，并创建一个 CompoundStmt 节点。


std::vector<Decl*> Ast2Asg::operator()(ast::DeclarationContext* ctx)
FunctionDecl* Ast2Asg::operator()(ast::FunctionDefinitionContext* ctx)
// 这些方法处理声明和函数定义。

operator()(ast::DeclarationContext* ctx)
// 转换变量声明，创建 Decl 节点的列表。

operator()(ast::FunctionDefinitionContext* ctx)
// 处理函数定义，创建一个 FunctionDecl 节点，并处理函数体和参数。
```

### Symtbl

在`/bison/par.hpp`或`/antlr/Ast2Asg.cpp`中，定义了一个`Symtbl`结构体。以后者中的定义为例：

```cpp
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

`Symtbl` 用于实现符号表，它继承自 `std::unordered_map<std::string, Decl*>`，键是符号名称，值是指向声明节点的指针，由于保存当前作用域内所有声明的符号及其对应的节点之间的映射。

`Symtbl`持有外层 `Ast2Asg` 对象的引用 `m`，以便于访问其成员。`mPrev` 是指向上一个符号表的指针，用于实现作用域的嵌套。

`Symtbl`的构造函数，接收一个 `Ast2Asg` 对象的引用`m`，让自己的`mPrev`指向旧的符号表`m.mSymtbl`，然后将自身（一个新的符号表实例）设置为当前符号表`m.Symbtl=this`。析构函数中，则将符号表恢复到上一个符号表。

`Symtbl::resolve()`方法用于在符号表中查找给定名称的符号的声明，如果当前作用域中没有找到，会递归地前往上一个作用域中查找。其接收一个`const std::string& name`，表示需要查找的符号名称；返回指向`Decl*`类型的指针，表示找到的符号的声明。如果给定名称的符号在任何一个作用域中都没有找到，则会触发一个断言错误。

## 类型的转换

- `std::string operator()(const Type* type)`：将类型信息转换为字符串表示，用于在 JSON 中表示变量或表达式的类型。
- `std::string operator()(TypeExpr* texp)`：处理复合类型表达式，如数组或函数类型。

## ASG 介绍

相比起 AST，在本实验中使用 ASG 更为恰当和合适。ASG 类似于 AST，只是其一种简化/变体，能够更方便的 JSON 化并输出。

### PT、AST 与 ASG

在学习了这么多编译原理的课程知识后，相信同学们已经了解了“语法解析树”和“抽象语法树”的概念。以下面这个简短的全局变量声明为例：

```cpp
int a[2] = {0, 1};
*b = a + 1;
```

我们来对比看看，在语法解析树、抽象语法树和抽象语义图中，这段代码是如何表示的。

- **语法解析树（Parse Tree，PT）**

  语法解析树包含语法解析过程中的所有非终结符号和终结符号，一个递归下降语法分析器的运行过程可以视为是对语法解析树的深度优先遍历。语法解析树通常是非常复杂和庞大的，因此一般并不会真的生成出来，例如上面的例子如果真的生成一个语法解析树，那他可能是这个样子：
  ![alt text](../images/bison/Parse_Tree.png)

  希望这张图能够让你感受到语法解析树的复杂和庞大。而实际上，上图其实已经简化了表达式相关语法规则（虚线部分），后面为我们会看到，因为运算符优先级的存在，每个表达式结点实际上都会产生出一个长长的分支链。

- **抽象语法树（Abstract Syntax Tree，AST）**

  抽象语法树通过去掉了只起到结构标识作用的结点、压缩树的层级等方式大大简化了语法解析树的结构。上面的例子对应的抽象语法树可能是：

  ![alt text](../images/bison/ast.png)

  很显然 AST 比语法解析树简单得多，ANTLR 和 Boost.Spirit 这类的语法解析器框架的输出结果往往都是这种形式。

- **抽象语义图（Abstract Semantic Graph，ASG）**

  单论名字的用法而言，大家并不是那么严格地区分“ASG”和“AST”，很多人把 ASG 的 IR 数据结构称为 AST，尽管这些数据结构的引用关系是在图上而并非树上。不过，与那些语法解析器框架相比，我们上面定义的 C++ 结构体们与之还是有很大差别的，这主要体现在语义结点的相互引用上：

  ![alt text](../images/bison/asg.png)

  相比于 AST ，我们在`declReference_1`中直接存储指向变量声明的那个语义结点指针而不是变量名，这将会给后面的分析和变换的代码编写带来极大的便利。

### 总结

其实，ASG 就是一种可以储存代码中的各个不同结构（比如，表达式，句子，声明）的一堆结构体。ASG 结构并不是必须的，只是为了在中间进行储存这些文法结构，从而之后进行 JSON 打印。这只是一种设计选择，当然也可以用其他的方式实现。
