# EmitIR 介绍

## 主要职责

`EmitIR` 类的功能就是读取 `Json2Asg` 类输出的抽象语义图 `asg::TranslationUnit`，输出 LLVM IR。

```cpp
llvm::Module& operator()(asg::TranslationUnit* tu);
```

`EmitIR` 类能够处理 ASG 中的简单节点（如表达式、语句、函数等），也能够递归处理 ASG 中的复杂结构，如函数内部的语句、复杂表达式中的子表达式等，并为它们生成相对应的 LLVM IR。

与实验二中的 `Typing` 类和 `Asg2Json` 类的方法相似，`EmitIR` 同样用重载 `operator()` 的方法，从而能够以相同的调用方式，完成对不同 ASG 节点的 LLVM IR 的生成。

在此不详细对 `EmitIR` 的每个成员函数和变量进行说明。相信大家完成了实验二后，再去看 `EmitIR` 的成员函数，应该可以很快理解这个类，也就是说哪个函数是在为哪个 ASG 节点产生 LLVM IR。

## 完善 EmitIR 类

本次实验中，助教已经实现了一个基本的 `EmitIR` 类，其仅能通过 `functional-0/000_main.sysu.c`s 这个测例。为了帮助大家更好地完成实验，助教也添加了一些 TODO 注释，提示同学们需要去做些什么。

大家可以从最基本的处理 `asg::TranslationUnit` 的函数出发：

```cpp
llvm::Module&
EmitIR::operator()(asg::TranslationUnit* tu)
{
  for (auto&& i : tu->decls)
    self(i);
  return mMod;
}
```

针对不同种类的 `Decl` ，我们需要在处理`Decl`的函数中添加相应的跳转。

```cpp
void
EmitIR::operator()(Decl* obj)
{
  // TODO: 添加变量声明处理的跳转

  if (auto p = obj->dcst<FunctionDecl>())
    return self(p);

  ABORT();
}
```

之后大家需要进一步完善处理不同 `Decl`（例如 `VarDecl` 和 `FunctionDecl`）的函数。

其它类型的实现思路也是类似的，可供参考的实现路线是： 声明(`Decl`) -> 类型(`Type`) -> 表达式(`Expr`) -> 语句(`Stmt`)

在这个过程中，大家需要善用我们提供的测试和调试功能，比对自己程序的输出以及标准，不断地进行测试，根据未通过的测例一点点查漏补缺，逐步完善 `EmitIR` 类。
