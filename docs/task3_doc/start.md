# 上手教程

本次实验中需要同学们修改的代码只有`EmitIR.cpp`和`EmitIR.hpp`。和实验二中一样，对于某一种语法结构，我们可能需要添加一个处理函数，其中这个函数的主体我们需要在`EmitIR.cpp`中编写，同时将其函数声明写到`EmitIR.hpp`中。接下来通过带领大家完善代码，通过测试样例二，让同学们了解完成实验的过程，帮助大家快速上手。

---

测例 1 和测例 2 的源代码如下，

```c
// 000_main.sysu.c
int main(){
  return 3;
}

// 001_var_defn.sysu.c
int a=3;
int b=5;
int main(){
  return a + b;
}
```

对比两份代码在实验二中的标准答案，也即 JSON 文件：

![task2_answer](../images/task3/test12_task2.png)

可以发现实际上测例 2 比测例 1 多了几种语法结构需要我们进行处理，它们分别是

- 变量声明 `VarDecl`，对应`int a=3;`
- 声明引用表达式 `DeclRefExpr`，对应`a + b` 表达式中的 `a` 和 `b`
- 加法表达式，对应`a + b`
- 隐式类型转换`ImplicitCastExpr`，在加法运算前将左值转换为右值

## 处理变量声明

第一步，处理`VarDecl`。

我们需要在对`Decl`进行处理的`operator()`重载中，加入对变量声明`VarDecl`的跳转：

```cpp
void
EmitIR::operator()(Decl* obj)
{
  // TODO: 添加变量声明处理的跳转
  if (auto p = obj->dcst<VarDecl>())
    return self(p);

  if (auto p = obj->dcst<FunctionDecl>())
    return self(p);

  ABORT();
}
```

添加了对`VarDecl`的处理跳转之后，我们需要在`EmitIR.cpp`中实现处理`VarDecl`的`operator()`重载，并在`EmitIR.hpp`中声明它。需要同学们注意的是，第二个测试样例不仅存在变量的声明，并且还存在变量的值初始化。为了使得我们的实现更加清晰简洁，我们将变量的声明和初始化分开进行实现。

此时请同学们跳转到 task3 文档中[LLVM API-全局变量-创建全局变量](task3_doc/apidoc.md#create-global-variable)部分，其中描述了创建全局变量的 API 以及相关的参数说明。

其中创建全局变量的 API 如下：

```cpp
#include <llvm/IR/GlobalVariable.h>

/// M：            llvm::Module实例，包含所有 LLVM IR 的顶层容器
///                  全局变量创建完成后将会自动插入 M 的符号表中
/// Ty：            全局变量的类型
/// isConstant：    是否是常量
/// Linkage：    全局变量的链接类型，如是否被外部函数可见
/// Initializer：初始值
/// Name：        全局变量的名字
/// 其他参数在本次实验中可以不用关注
GlobalVariable(Module &M, Type *Ty,
               bool isConstant, LinkageTypes Linkage,
               Constant *Initializer, const Twine &Name="",
               GlobalVariable *InsertBefore=nullptr,
               ThreadLocalMode=NotThreadLocal,
               std::optional< unsigned > AddressSpace=std::nullopt,
               bool isExternallyInitialized=false);
```

利用全局构造函数进行初始化的过程如下：

```cpp
/// 举个简单的例子，例如：int a = 10

/// 1. 创建全局变量，并为全局变量暂时先指定零初始化
llvm::Type *ty = llvm::Type::getInt32Ty(TheContext);
llvm::GlobalVariable *gloVar =
    new llvm::GlobalVariable(TheModule, ty, false, /* Not constant */
                             llvm::GlobalValue::ExternalLinkage,
                             nullptr /* 初始值为 nullptr */, "glolVar");
/// 零初始化
gloVar->setInitializer(llvm::Constant::getNullValue(ty));

/// 2. 创建函数，完成为全局变量进行初始化的逻辑
/// 函数返回值为 void，无参数
/// 函数名字为 ctor
llvm::Function *ctorFunc = llvm::Function::Create(
    llvm::FunctionType::get(llvm::Type::getVoidTy(TheContext), false),
    llvm::GlobalValue::PrivateLinkage, "ctor", &TheModule);
/// 为函数 ctorFunc 创建 entry 基本块
llvm::BasicBlock *entryBlock = llvm::BasicBlock::Create(TheContext, "entry", ctorFunc);
/// 设置 LLVM IR 插入点为 entry 基本块
TheBuilder.SetInsertPoint(entryBlock);
/// 创建 store 指令将常量1存入全局变量 gloVar
TheBuilder.CreateStore(llvm::ConstantInt::get(llvm::Type::getInt32Ty(TheContext), 10), gloVar);

/// 3. 将函数添加至模块 TheModule 的全局构造函数数组中,65535为优先级
///    优先级数值越大执行时间越靠后，优先级数值最大值为65535
///    模块被加载时，全局构造函数数组中的全局构造函数将按照优先级依次执行
llvm::appendToGlobalCtors(TheModule, ctorFunc, 65535);

```

所以最终我们写出的处理全局变量声明以及初始化的两个函数如下

```cpp
void
EmitIR::trans_init(llvm::Value* val, Expr* obj)
{
  auto& irb = *mCurIrb;

  // 仅处理整数字面量的初始化
  if (auto p = obj->dcst<IntegerLiteral>()) {
    auto initVal = llvm::ConstantInt::get(self(p->type), p->val);
    irb.CreateStore(initVal, val);
    return;
  }

  // 如果表达式不是整数字面量，则中断编译
  ABORT();
}

void
EmitIR::operator()(VarDecl* obj)
{

  auto ty = llvm::Type::getInt32Ty(mCtx); // 直接使用 LLVM 的 int32 类型
  auto gvar = new llvm::GlobalVariable(
    mMod, ty, false, llvm::GlobalVariable::ExternalLinkage, nullptr, obj->name);

  obj->any = gvar;

  // 默认初始化为 0
  gvar->setInitializer(llvm::ConstantInt::get(ty, 0));

  if (obj->init == nullptr)
    return;

  // 创建构造函数用于初始化
  mCurFunc = llvm::Function::Create(
    mCtorTy, llvm::GlobalVariable::PrivateLinkage, "ctor_" + obj->name, mMod);
  llvm::appendToGlobalCtors(mMod, mCurFunc, 65535);

  auto entryBb = llvm::BasicBlock::Create(mCtx, "entry", mCurFunc);
  mCurIrb->SetInsertPoint(entryBb);
  trans_init(gvar, obj->init);
  mCurIrb->CreateRet(nullptr);
}
```

然后在`EmitIR.hpp`中添加如下内容

```cpp
void operator()(asg::VarDecl* obj)
```

至此，我们以及完成了对变量声明的处理。

## 处理表达式

第二步，处理`DeclRefExpr`、`ImplicitCastExpr` 和 `BinaryExpr`三个表达式。

首先在`EmitIR.hpp`加入以下函数声明：

```cpp
llvm::Value* operator()(asg::BinaryExpr* obj);
llvm::Value* operator()(asg::ImplicitCastExpr* obj);
llvm::Value* operator()(asg::DeclRefExpr* obj);
```

然后在`EmitIR.cpp`的重载函数`EmitIR::operator()(Expr* obj)`中添加如下跳转处理，

```cpp
llvm::Value*
EmitIR::operator()(Expr* obj)
{
  // TODO: 在此添加对更多表达式处理的跳转
  if (auto p = obj->dcst<IntegerLiteral>())
    return self(p);

  if (auto p = obj->dcst<DeclRefExpr>())
    return self(p);

  if (auto p = obj->dcst<ImplicitCastExpr>())
    return self(p);

  if (auto p = obj->dcst<BinaryExpr>())
    return self(p);

  ABORT();
}
```

---

接着实现`ImplicitCastExpr`的`operator()`重载：

```cpp
llvm::Value*
EmitIR::operator()(ImplicitCastExpr* obj)
{
  auto sub = self(obj->sub);

  auto& irb = *mCurIrb;
  switch (obj->kind) {
    case ImplicitCastExpr::kLValueToRValue: {
      auto ty = self(obj->sub->type);
      auto loadVal = irb.CreateLoad(ty, sub);
      return loadVal;
    }

    default:
      ABORT();
  }
}
```

来逐行解释一下：

- `auto sub = self(obj->sub)`

  - `obj->sub` 获取 `ImplicitCastExpr` 中包含的子表达式，即要进行类型转换的表达式。
  - `self(obj->sub)` 调用 `EmitIR` 类的另一个重载运算符，用于处理子表达式并返回其在 LLVM IR 中的表示。

- `auto& irb = *mCurIrb`：

  - `mCurIrb` 是指向当前 LLVM IR 构建器（`IRBuilder`）的指针。`IRBuilder` 是一个辅助类，用于生成 LLVM IR 指令。
  - 通过解引用获取当前 IR 构建器的引用，用于在接下来的代码中方便地生成各种 LLVM IR 指令。

- `switch` 语句：

  处理不同类型的隐式转换。这里只处理了 `ImplicitCastExpr::kLValueToRValue` 一种情况，也即将一个左值（例如变量的地址）转换为一个右值（例如变量的内容）。这在 C++中很常见，比如在表达式中使用变量时通常需要获取这个变量的值而非变量本身。

  - `auto ty = self(obj->sub->type)`：获取子表达式的类型，并调用 `self` 方法将类型转换为 LLVM IR 中对应的类型表示。
  - `auto loadVal = irb.CreateLoad(ty, sub)`：
    - 使用 IR 构建器创建一个 `load` 指令（参考[LLVM API-局部变量-load 指令](task3_doc/apidoc.md#load-instruction)），从由 `sub` 指定的地址（子表达式的结果，即一个左值）加载一个值。
    - `ty` 指定了加载值的类型，确保正确地解释内存中的数据。
  - `return loadVal`： 将加载的值（现在是一个右值）作为函数的返回值。

由此，这段代码就实现了从左值到右值的隐式类型转换。

---

接下来实现处理`DeclRefExpr`的`operator()`重载：

```cpp
llvm::Value*
EmitIR::operator()(DeclRefExpr* obj)
{
  // 在LLVM IR层面，左值体现为返回指向值的指针
  // 在ImplicitCastExpr::kLValueToRValue中发射load指令从而变成右值
  return reinterpret_cast<llvm::Value*>(obj->decl->any);
}
```

---

最后处理加法表达式。在进行这一小节的代码编写之前，同学们也需要先提前查阅[LLVM API-二元表达式-整数加法+](task3_doc/apidoc.md#integer-addition)。具体的实现如下：

```cpp
llvm::Value*
EmitIR::operator()(BinaryExpr* obj)
{
  llvm::Value *lftVal, *rhtVal;

  lftVal = self(obj->lft);

  auto& irb = *mCurIrb;
  rhtVal = self(obj->rht);
  switch (obj->op) {
    case BinaryExpr::kAdd:
      return irb.CreateAdd(lftVal, rhtVal);

    default:
      ABORT();
  }
}
```

来逐行解释一下：

- `llvm::Value *lftVal, *rhtVal`: 定义两个指向 `llvm::Value` 的指针，分别用来存储二元表达式左侧和右侧子表达式的结果。

- `lftVal = self(obj->lft)`: 调用 `self()` 函数（或方法）来处理左侧子表达式 (`obj->lft`)，并获取其在 LLVM IR 中的表示。`self()` 函数处理各种类型表达式，并返回其 IR 表示。

- `auto& irb = *mCurIrb`: 通过解引用 `mCurIrb` 指针获取当前的 `IRBuilder` 实例的引用。

- `rhtVal = self(obj->rht)`: 与处理左侧子表达式类似，调用 `self()` 函数处理右侧子表达式 (`obj->rht`)，获取其 IR 表示。

- `switch` 语句：根据表达式的操作符 (`obj->op`) 决定如何处理表达式。
  - `case BinaryExpr::kAdd`: 对于加法操作符 `kAdd`，使用 `irb.CreateAdd(lftVal, rhtVal)` 生成一个加法指令。
  - `CreateAdd()` 是 `IRBuilder` 类的一个方法，它接受两个 `llvm::Value*` 类型的参数，生成一个新的加法指令，并返回结果的 IR 表示。

## 结果

至此，针对样例 2，我们已经实现了所有所需的处理函数。运行评分脚本，应该能得到如下图所示的评分结果。恭喜你同学！测例二获得满分！

![test2ok](../images/task3/test2ok.jpg)
