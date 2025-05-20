## LLVM IR 类型系统

[llvm::Type Class Reference](https://llvm.org/doxygen/classllvm_1_1Type.html)

[llvm::IntegerType Class Reference](https://llvm.org/doxygen/classllvm_1_1IntegerType.html)

[llvm::ArrayType Class Referece](https://llvm.org/doxygen/classllvm_1_1ArrayType.html)

[llvm::FunctionType Class Reference](https://llvm.org/doxygen/classllvm_1_1FunctionType.html)

[llvm::PointerType Class Reference](https://llvm.org/doxygen/classllvm_1_1PointerType.html)

[LLVM Type System](https://llvm.org/docs/LangRef.html#type-system)

LLVM IR 是强类型的，类型系统是 LLVM IR 中最为重要的一部分。就像我们在 c 语言中创建变量时要指定数据类型一样，当我们调用 `llvm::IRBuilder` 的接口进行各种 IR 的生成，如创建变量和函数时，类型都是不可或缺的一部分。

`llvm::Type` 是 LLVM IR 类型系统中的基类，它以及它的派生类提供了许多静态方法来创建类型实例，部分类型也可以通过 `llvm::IRBuilder` 的接口来创建。

![alt-text](https://llvm.org/doxygen/classllvm_1_1Type__inherit__graph.png)

接下来展示各种类型在 LLVM IR 中的表示，以及如何创建这些类型的实例。

### Void 类型

LLVM IR 中显示为 `void`。

```cpp
#include <llvm/IR/Type.h>
/// 省略TheContext, TheModule, TheBuilder实例的创建

/// static Type *llvm::Type::getVoidTy(LLVMContext &C);
llvm::Type *type = llvm::Type::getVoidTy(TheContext);

/// 或者
llvm::Type *type = TheBuilder.getVoidType();
```

### 1 位整数类型（bool 类型）

LLVM IR 中显示为`i1`。

```cpp
/// static IntegerType *llvm::Type::getInt1Ty(LLVMContext &C);
llvm::Type *type = llvm::Type::getInt1Ty(TheContext);

/// 或者
llvm::Type *type = TheBuilder.getInt1Ty();
```

### 32 位整数类型

LLVM IR 中显示为`i32`。

```cpp
/// static IntegerType *llvm::Type::getInt32Ty(LLVMContext &C);
llvm::Type *type = llvm::Type::getInt32Ty(TheContext);

/// 或者
llvm::Type *type = TheBuilder.getInt32Ty();
```

### 特定位数的整数类型

LLVM IR 中显示为`iN`，其中 `N` 为我们自己指定的位数。

```cpp
#include <llvm/IR/DerivedTypes.h>
unsigned NumBits = /* 指定的整数位数 */;

/// static IntegerType *llvm::IntegerType::get(LLVMContext &C, unsigned NumBits);
llvm::Type *type = llvm::IntegerType::get(TheContext, NumBits);

/// 或者
llvm::Type *type = TheBuild.getIntNTy(NumBits);
```

### 函数类型

```cpp
#include <llvm/IR/DerivedTypes.h>

/// Result：  函数返回值类型
/// Params：  函数的参数列表中各个参数的类型
/// isVarArg：为 True 时表示函数为可变参数函数，即函数的最后一个参数为 ...
/// static FunctionType *llvm::FunctionType::get(Type *Result, ArrayRef<Type *> Params, bool isVarArg);

/// 例如：void (int, int)
llvm::FunctionType *funcType = llvm::FunctionType::get(
    llvm::Type::getVoidTy(TheContext),
    {llvm::Type::getInt32Ty(TheContext), llvm::Type::getInt32Ty(TheContext)},
    false);
```

若函数没有参数时，也可以省去 `Params` 形参：

```cpp
/// static FunctionType *llvm::FunctionType::get(Type *Result, bool isVarArg);
/// 例如：int ()
llvm::FunctionType *funcType =
    llvm::FunctionType::get(llvm::Type::getVoidTy(TheContext), false);
```

有了 `llvm::FunctionType` 实例后，可以用以下方法，获取函数的相关信息：

```cpp
llvm::FunctionType *funcType = /* 获得函数类型实例指针 */;

/// True表示为可变参数函数
bool isVarArg = funcType->isVarArg();

/// 获得函数返回值类型
llvm::Type *retType = funcType->getReturnType();

/// 获得函数参数数量，不包括可变参数
unsigned num = funcType->getNumParams();

/// 获得函数第 I 个参数的类型
unsigned I = /* 第 I 个参数 */;
llvm::Type *ithParamType = funcType->getParamType(I);

/// 遍历函数参数类型
auto begin = funcType->param_begin();
while(begin != funcType->param_end()) {
  /* Do something */
  begin++;
}
```

### 数组类型

```cpp
#include <llvm/IR/DerivedTypes.h>

/// ElementType：数组元素的类型
/// NumElements：数组元素的个数
/// static ArrayType *llvm::ArrayType::get(Type *ElementType, uint64_t NumElements);

/// 例如数组：int [5][10]
/// LLVM IR 中显示为[5 x [10 x i32]]
llvm::ArrayType *arrType1D = llvm::ArrayType::get(Type::getInt32Ty(TheContext), 10);
llvm::ArrayType *arrType2D = llvm::ArrayType::get(arrType1D, 5);
```

有了 `llvm::ArrayType` 实例后，可以用以下方法，获取数组的相关信息：

```cpp
llvm::ArrayType *arrType = /* 获得数组实例指针 */;

/// 获得数组元素个数
uint64_t len = arrType->getNumElements();

/// 获得数组元素类型
llvm::Type *elementType = arrType->getElementType();
```

### 指针类型

```cpp
#include <llvm/IR/DerivedTypes.h>

/// ElementType： 指针指向的元素类型
/// AddressSpace：地址空间，0表示默认地址空间
/// static PointerType *llvm::PointerType::get(Type *ElementType, unsigned AddressSpace);

/// 例如：int *
llvm::Type *pointee = llvm::Type::getInt32Ty(TheContext);
llvm::Type *pointer = llvm::PointerType::get(pointee, 0);

/// 或者
/// 我们也可以通过被指向的类型的成员函数来获得指针类型
llvm::Type *pointer = pointee->getPointerTo();
```

在 LLVM 17 中，所有的指针类型都是[不透明指针（Opaque Pointers）](https://llvm.org/docs/OpaquePointers.html)，也即对于一个指针类型，我们无法知道其指向的类型。不管是查看生成的 LLVM IR，还是调用 `llvm::Type/PointerType` 的接口（ LLVM 17 中已经移除了 `llvm::Type/PointerType`获得指针指向类型的接口），均无法获得指针指向的类型。

例如，`int*` 在以前 LLVM 的 LLVM IR 中的表示为 `i32*`，但是在 LLVM 17 的 LLVM IR 中，则表示为 `ptr`。

### 判断是否为特定类型

当我们有了一个 llvm::Type 的实例时，可以通过下述方法判断其是否是特定类型，返回值均为 `bool` 类型：

```cpp
llvm::Type *type = /* 获得 llvm::Type 实例指针 */

/// True 表示是整数类型
bool isIntTy = type->isIntegerTy();

unsigned N = /* 整数位数 */
// True 表示是 N 位整数类型
bool isNBitsIntTy = type->isIntegerTy(N);

// True 表示是void类型
bool isVoidTy = type->isVoidTy();

// True 表示是FunctionType
bool isFunctionTy = type->isFunctionTy();

// True 表示是数组类型
bool isArrayTy = type->isArrayTy();

// True 表示是指针类型
bool isPointerTy = type->isPointerTy();
```

## 常量

[llvm::Constant Class Reference](https://llvm.org/doxygen/classllvm_1_1Constant.html)

[llvm::ConstantInt Class Reference](https://llvm.org/doxygen/classllvm_1_1ConstantInt.html)

[llvm::ConstantArray Class Reference](https://llvm.org/doxygen/classllvm_1_1ConstantArray.html)

![alt-text](https://llvm.org/doxygen/classllvm_1_1Constant__inherit__graph.png)

LLVM IR 中，对于常量的创建，与 `llvm::Type` 相同，`llvm::Constant` 及其派生类提供了许多静态方法，以工厂模式来非常容易地创建我们需要的常量。

### 创建整数常量

```cpp
#include <llvm/IR/Constants.h>

/// 返回给定整数值 V 和整数类型 Ty 的整数常量
/// Ty：      整数类型
/// V：       整数值
/// IsSigned：为 True 时表示当 Ty 的位宽大于64位时，对 V 进行有符号扩展，否则为无符号扩展
/// static ConstantInt *llvm::ConstantInt::get(IntegerType *Ty, uint64_t V, bool IsSigned = false)

/// 例如：i32 10
llvm::ConstantInt *constantInt = llvm::ConstantInt::get(llvm::Type::getInt32Ty(TheContext), 10);

/// 或者
/// 利用 llvm::IRBuilder
llvm::ConstantInt *constantInt = TheBuilder.getInt32(10);
```

### 创建数组常量 :id=create-array-constant

```cpp
#include <llvm/IR/Constants.h>

/// Ty：数组类型
/// V： 数组的元素的值，均为常量
/// static Constant *llvm::ConstantArray::get(ArrayType *Ty, ArrayRef<Constant*> V)

/// 例如：{1, 2, 3}
llvm::Constant *constantArray = llvm::ConstantArray::get(
      llvm::ArrayType::get(llvm::Type::getInt32Ty(TheContext), 3),
      {
          llvm::ConstantInt::get(llvm::Type::getInt32Ty(TheContext), 1),
          llvm::ConstantInt::get(llvm::Type::getInt32Ty(TheContext), 2),
          llvm::ConstantInt::get(llvm::Type::getInt32Ty(TheContext), 3),
      });
```

### 创建任意类型的 0 常量 :id=create-zero-constant

常用于对变量进行默认的零初始化。

```cpp
#include <llvm/IR/Constants.h>

/// Ty：类型
static Constant *llvm::Constant::getNullValue(Type *Ty);
```

## 全局变量

[llvm::GlobalVariable Class Reference](https://llvm.org/doxygen/classllvm_1_1GlobalVariable.html)

### 创建全局变量 :id=create-global-variable

创建全局变量可以使用 `llvm::GlobalVariable` 类的构造函数

```cpp
#include <llvm/IR/GlobalVariable.h>

/// M：           llvm::Module实例，包含所有 LLVM IR 的顶层容器
///               全局变量创建完成后将会自动插入 M 的符号表中
/// Ty：          全局变量的类型
/// isConstant：  是否是常量
/// Linkage：     全局变量的链接类型，如是否被外部函数可见
/// Initializer： 初始值
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

全局变量在创建时就必须被初始化，有两种初始化的方法：

1. 创建全局变量前求得其初始值，创建时即利用求得的值初始化。

2. 利用[全局构造函数（Global Constructors）](https://llvm.org/docs/LangRef.html#the-llvm-global-ctors-global-variable)，其在 `llvm::Module` 被加载的时候（程序真正的代码被执行之前）自动被执行，从而对全局变量进行初始化。

#### 方法一

在创建全局变量前，我们已经求得了其初始值，那么直接调用 `llvm::GlobalVariable` 的构造函数，将初始值作为参数传入即可：

```cpp
// 例如：int a = 10

llvm::Type *ty = llvm::Type::getInt32Ty(TheContext);
llvm::Constant *initVal =
    llvm::ConstantInt::get(llvm::Type::getInt32Ty(TheContext), 10);

llvm::GlobalVariable *gloVar = new llvm::GlobalVariable(
    TheModule, ty, false, /* Not constant */
    llvm::GlobalValue::ExternalLinkage, initVal, "glolVar");
```

生成的 LLVM IR 如下：

```llvm
@glolVar = global i32 10
```

#### 方法二

有时候全局变量的初始值难以表达为 `llvm::Constant` 的实例，比如数组的初始化或者值为表达式，此时我们可以使用全局构造函数来为全局变量进行初始化。

这个方法可以分成三步来完成：

1. 创建全局变量，并为全局变量暂时先指定零初始化；

2. 创建全局构造函数，并给该函数创建一个`entry`块，块中用一条`store`指令完成初始化（具体细节可见[函数](#function)、[基本块](#basic-block)、[store](#store-instruction)）；

3. 将函数添加至模块的全局构造函数数组中。

```cpp
/// 举个简单的例子，例如：int a = 1;

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
TheBuilder.CreateStore(llvm::ConstantInt::get(llvm::Type::getInt32Ty(TheContext), 1), gloVar);

/// 3. 将函数添加至模块 TheModule 的全局构造函数数组中,65535为优先级
///    优先级数值越大执行时间越靠后，优先级数值最大值为65535
///    模块被加载时，全局构造函数数组中的全局构造函数将按照优先级依次执行
llvm::appendToGlobalCtors(TheModule, ctorFunc, 65535);
```

生成的 LLVM IR 如下：

```llvm
@glolVar = global i32 0
@llvm.global_ctors = appending global [1 x { i32, ptr, ptr }] [{ i32, ptr, ptr } { i32 65535, ptr @ctor, ptr null }]

define private void @ctor() {
entry:
  store i32 1, ptr @glolVar, align 4
}
```

### 在模块符号表中查找全局变量

```cpp
/// gloVarName 表示全局变量的名字
llvm::GlobalVariable *gloVar = TheModule.getGlobalVariable(gloVarName);
```

## 局部变量 :id=local-variable

LLVM IR 中的的局部变量仅出现在基本块中，且均以百分号`%`开头。局部变量在 LLVM IR 中的分配方式有两种：

1. 分配给虚拟寄存器。这种局部变量多采用`%1=some operation`的形式来进行赋值，存储的是指令返回的结果，如整数加法指令：

   ```llvm
   ; 将寄存器 %4 和寄存器 %5 的值相加，它们的值均为 i32 类型，结果存储在寄存器 %6 中
   %6 = add i32 %4, %5
   ```

   每一条有返回结果的指令，其指令的结果都将直接存储在寄存器中。

2. 使用 `alloca` 指令在函数栈上进行内存分配。比如`%2=alloca i32`，表示动态分配一个能够存储 `i32` 整数的内存空间，地址存储在寄存器 `%2` 中，因此 `%2` 寄存器中存储的其实是一个指针。访问 `%2` 指向的内容或者向 `%2` 指向的地址存储数据时，需要分别用到 `load` 和 `store` 指令，而取虚拟寄存器中的值不需要使用 `load` 指令，直接使用即可。

### alloca 指令

```cpp
// Ty：要分配的内存空间的类型
// Name：局部变量的名字，若未取名，则 LLVM 自动分配
AllocaInst *CreateAlloca(Type *Ty, Value *ArraySize=nullptr, const Twine &Name="");
```

例如，对于 int a：

```cpp
TheBuilder.CreateAlloca(TheBuilder.getInt32Ty(), nullptr, "a");
```

结果如下：

```cpp
%a = alloca i32
```

局部变量 `a` 是通过 `alloca` 指令通过内存分配得到的，其类型其实为指针，也就是 `i32*`。不过之前已经提到，在 LLVM IR 中，其类型会显示为 `ptr`。

又如，对于 `int a[10][5]`：

```cpp
/// int [5]
llvm::ArrayType *arrType1D = llvm::ArrayType::get(TheBuilder.getInt32Ty(), 5);
/// int [10][5]
llvm::ArrayType *arrType2D =llvm::ArrayType::get(arrType1D, 10);

TheBuilder.CreateAlloca(arrType2D, nullptr, "a");
```

结果如下：

```llvm
%a = alloca [10 x [5 x i32]]
```

%a 存储的其实是指向 `[10 x [10 x i32]]` 类型的数组的指针。

### alloca 使用提醒

在 C 语言中，当一个花括号 `{ ... }` 中（复合语句`CompoundStmt` 中）的程序语句被执行完成后，会自动释放花括号中的局部变量。但是，在 LLVM IR 中，是不会自动释放由 `alloca` 指令分配内存的局部变量的，因此，当程序中的 `alloca` 指令执行许多次后，尤其是循环中的 `alloca` 指令，可能会造成函数栈空间不足的问题，造成程序崩溃。

例如，对于下述代码：

```c
/* Do something */

while(i < 10000) {
    int tmp = /* 创建局部变量 */;

    /* Do something */
}

/* Do something */
```

对应的 LLVM IR 如下：

```llvm
while.cond:                                       ; preds = %while.body, %entry
  ; 计算 i < 10000
  %0 = load i32, ptr %i
  %cmp = icmp slt i32 %0, 10000
  br i1 %cmp, label %while.body, label %while.end

while.body:                                       ; preds = %while.cond
  ; alloca 创建 tmp 变量
  %tmp = alloca i32
  ; Do something
  br label %while.cond

while.end:                                        ; preds = %while.cond
  ; Do something
```

1. 每次循环结束后，`tmp` 变量所占的内存空间都不会被释放；
2. 每次循环开始时，又通过 `alloca` 指令继续在栈上分配空间，创建变量 `tmp`

循环次数过多时，最终可能会导致函数的栈空间不足，程序崩溃。

对于这个问题，有下面两种解决方法：

- 将 LLVM IR 函数中所有的 `alloca` 指令都放到函数的 `entry`基本快中，使得在一开始就为之后函数中会用到的局部变量在栈上分配内存空间，这也是 clang 的做法。

- 使用 LLVM 的内建（intrinsics）函数 `llvm.stacksave` 和 `llvm.stackrestore`。在每次解析 `CompoundStmt`生成 LLVM IR 时，在开头先调用 `llvm.stacksave` 记录当前函数的栈高度；生成 LLVM IR 结束后，最后再调用 `llvm.stackrestore` 将函数的栈高度回到之前记录的高度。这样就释放了在 `CompundStmt` 中通过 `alloca` 指令分配内存创建的任何变量。

使用方法如下：

```cpp
/// 创建调用 llvm.stacksave 的指令
auto sp = TheBuilder.CreateIntrinsic(llvm::Intrinsic::stacksave, {}, {},
                                     nullptr, "sp");
/* 解析 CompoundStmt，生成 LLVM IR */

/// 创建调用 llvm.stackrestore 的指令
TheBuilder.CreateIntrinsic(llvm::Intrinsic::stackrestore, {}, {sp});
```

### store 指令 :id=store-instruction

要想将数据存储在：

1. 使用 `alloca` 指令得到的局部变量中时；
2. 某指针类型的变量指向的地址中时（其实这一点包括了第一点，因为使用 alloca 指令得到的变量，其类型也为指针）。

需要用到 `store` 指令：

```cpp
/// 将数据存储在某指针类型的变量指向的地址中
/// Val：要存储的数据
/// Ptr：指针类型的变量，指向数据要存放的地址
StoreInst *CreateStore(Value *Val, Value *Ptr, bool isVolatile=false);
```

例如，对于`int a = 10`，要将常量 10 存入局部变量 `a` 中：

```cpp
/// 1. 使用 alloca 指令创建局部变量 a
llvm::AllocaInst *a = TheBuilder.CreateAlloca(TheBuilder.getInt32Ty(), nullptr, "a");

// 2. 使用 store 指令将常量10存储到局部变量 a 中
TheBuilder.CreateStore(TheBuilder.getInt32(10), a);
```

生成的 LLVM IR 如下：

```llvm
%a = alloca i32
store i32 10, ptr %a
```

这个例子再次说明了，对于 `%a` ，LLVM IR 使用的是类型 `ptr`，也即 `%a` 的数据类型其实是指针。

### load 指令 :id=load-instruction

当我们想要取出：

1. 使用 `alloca` 指令得到的局部变量中的值
2. 某指针类型的变量指向的地址中的数据（其实这一点包括了第一点，因为使用 `alloca` 指令得到的变量，其类型也为指针）

可以使用 `load` 指令：

```cpp
/// 取出某指针类型的变量指向的地址中的数据
/// Ty：   取出的值的类型
/// Ptr： 指针类型的变量，指向数据存放的地址
LoadInst *CreateLoad(Type *Ty, Value *Ptr, const Twine &Name = "");
```

如，对于`int a = 10; int b = a`：

```cpp
/// 1. 使用 alloca 创建局部变量 a
llvm::AllocaInst *a = TheBuilder.CreateAlloca(TheBuilder.getInt32Ty(), nullptr, "a");

/// 2. 将常量10存入局部变量 a
TheBuilder.CreateStore(TheBuilder.getInt32(10), a);

/// 3. 使用 load 将局部变量 a 的值取出来，也即取出常量10
///    我们已经知道要取出的数据类型是 i32 了，Ty 参数的值为 i32
llvm::Value *aVal = TheBuilder.CreateLoad(llvm::Type::getInt32Ty(TheContext), a);

/// 4. 使用 alloca 创建局部变量 b
llvm::AllocaInst *b = TheBuilder.CreateAlloca(TheBuilder.getInt32Ty(), nullptr, "b");

/// 5. 将常量10存入 b 中
TheBuilder.CreateStore(aVal, b);
```

生成的 LLVM IR 如下：

```llvm
%a = alloca i32
store i32 10, ptr %a
%0 = load i32, ptr %a ; 使用寄存器分配的局部变量，存储常量10
%b = alloca i32
store i32 %0, ptr %b
```

---

对于寄存器分配的局部变量，使用其值时不需要使用 `load` 指令，指令的结果已经直接存储在该局部变量中了，使用时直接传给需要它的接口即可。

如上例中的：

```cpp
Value *aVal = TheBuilder.CreateLoad(a->getAllocatedType(), a);
```

该 load 指令的结果直接存储在寄存器 %0 中：`%0 = load i32, ptr %a`，使用时直接传给需要它的接口即可：

```cpp
/// store i32 %0, ptr %b
TheBuilder.CreateStore(aVal, b);
```

### 全局变量的取值和赋值

全局变量的存储也是需要分配内存空间的，而不是直接存储在寄存器中。因此实际上，全局变量也是指针类型。

例如 `@globalVar = global i32 10`，全局变量 @globalVar 为 `i32*` 类型（LLVM IR 中显示为 `ptr`），指向 `i32` 类型的数据，值为 `10`。

根据 [创建全局变量](#create-gloabl-variable)一节可知，不使用 `llvm::Constant` 进行初始化的情况下，全局变量的赋值和取值也是分别使用 `store` 指令和 `load` 指令。

例如，对下面这段源代码：

```cpp
/// 全局变量 a 的声明和定义
int a = 10;

int main() {
    /* do something */

    /// 全局变量的取值
    int b = a;

    /// 全局变量的赋值
    a = 20;

    /* do something */
}
```

生成 LLVM IR 的部分参考代码如下：

```cpp
/// 1. 创建全局变量 a，赋初始值常量10
auto a = llvm::GlobalVariable(TheModule, TheBuilder.getInt32Ty(), false,
                              llvm::GlobalVariable::ExternalLinkage,
                              TheBuilder.getInt32(10), "a");
/* Do something */

/// 在 main 函数中
/// 2. 创建局部变量 b
llvm::AllocaInst *b =
    TheBuilder.CreateAlloca(llvm::Type::getInt32Ty(TheContext), nullptr, "b");

/// 3. 在模块的符号表中查找全局变量 a
auto GloVarA = TheModule.getGlobalVariable("a");

/// 3. 使用 load 指令取出全局变量 a 的值
///    全局变量的存储也是需要分配内存空间的，因此全局变量 a 本身其实是指针类型
///    我们已经知道了要取出 i32 类型的数据了，Ty 参数的值为 i32
llvm::Value *valA =
    TheBuilder.CreateLoad(llvm::Type::getInt32Ty(TheContext), GloVarA);

/// 4. 使用 store 指令将全局变量 a 的值存入局部变量 b 中
TheBuilder.CreateStore(valA, b);

/// 5. 将常量20存入全局变量 a 中
TheBuilder.CreateStore(TheBuilder.getInt32(20), GloVarA);

/* Do something */
```

生成的部分 LLVM IR 如下：

```llvm
@a = global i32 10        ; 创建全局变量 a

; do something
; 在 main 函数中

%b = alloca i32          ; 创建局部变量 b
%0 = load i32, ptr @a      ; 取出全局变量 a 的值
store i32 %0, ptr %b      ; 将全局变量 a 的值存入 b 中
store i32 20, ptr @a        ; 将常量20存入全局变量 a 中

; do something
```

### 在函数符号表中查找局部变量

首先要取得[函数](#function)实例指针，然后通过 `llvm::Function` 的 `getValueSymbolTable()` 方法获得函数的符号表，最后通过 `lookup()` 方法查找局部变量：

```cpp
#include <llvm/IR/ValueSymbolTable.h>

llvm::Function *func = /* 获得 llvm::Function 实例指针 */;

// 以 varName 表示局部变量的名字，未找到则返回 nullptr
llvm::Value* var = func->getValueSymbolTable()->lookup(VarName);
```

## 数组

数组的创建可以参考 [创建全局变量](#create-global-variable) 和 [局部变量](#local-variable) 两节。

[创建数组常量](#create-array-constant) 和 [对任意类型创建 0 常量](#create-zero-constant) 两节对于全局数组的初始化或许会有帮助。

使用全局构造函数来初始化全局数组和局部数组的初始化可以参考下面 [数组元素的访问](#数组元素的访问) 一节，通过 GEP 指令、[load](#load-instuction) 指令和 [store](#store-instuction) 指令来进行逐数组元素初始化。

### 数组元素的访问

访问数组的元素需要用到 **GEP**（GetElementPtr，**获取元素指针**）指令，这个指令用于获取聚合数据结构（在本实验中，即数组）的子元素的地址。GEP 指令仅进行地址的计算而不进行内存访问，其实质是将指针偏移量应用于基指针并返回结果指针。

具体而言，对于数组元素的访问，可以使用 `llvm::IRBuilder` 的 `CreateInBoundsGEP()`。

```cpp
/// 根据索引列表，将指针偏移量应用于基指针，获得结果指针
/// Ty：      基指针 Ptr 指向的数据的类型
/// Ptr：     基指针
/// IdxList： 索引列表
Value *CreateInBoundsGEP(Type *Ty, Value *Ptr, ArrayRef<Value *> IdxList, const Twine &Name="");
```

例如，对于 `int arr[10][5]`，如果我们想要访问 `arr[2][1]`：

```cpp
/// 数组的创建：
/// llvm::ArrayType *arrTy1D =
///     llvm::ArrayType::get(llvm::Type::getInt32Ty(TheContext), 5);
/// llvm::ArrayType *arrTy2D =
///     llvm::ArrayType::get(arrTy1D, 10);
/// auto arr = TheBuilder.CreateAlloca(arrTy2D, nullptr, "arr");
/// 省略对于数组 arr 的赋值

/// 索引
std::vector<llvm::Value *> idxList{
    TheBuilder.getInt64(0), TheBuilder.getInt64(2), TheBuilder.getInt64(1)};

/// GEP 指令访问 arr[2][1]
llvm::Value *val = TheBuilder.CreateInBoundsGEP(arrTy2D, arr, idxList);
```

产生的 LLVM IR 如下：

```llvm
%0 = getelementptr inbounds [10 x [5 x i32]], ptr %arr, i64 0, i64 2, i64 1
```

`llvm::IRBuilder` 的 `CreateInBoundsGEP()` 产生的 LLVM IR 的格式如下：

```llvm
<result> = getelementptr inbounds <ty>, ptr <ptrval> {, <ty> <idx>}
```

- 第一个`<ty>`表示**第一个索引**指向的数据的类型，也即基指针指向的数据类型。
- `<ptrval>`表示基指针。
- `<ty> <idx>`表示一组索引值类型和索引值，一个索引值类型和索引值对，被称为一个**索引**。`{...}`花括号表示可以有一个或者多个索引。索引值类型`<ty>`一般为`i32`或者`i64`，索引值`<idx>`为具体的数字值。索引指向的数据类型决定了单位索引值对应的指针偏移量。

---

细心的同学可能已经发现，我们想要访问 `arr[2][1]`，为什么第一个索引的索引值是 0 呢，为什么使用 0、2、1 的索引列表而不是直接 2、1？这是因为全局数组和使用 `alloca` 指令分配内存得到的局部数组，其变量本质都是指针类型，指向对应的数组，也即上面的`%arr`，实际上是一个**数组指针**。

第一个索引对应的数据类型，也即 `%arr` 指向的数据类型，是 `[10 x [5 x i32]]` 的数组，索引值每变化 1，对应的指针偏移量就变化 `10 * 5 * 32` bits，而整个数组 `%arr` 的大小也正好就这么大。第一个索引的值为 0，就表示取出起始地址为`%arr+0`的一个 `[10 x [5 x i32]]` 的数组。

取出的 `[10 x [5 x i32]]` 的数组也可以看作一个指针，指向其中第一个 `[5 x i32]` 的数组。第二个索引对应的数据类型就是 `[5 x i32]` 的数组，索引值每变化 1，对应的指针偏移量就变化 `5 * 32` bits。第二个索引的值为 2，就表示取出起始地址为`*(%arr+0)+2`的一个 `[5 x i32]` 的数组。

取出的 `[5 x i32]` 的数组也可以看作一个指针，指向其中第一个 `i32` 的整数。第三个索引对应的数据类型就是 `i32` 的整数，索引值每变化 1，对应的指针偏移量就变化 `32` bits。第三个索引的值为 1，就表示取出起始地址为`*(*(%arr+0)+2)+1`的一个 `i32` 的整数。

总结一下，上面的 GEP 指令，实际上就是用基指针`%arr`，加上偏移量`0*(10*5*32)+2*(5*32)+1*(32)`，来计算出我们想要访问`arr[2][1]`处的地址。GEP 指令返回的是元素的**指针**，也就是说，上例中 `%result` 其实是 `i32*`，接下来可以使用 [store](#store-instuction) 和 [load](#load-instruction) 指令进一步对其进行赋值和取值。

注：上面类似`*(%arr+0)+2`的式子中，都是指针之间的运算，而不是一般的算数运算，且省略了类型转换，仅供参考。

---

例如，令 `arr[2][1]=2` 并取出该值，可以像下面这样生成 LLVM IR：

```cpp
/// 索引
std::vector<llvm::Value *> idxList{
    TheBuilder.getInt64(0), TheBuilder.getInt64(2), TheBuilder.getInt64(1)};

/// GEP 指令访问 arr[2][1]
llvm::Value *element = TheBuilder.CreateInBoundsGEP(arrTy2D, arr, idxList);

/// store 指令赋值
TheBuilder.CreateStore(TheBuilder.getInt32(2), element);

/// load 指令取值
TheBuilder.CreateLoad(llvm::Type::getInt32Ty(TheContext), element);
```

生成的 LLVM IR 如下：

```llvm
; 取出元素指针
%0 = getelementptr inbounds [10 x [5 x i32]], ptr %arr, i64 0, i64 2, i64 1
; 赋值
store i32 2, ptr %0
; 取值
%1 = load i32, ptr %0
```

对 GEP 指令还有疑惑的，可以查看：

[GEP FAQ](https://llvm.org/docs/GetElementPtr.html)

[LLVM's getelementptr, by example](https://blog.yossarian.net/2020/09/19/LLVMs-getelementptr-by-example)

## 函数 :id=function

[llvm::Function Class Reference](https://llvm.org/doxygen/classllvm_1_1Function.html)

### 函数声明/创建

```cpp
#include <llvm/IR/Function.h>

// Ty：     函数类型
// Linkage：函数的链接属性
// N：      函数名字
// M：      函数属于的模块
static Function *llvm::Function::Create(FunctionType *Ty, LinkageTypes Linkage, const Twine &N, Module *M);
```

例如，对于函数 `void f(int a, int b)`：

```cpp
/// 函数类型：void(int, int)
llvm::FunctionType *funcType = llvm::FunctionType::get(
    llvm::Type::getVoidTy(TheContext),
    {llvm::Type::getInt32Ty(TheContext), llvm::Type::getInt32Ty(TheContext)},
    false);

/// 创建函数
llvm::Function *func = llvm::Function::Create(
    funcType, llvm::GlobalValue::ExternalLinkage, "f", &TheModule);
```

对应 LLVM IR 如下：

```llvm
declare void @f(i32 %0, i32 %1)
```

注意，这里仅仅是函数声明，并没有包含[基本块](#basic-block)。

---

细心的同学可能会发现，LLVM IR 中，函数 `f` 的参数为 `%0` 和 `%1`，并不是源码中的 `a` 和 `b`。我们可以通过迭代器遍历函数 `f` 的参数列表，为每个参数设置名字：

```cpp
auto argIter = func->arg_begin();

/// 设置第一个参数的名字为 a，并使 argIter ++
argIter++->setName("a");
/// 设置第二个参数的名字为 b
argIter->setName("b");
```

此时 LLVM IR 如下：

```llvm
declare void @f(i32 %a, i32 %b)
```

### 函数定义

### 在模块符号表中查找函数

```cpp
/// llvm::Module 的成员函数
/// 通过函数名字，在 llvm::Module 的符号表找到对应的函数
/// Name：要调用的函数的名字
Function *getFunction(StringRef Name) const;
```

例如，想找到名字为 `f` 的函数：

```cpp
llvm::Function *func = TheModule.getFunction("f");
```

### 调用函数

```cpp
/// llvm::IRBuilder的成员函数
/// 创建 call 指令
/// Callee：  要调用的函数
/// Args：  调用函数时传入的实参列表，可不传参
CallInst *CreateCall(FunctionCallee Callee, ArrayRef<Value *> Args = None,
                       const Twine &Name = "", MDNode *FPMathTag = nullptr);
```

例如，想要调用函数 `void f(int a, int b)`，并传入参数常量 1 和 2 作为参数：

```cpp
/// 通过 llvm::Module 的符号表找到对应的函数
llvm::Function *func = TheModule.getFunction("f");

/// 利用 llvm::IRBuilder 创建 call 指令
TheBuilder.CreateCall(
    func, {llvm::ConstantInt::get(llvm::Type::getInt32Ty(TheContext), 1),
        llvm::ConstantInt::get(llvm::Type::getInt32Ty(TheContext), 2)});
```

生成的 LLVM IR 如下：

```llvm
call void @f(i32 1, i32 2)
```

如果想要调用函数 `void f()`，没有参数传入：

```cpp
/// 通过 llvm::Module 的符号表找到对应的函数
Function *func = TheModule.getFunction("f");

// 利用 llvm::IRBuilder 创建 call 指令
TheBuilder.CreateCall(func);
```

结果如下：

```llvm
call void @f()
```

### 获得函数基本块

```cpp
llvm::Function *func = /* 获得 llvm::Function 实例指针 */;

/// 遍历基本块列表
for(auto &Block : *func) {
    /* Do something */
}

/// 获得 entry 基本块
llvm::BasicBlock *entryBlock = func->getEntryBlock();
```

### 获得当前函数所属 Module

```cpp
llvm::Function *func = /* 获得 llvm::Function 实例指针 */;

llvm::Module *module = func->getParent();
```

## 基本块 :id=basic-block

每一个定义了的函数都有若干个基本块，并且第一个基本块的标签一定为 `entry` 。`entry`基本块是函数的入口基本块，一定是第一个被执行的基本块。

在函数有了基本块后，其便成了定义了的函数，LLVM IR 中的`declare` 关键字将自动变成 `define`。

### 创建基本块

```cpp
/// Name：    基本块的标签名，不取名则 LLVM 自动分配
/// Parent：  基本块所属的函数
static BasicBlock *llvm::BasicBlock::Create(LLVMContext &Context,
                               const Twine &Name="",
                               Function *Parent=nullptr,
                               BasicBlock *InsertBefore=nullptr);
```

例如，在函数 `func` 中创建标签为 `entry` 基本块：

```cpp
llvm::BasicBlock *block = llvm::BasicBlock::Create(TheContext, "entry", func);
```

### 获得当前基本块所属的函数

```cpp
llvm::Function *func = block->getParent();
```

### 获得基本块的终结指令 :id=basic-block-terminator

在 LLVM IR 正确组织的情况下，每一个基本块的最后一条指令都应该是一条[终结指令（Terminator instructions）](https://llvm.org/docs/LangRef.html#terminator-instructions)。

```cpp
/// 如果Block没有终结指令，则inst = nullptr
/// 也可据此来判断该基本块是否有终结指令
llvm::Instruction *inst = Block->getTerminator();
```

### 获得当前 llvm::IRBuilder 正在插入 LLVM IR 的基本块 :id=now-insert-block

```cpp
llvm::BasicBlock *curBlock = TheBuilder.GetInsertBlock();
```

### 基本块间跳转与变量传递

参见[二元表达式-逻辑与 &&-短路求值](#short-circuit-evaluation)中的实现方法

## 二元表达式

### 整数加法 + :id=integer-addition

```cpp
/// LHS + RHS

/// LHS：       加号左边操作数
/// RHS：       加号右边操作数
/// Name：      结果分配的寄存器的名字
/// NUW和NSW标志位：   NUW表示No Unsigned Wrap，NSW表示No Signed Wrap
///          如果设置了NUW和/或NSW，则分别保证了指令操作不会发生无符号/有符号溢出。
///          这种情况下，如果有溢出发生，则指令的结果为poison value。
///          如果没设置NUW和/或NSW，则LLVM会分别对无符号/有符号的溢出情况进行处理。
Value *CreateAdd (Value *LHS, Value *RHS,
                  const Twine &Name="",
                  bool HasNUW=false, bool HasNSW=false);
```

例如，对于 `a+b`：

```cpp
/// 在函数符号表中查找局部变量 a 和 b
llvm::Value *a = func->getValueSymbolTable()->lookup("a");
llvm::Value *b = func->getValueSymbolTable()->lookup("b");

/// load 指令取出 a 和 b 的值
llvm::Value *valA = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), a);
llvm::Value *valB = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), b);

/// 进行加法
TheBuilder.CreateAdd(valA, valB);
```

生成的 LLVM IR 如下：

```llvm
%0 = load i32, ptr %a
%1 = load i32, ptr %b
%2 = add i32 %0, %1
```

### 整数减法 -

```c
/// LHS - RHS
Value *CreateSub(Value *LHS, Value *RHS,
                 const Twine &Name = "",
                 bool HasNUW = false, bool HasNSW = false);
```

例如，对于`a-b`：

```cpp
/// load 指令取出 a 和 b 的值
llvm::Value *valA = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), a);
llvm::Value *valB = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), b);

TheBuilder.CreateSub(valA, valB);
```

生成的 LLVM IR 如下：

```llvm
%0 = load i32, ptr %a
%1 = load i32, ptr %b
%2 = sub i32 %0, %1
```

### 整数乘法 \*

```cpp
/// LHS * RHS
Value *CreateMul(Value *LHS, Value *RHS,
                 const Twine &Name="",
                 bool HasNUW=false, bool HasNSW=false);
```

例如，`a*b`：

```cpp
/// load 指令取出 a 和 b 的值
llvm::Value *valA = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), a);
llvm::Value *valB = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), b);

TheBuilder.CreateMul(valA, valB);
```

生成的 LLVM IR 如下：

```llvm
%0 = load i32, ptr %a
%1 = load i32, ptr %b
%2 = mul i32 %0, %1
```

### 整数除法 /

```cpp
/// 有符号整数除法
/// LHS / RHS
Value *CreateSDiv(Value *LHS, Value *RHS,
                  const Twine &Name="",
                  bool isExact=false);
```

例如，对于`a/b`：

```cpp
/// load 指令取出 a 和 b 的值
llvm::Value *valA = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), a);
llvm::Value *valB = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), b);

TheBuilder.CreateSDIV(valA, valB);
```

生成的 LLVM IR 如下：

```llvm
%0 = load i32, ptr %a
%1 = load i32, ptr %b
%2 = sdiv i32 %0, %1
```

### 整数取余 %

```cpp
// 有符号整数取余
// LHS % RHS
Value *createSRem(Value *LHS, Value *RHS, const Twine &Name="");
```

例如，对于`a%b`：

```cpp
/// load 指令取出 a 和 b 的值
llvm::Value *valA = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), a);
llvm::Value *valB = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), b);

TheBuilder.CreateSRem(valA, valB);
```

生成的 LLVM IR 如下：

```llvm
%0 = load i32, ptr %a
%1 = load i32, ptr %b
%2 = srem i32 %0, %1
```

### 整数比较

比较操作的返回值均为 `i1` 类型，也即 `bool` 类型。

#### 大于 >

```cpp
/// 有符号大于
/// LHS > RHS
Value *CreateICmpSGT(Value *LHS, Value *RHS, const Twine &Name="");
```

#### 大于等于 >=

```cpp
/// 有符号大于等于
/// LHS >= RHS
Value *CreateICmpSGE (Value *LHS, Value *RHS, const Twine &Name="");
```

#### 小于 <

```cpp
/// 有符号小于
/// LHS < RHS
Value *CreateICmpSLT(Value *LHS, Value *RHS, const Twine &Name="");
```

#### 小于等于 <=

```cpp
/// 有符号小于等于
/// LHS <= RHS
Value *CreateICmpSLE (Value *LHS, Value *RHS, const Twine &Name="")
```

#### 相等 ==

```cpp
/// 相等
/// LHS == RHS
Value *CreateICmpEQ (Value *LHS, Value *RHS, const Twine &Name="");
```

#### 不相等 !=

```cpp
/// 不相等
/// LHS != RHS
Value *CreateICmpNE(Value *LHS, Value *RHS, const Twine &Name="");
```

### 逻辑与 && :id=logical-and

#### 短路求值思路参考 :id=short-circuit-evaluation

对于形如 `exp_1 && exp_2` 这样的与的表达式，其中 `exp_1` 和 `exp_2` 为具有真值的表达式。当 `exp_1` 和 `exp_2` 均为 `true` 时，整个表达式的值才为 `true`。换句话说，`exp_1`和`exp_2`其中一个为 `false` 时，整个表达式的值就为 `false`。

因此，在处理这个表达式的时候：

- 若 `exp_1=true`，则继续处理 `exp_2`：
  - 若 `exp_2=true`，整个表达式值为 `true`
  - 若 `exp_2=false`，整个表达式值为 `false`
- 若 `exp_1=false`，不必继续处理 `exp_2` ，因为此时整个表达式的真值已经为 `false`

在生成这段表达式的 LLVM IR 时，可以参考采用下述基本块控制流：

将这个表达式的处理分为三个部分：

1. 处理 `exp_1` 的部分：

   在当前基本块中处理 `exp_1`，获得处理完 `exp_1` 后的[当前正在插入的基本块](#now-insert-block)（处理 exp_1 可能需要创建多个基本块），在该基本块末尾创建条件跳转指令 `br`。如果 `exp_1=true`，跳转到标签为 `land.rhs` 的基本块；否则，跳转到标签为 `land.end` 的基本块。

2. `exp_1=true` 接着处理 `exp_2` 的部分：

   在 `land.rhs` 基本块中，处理 `exp_2`。获得处理完 `exp_2` 后的当前正在插入的基本块，在该基本块的末尾创建无条件跳转指令，无条件跳转到 `land.end` 基本块。

3. 最后获得表达式的值的部分：

   在 `land.end` 基本块中，为了确定表达式的值，需要使用 `phi` 指令：

   - 如果是从处理 `exp_1` 的基本块跳转过来的，则表达式的值为 `false`；
   - 如果是从处理 `exp_2` 的基本块跳转过来的，则表达式的值与 `exp_2` 的值一样。

   之后利用该表达式的值进行后续的操作，如处理 `if` 或者 `while`。

注意，`land.rhs` 和 `land.end` 这些标签均可以自己取名。由于 `exp_1` 和 `exp_2` 可能不是原子逻辑表达式，即其可能嵌套了 `&&` 或者 `||`，因此处理 `exp_1` 或者 `exp_2` 时可能会涉及到多个基本块，不过子表达式基本块的控制流结构基本上也是一样的，都是对表达式处理三部分的嵌套。

#### 条件跳转指令 :id=coditional-branch-instruction

```cpp
/// 如果 Cond=True，则跳转到 True 基本块，否则，跳转到 False 基本块
/// Cond：    条件，i1 类型
/// True：    如果 Cond 为真，则跳转到 True 基本块
/// False：   如果 Cond 为假，则跳转到 False 基本块
BranchInst *CreateCondBr(Value *Cond,
                         BasicBlock *True,
                         BasicBlock *False,
                         MDNode *BranchWeights=nullptr, MDNode *Unpredictable=nullptr);
```

例如 `a==b && exp_2`：

```cpp
Value *eq = TheBuilder.CreateICmpEQ(valA, valB); /// 判断是否 a == b
BasicBlock *lhsTrueBlock = BasicBlock::Create(TheContext, "land.rhs", func);
BasicBlock *landEndBlock = BasicBlock::Create(TheContext, "land.end", func);
TheBuilder.CreateCondBr(eq, lhsTrueBlock, landEndBlock);
```

生成的 LLVM IR 如下：

```llvm
br i1 %4, label %land.rhs, label %land.end  ; %4=true 则跳转到 %land.rhs，否则跳转到 %land.end
```

#### 无条件跳转指令

```cpp
/// 无条件跳转到目标基本块
/// Dest：目标基本块
BranchInst *CreateBr(BasicBlock *Dest);
```

例如：

```cpp
TheBuilder.CreateBr(landEndBlock);
```

生成的 LLVM IR 如下：

```llvm
br label %land.end
```

#### phi 指令

`phi` 指令是在 LLVM IR 中用于处理基本块间值传递的指令。它用于合并不同的路径上的值，通常出现在基本块的开头。

在 LLVM IR 中，`phi` 指令的格式为：

```llvm
%result = phi <ty> [ %value1, %block1 ], [ %value2, %block2 ], ...
```

- `%result`： `phi` 指令的结果，从前驱基本块传递过来的值存放在`%result`中。
- `<ty>`：结果值的类型。
- `[%value1, %block1], [%value2, %block2], ...`：每个方括号表示一个前驱基本块和从基本块传递过来的值，`%value1`、`%value2` 等是前驱基本块传递过来的值，`%block1`、`%block2` 等是对应的前驱基本块。

如果当前基本块是从`%blockn`基本块跳转过来的，则`%result`的值等于`%blockn`基本块中`%valuen`的值。

---

要想使用 `phi` 指令，首先需要创建 `phi` 节点：

```cpp
/// Ty：：                指定创建的 PHINode 的结果的类型，即上述语法中的 <ty>
/// NumReservedValues：   表示 PHINode 要处理多少前驱基本块，有多少候选值，即上述语法中 [%value %block] 对的数量
PHINode *CreatePHI(Type *Ty, unsigned NumReservedValues, const Twine &Name="");
```

之后，使用 `addIncoming()` 函数来为 `PHINode` 添加前驱基本块和值，即添加 `[%value %block] `对。

```cpp
/// PHINode成员函数
/// V：   前驱基本块传过来的值
/// BB：  前驱基本块
void addIncoming(Value *V, BasicBlock *BB)
```

例如：

```cpp
PHINode *phi = TheBuilder.CreatePHI(Type::getInt1Ty(TheContext), 2, "merge");
phi->addIncoming(eq, Block);
phi->addIncoming(gt, lhsTrueBlock);
```

生成的 IR 如下：

```llvm
%merge = phi i1 [ %4, %entry ], [ %5, %land.rhs ]
```

#### 逻辑与的例子

例如，对于表达式 `a > b && b > c`，`a, b, c`三者均为 `i32` 类型：

```cpp
/// 在函数符号表中查找局部变量 a、b、c
llvm::Value *varA = func->getValueSymbolTable()->lookup("a");
llvm::Value *varB = func->getValueSymbolTable()->lookup("b");
llvm::Value *varC = func->getValueSymbolTable()->lookup("c");

/// load 指令取出 a、b、c 的值
llvm::Value *valA = TheBuilder.CreateLoad(llvm::Type::getInt32Ty(TheContext), varA);
llvm::Value *valB = TheBuilder.CreateLoad(llvm::Type::getInt32Ty(TheContext), varB);
llvm::Value *valC = TheBuilder.CreateLoad(llvm::Type::getInt32Ty(TheContext), varC);

/// 创建基本块
llvm::BasicBlock *lhsTrueBlock = llvm::BasicBlock::Create(TheContext, "land.rhs", func);
llvm::BasicBlock *landEndBlock = llvm::BasicBlock::Create(TheContext, "land.end", func);

/// a > b
llvm::Value *aGTb = TheBuilder.CreateICmpEQ(valA, valB);
/// 如果 a > b为真，则跳转到 land.rhs；否则，跳转到 land.end
TheBuilder.CreateCondBr(aGTb, lhsTrueBlock, landEndBlock);

/// 将当前 IR 插入点设置为 land.rhs，因为要处理 exp_2，即 b > c
TheBuilder.SetInsertPoint(lhsTrueBlock);
/// b > c
llvm::Value *bGTc = TheBuilder.CreateICmpSGT(valB, valB);
// 无条件跳转到 land.end
TheBuilder.CreateBr(landEndBlock);

/// 将当前 IR 插入点设置为 land.end
TheBuilder.SetInsertPoint(landEndBlock);
/// phi指令
llvm::PHINode *phi = TheBuilder.CreatePHI(llvm::Type::getInt1Ty(TheContext), 2, "merge");
phi->addIncoming(TheBuilder.getInt1(false), Block);
phi->addIncoming(bGTc, lhsTrueBlock);
```

生成的 LLVM IR 如下：

```llvm
; ........................................
  %0 = load i32, ptr %a, align 4
  %1 = load i32, ptr %b, align 4
  %2 = load i32, ptr %c, align 4
  %3 = icmp eq i32 %0, %1
  br i1 %3, label %land.rhs, label %land.end

land.rhs:                                         ; preds = %entry
  %4 = icmp sgt i32 %1, %1
  br label %land.end

land.end:                                         ; preds = %land.rhs, %entry
  %merge = phi i1 [ false, %entry ], [ %4, %land.rhs ]
```

### 逻辑或 ||

#### 短路求值思路参考

思路和[逻辑与 &&](#logical-and)的类似。

对于形如 `exp_1 || exp_2` 这样的或的表达式，其中 `exp_1 和 exp_2` 为具有真值的表达式，当 `exp_1`和`exp_2`其中一个为 `true` 时，整个表达式的值就为 `true`。

因此，在处理这个表达式的时候：

- 若 `exp_1=false`，则继续处理 `exp_2`：
  - 若 `exp_2=true`，整个表达式值为 `true`
  - 若 `exp_2=false`，整个表达式值为 `false`
- 若 `exp_1=true`，不必继续处理 `exp_2` ，因为此时整个表达式的真值已经为 `false`

在生成这段表达式的 LLVM IR 时，可以参考采用下述基本块控制流：

将这个表达式的处理分为三个部分：

1. 处理 `exp_1` 的部分：

   在当前基本块中处理 `exp_1`，获得处理完 `exp_1` 后的当前正在插入的基本块（处理 `exp_1` 可能需要创建多个基本块），在该基本块末尾创建条件跳转指令 `br`。如果 `exp_1=true`，跳转到标签为 `lor.end` 的基本块，表达式的值已经为 `true`，不需要计算 `exp_2`；否则，跳转到标签为 `lor.rhs` 的基本块。

2. `exp_1=false` 接着处理 `exp_2` 的部分：

   在 `lor.rhs` 基本块中处理 `exp_2`，获得处理完 `exp_2` 后的当前正在插入的基本块，在该基本块的末尾创建无条件跳转指令，无条件跳转到 `lor.end` 基本块。

3. 最后获得表达式的值的部分：

   在 `lor.end` 基本块中，为了确定表达式的值，需要使用 `phi` 指令：

   - 如果是从处理 `exp_1` 的基本块跳转过来的，则表达式的值为 `true`；
   - 如果是从处理 `exp_2` 的基本块跳转过来的，则表达式的值与 `exp_2` 的值一样。

   之后利用该表达式的值进行后续的操作，如处理 `if` 或者 `while`。

#### 或的例子

例如，对于表达式 `a > b || b > c`，`a, b, c`三者均为 `i32` 类型：

```cpp
/// 在函数符号表中查找局部变量 a、b、c
llvm::Value *varA = func->getValueSymbolTable()->lookup("a");
llvm::Value *varB = func->getValueSymbolTable()->lookup("b");
llvm::Value *varC = func->getValueSymbolTable()->lookup("c");

/// load 指令取出 a、b、c 的值
llvm::Value *valA = TheBuilder.CreateLoad(llvm::Type::getInt32Ty(TheContext), varA);
llvm::Value *valB = TheBuilder.CreateLoad(llvm::Type::getInt32Ty(TheContext), varB);
llvm::Value *valC = TheBuilder.CreateLoad(llvm::Type::getInt32Ty(TheContext), varC);

/// 创建基本块
llvm::BasicBlock *lhsFalseBlock = llvm::BasicBlock::Create(TheContext, "lor.rhs", func);
llvm::BasicBlock *lorEndBlock = llvm::BasicBlock::Create(TheContext, "lor.end", func);

/// a > b
llvm::Value *aGTb = TheBuilder.CreateICmpEQ(valA, valB);
/// a > b为真，则跳转到 lor.end，否则，跳转到 lor.rhs
TheBuilder.CreateCondBr(aGTb, lorEndBlock, lhsFalseBlock);

/// 将当前 IR 插入点设置为 lor.rhs，因为要处理 exp_2，即 b > c
TheBuilder.SetInsertPoint(lhsFalseBlock);
/// b > c
llvm::Value *bGTc = TheBuilder.CreateICmpSGT(valB, valC);
// 无条件跳转到 lor.end
TheBuilder.CreateBr(lorEndBlock);

/// 将当前 IR 插入点设置为 lor.end
TheBuilder.SetInsertPoint(lorEndBlock);
/// phi指令
llvm::PHINode *phi = TheBuilder.CreatePHI(llvm::Type::getInt1Ty(TheContext), 2, "merge");
phi->addIncoming(TheBuilder.getInt1(true), Block);
phi->addIncoming(bGTc, lhsFalseBlock);
```

生成的 LLVM IR 如下：

```llvm
; ........................................
  %0 = load i32, ptr %a, align 4
  %1 = load i32, ptr %b, align 4
  %2 = load i32, ptr %c, align 4
  %3 = icmp eq i32 %0, %1
  br i1 %3, label %lor.end, label %lor.rhs

lor.rhs:                                          ; preds = %entry
  %4 = icmp sgt i32 %1, %2
  br label %lor.end

lor.end:                                          ; preds = %lor.rhs, %entry
  %merge = phi i1 [ true, %entry ], [ %4, %lor.rhs ]
```

## 一元表达式

### 非 !

```cpp
/// 将对 V 进行按位取反操作
Value *CreateNot(Value *V, const Twine &Name="");
```

例如对于`!(a>b)`，其中`a, b`均为 `i32` 类型：

```cpp
/// load 指令取出 a 和 b 的值
llvm::Value *valA = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), varA);
llvm::Value *valB = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), varB);

// a > b
llvm::Value *cmp = TheBuilder.CreateICmpSGT(valA, valB);

// 非
TheBuilder.CreateNot(cmp);
```

生成的 LLVM IR 如下：

```llvm
%0 = load i32, ptr %a
%1 = load i32, ptr %b
%2 = icmp sgt i32 %0, %1  ; a > b
%3 = xor i1 %2, true    ; !(a > b)
```

注意，这里通过与`true`进行异或操作来实现`i1`类型的非操作。

### 取负 -

```cpp
/// 用于创建整数的取负操作
/// 对 V 进行取负
Value *CreateNeg (Value *V, const Twine &Name="", bool HasNUW=false, bool HasNSW=false);
```

例如对于`b=-a`：

```cpp
/// load指令取出 a 的值
llvm::Value *valA = TheBuilder.CreateLoad(TheBuilder.getInt32Ty(), varA);

/// 取负，-a
llvm::Value *negValA = TheBuilder.CreateNeg(valA);

/// b = -a
TheBuilder.CreateStore(negValA, varB);
```

生成的 LLVM IR 如下：

```llvm
%0 = load i32, ptr %a
%1 = sub i32 0, %0      ; -a
store i32 %1, ptr %b  ; b = -a
```
