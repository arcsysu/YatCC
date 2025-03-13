## 框架介绍

本次实验的框架主要分为以下两部分：

- 注册 Transform Pass 和 Analysis Pass：在`main.cpp`中注册需要使用的 Transform/Analysis Pass，并指定优化顺序
- 实现 Transform Pass 和 Analysis Pass：在 optimizor.hpp 中定义需要使用的 Transform/Analysis Pass 类，并在其他文件中实现定义的 Transform/Analysis Pass 的函数

注意，增加文件后需要按照本节[清理缓存](#清理缓存)的方式重新配置 CMake 缓存，否则会导致报错。

### 注册 Transform Pass 和 Analysis Pass

注册 Transform Pass 的代码主要在`main.cpp`的`opt`函数中：

```cpp
void
opt(llvm::Module& mod)
{
  // 定义Analysis Pass的管理器
  LoopAnalysisManager LAM;
  FunctionAnalysisManager FAM;
  CGSCCAnalysisManager CGAM;
  ModuleAnalysisManager MAM;
  ModulePassManager MPM;

  // 注册Analysis Pass的管理器
  PassBuilder PB;
  PB.registerModuleAnalyses(MAM);
  PB.registerCGSCCAnalyses(CGAM);
  PB.registerFunctionAnalyses(FAM);
  PB.registerLoopAnalyses(LAM);
  PB.crossRegisterProxies(LAM, FAM, CGAM, MAM);

  // 添加Analysis Pass到管理器中
  MAM.registerPass([]() { return sysu::StaticCallCounter(); });
  /* 在此处添加你需要注册的Analysis Pass */

  // 添加Transform Pass到管理器中
  MPM.addPass(sysu::HelloWorldPass(llvm::errs()));
  MPM.addPass(sysu::StaticCallCounterPrinter(llvm::errs()));
  /* 在此处添加你需要注册的Transform Pass */

  // 运行Transform Pass
  MPM.run(mod, MAM);
}
```

以上代码的注释清晰地呈现了 LLVM IR 中 Transform Pass 和 Analysis Pass 的注册过程：

- Transform Pass：使用`MPM.addPass(sysu::optPass())`函数添加
- Analysis Pass：使用`MAM.registerPass([]() { return sysu::analysisPass(); })`函数添加

将 Transform Pass 和 Analysis Pass 注册到`MPM`和`MAM`中表示该 Pass 对整个 LLVM Module 作用。如果想实现更细粒度、运行速度更快的优化，可以尝试使用`FPM/FAM`、`LPM/LAM`针对单个函数、单个循环进行优化。为了简化代码，本实验统一使用`MPM/MAM`，因为我们可以从 LLVM Module 获取所有的函数、循环进而进行优化。

需要注意的是 Transform Pass 的执行顺序与第三部分添加 Transform Pass 的顺序相同，因此在优化前需要考虑优化次序对优化结果的影响；而 Analysis Pass 只会在被使用时执行，因此添加 Analysis Pass 的顺序不影响执行顺序。实例化 Transform Pass 时我们传入了`llvm::errs()`变量，该变量能让我们在 pass 中将中间结果输出到标准错误输出中，方便同学们进行调试（调试方法见[调试方法](./overview.md#调试方法)一节）。

### 实现 Transform Pass

以常量折叠优化`ConstantFolding`为例，其定义需要添加到`optimizor.hpp`中：

```cpp
class ConstantFolding
    : public llvm::PassInfoMixin<ConstantFolding> {
public:
  explicit ConstantFolding(llvm::raw_ostream &OutS) : OS(OutS) {}
  llvm::PreservedAnalyses run(llvm::Module &module,
                              llvm::ModuleAnalysisManager &MAM);

private:
  llvm::raw_ostream &OS;
};
```

- 所有 Transform Pass 都继承于`llvm::PassInfoMixin`，该类会接受模板参数中 Transform Pass 的名称将 pass 初始化
- Transform Pass 需要定义与实现`run`函数，在该函数内同学们能对生成的 LLVM IR 进行分析与变换，返回值表示该 Pass 是否会对分析 Pass 产生影响
- 在 Pass 运行时使用`llvm::raw_ostream &OS`进行输出

由于本实验基于 LLVM 17，因此不支持旧版本 LLVM 提供的基于`ModulePass`、`FunctionPass`等类继承的 Transform Pass 实现，新旧版本 Pass 机制的区别请阅读[Legacy Pass](#legacy-pass)一节。常量折叠的`run`函数主体代码如下：

```cpp
llvm::PreservedAnalyses
sysu::ConstantFolding::run(llvm::Module &module, llvm::ModuleAnalysisManager &MAM) {
  // 遍历所有函数
  for (auto &func : module) {
    // 遍历每个函数的基本块
    for (auto &BB : func) {
      std::vector<Instruction*> instToErase;
      // 遍历每个基本块的指令
      for (auto& I : BB) {
        ...
      }
      // 从基本块中删除被选中的指令
      for (auto& I : instToErase) {
        I->eraseFromParent();
      }
    }
  }
  return llvm::PreservedAnalyses::all();
}
```

上述代码展示了如何通过循环遍历`llvm::Module`中所有指令，以上遍历方法可以作为大部分指令优化的框架。使用该框架只需要将算法针对单条指令的处理逻辑填入`...`所处的代码块中，再辅以对指令的操作（例如对操作数的替换、指令的插入移动与删除等）即可完成优化算法的实现。

在删除指令时，我们一般先将需要删除的指令保存起来，遍历结束后才统一删除。这是因为使用范围 for 语句遍历时删除指令会影响遍历顺序，最终造成程序崩溃，在实际代码实现时需要注意该问题。

### 实现 Analysis Pass

以分析函数调用次数的`StaticCallCounter`为例，其定义需要添加到`optimizor.hpp`中：

```cpp
class StaticCallCounter : public llvm::AnalysisInfoMixin<StaticCallCounter> {
public:
  using Result = llvm::MapVector<const llvm::Function *, unsigned>;
  Result run(llvm::Module &module, llvm::ModuleAnalysisManager &);

private:
  // Analysis Pass中必须包含"static llvm::AnalysisKey Key"
  static llvm::AnalysisKey Key;
  friend struct llvm::AnalysisInfoMixin<StaticCallCounter>;
};
```

Analysis Pass 和 Transform Pass 在定义时的区别在于：

- Analysis Pass 的继承对象`AnalysisInfoMixin`继承于 Transform Pass 的继承对象`PassInfoMixin`
- Analysis Pass 需要声明`static llvm::AnalysisKey Key`，因为其将作为 Analysis Pass 区别于其他 pass 的唯一标识符被`AnalysisInfoMixin::ID()`函数返回
- Analysis Pass 需要声明`friend struct llvm::AnalysisInfoMixin<passName>`，否则`llvm::AnalysisKey Key`会因为是`AnalysisInfoMixin`的私有变量而报错
- Analysis Pass 的 run 函数返回自定义的结果而非`llvm::PreservedAnalyses`

实现`StaticCallCounter`的主体代码如下：

```cpp
sysu::StaticCallCounter::Result
sysu::StaticCallCounter::run(Module &module, ModuleAnalysisManager &) {
  MapVector<const Function *, unsigned> result;

  for (auto &func : module) {
    for (auto &BB : func) {
      for (auto &inst : BB) {
        // 尝试转为CallInst

        // 获取被调用函数

        // 统计函数在源代码中被调用次数
        auto callCount = result.find(directInvoc);
        if (result.end() == callCount) {
          callCount = result.insert({directInvoc, 0}).first;
        }
        ++callCount->second;
      }
    }
  }
  return result;
}

AnalysisKey sysu::StaticCallCounter::Key;
```

注意`static llvm::AnalysisKey Key`是一个静态成员变量，在实现时需要额外声明，否则会出现静态变量未声明的报错。定义和实现 Analysis Pass 后，我们需要在其他 pass 中调用该 pass。下面的`StaticCallCounterPrinter`调用了定义、实现、注册好的`StaticCallCounter`，将分析结果以表格的形式输出到文件中：

```cpp
PreservedAnalyses
sysu::StaticCallCounterPrinter::run(Module &module,
                                    ModuleAnalysisManager &MAM) {
  // 通过MAM执行StaticCallCounter并返回分析结果
  auto directCalls = MAM.getResult<StaticCallCounter>(module);

  OS << "=================================================\n";
  OS << "     sysu-optimizer: static analysis results\n";
  OS << "=================================================\n";
  OS << "       NAME             #N DIRECT CALLS\n";
  OS << "-------------------------------------------------\n";

  for (auto &callCount : directCalls) {
      std::string funcName = callCount.first->getName().str();
      funcName.resize(20, ' ');
      OS << "       " << funcName << "   " << callCount.second << "\n";
  }

  OS << "-------------------------------------------------\n\n";
  return PreservedAnalyses::all();
}
```

需要调用 Analysis Pass 时，可以通过`run()`函数传入的`ModuleAnalysisManager &MAM`进行调用在`MAM`中注册过的 Analysis Pass（注册方法见注册 Transform Pass 和 Analysis Pass 小节），返回类型为 Analysis Pass 的`run()`函数中自定义的返回类型。通过 Analysis Pass 和 Transform Pass 的灵活组合，同学们可以实现许多代码优化算法。

### 清理缓存

增加新的 Pass 文件后，直接运行`task4-score`时可能会报新增加内容的`undefine reference ...`，这是增加新文件后 CMake 的缓存未更新导致新增文件未参与编译链接导致的错误。因此，在增加新文件后，需要按照以下方法重新构建 CMake 配置：

![删除CMake Cache](../images/task4/delete_cache.png)

### Legacy Pass

（本小节内容为拓展内容，主要介绍 LLVM 新旧 Pass 机制的不同，跳过不影响实验完成）

新旧版本 Pass 机制对于开发者最明显的区别是代码量的区别，旧 Pass 机制由于设计问题需要使用不少代码完成一个工作，而重构后的新 Pass 机制变得非常简洁与高效，开发者能够更方便地为 LLVM 添加优化。两者的区别如下：

- 继承：旧 Pass 机制继承`FunctionPass`表示该 pass 针对单个 function 优化，当优化对象为 module 和 loop 等结构时需要继承对应的类；新版本 Pass 机制统一继承`PassInfoMixin`类。
- 定义：
  - 旧 Pass 机制需要声明 ID，该 ID 将作为区分不同 pass 的唯一标识符，同时 ID 作为静态成员变量需要在结构体定义外初始化；新 Pass 机制通过继承`PassInfoMixin`时传入的模板名作为区分 pass 的标识符。
  - 旧 Pass 机制需要调用`initialize...`函数进行初始化，该函数需要通过预定义的宏传入参数生成；新 Pass 机制则不需要额外初始化。
  - 旧 Pass 机制若需要使用 Analysis Pass，需要定义`getAnalysisUsage`函数并手动通过`AU.addRequired<...>()`添加 Analysis Pass；新 Pass 机制只需要在 run 函数中传入`FunctionAnalysisManager &FAM`即可在函数内使用在 FAM 注册过的 Analysis Pass。
- 实现：旧 Pass 机制使用`runOnFunction`函数实现优化，该函数返回值表示当前 pass 是否修改过传入参数的内容；新 Pass 机制使用`run`函数实现优化，该函数返回值表示当前 pass 是否会改变某些 Analysis Pass 的结果。
- 注册：旧 Pass 机制需要使用预定义的宏生成`initialize...`函数，并定义新的`PassInfo`后注册；新版本 Pass 机制只需要通过`FPM.addPass()`注册。

以`FlattenCFGPass`为例，两者的 pass 定义和实现代码如下：

```cpp
// Legacy Pass
struct FlattenCFGLegacyPass : public FunctionPass {
  static char ID; // Pass identification, replacement for typeid
public:
  FlattenCFGLegacyPass() : FunctionPass(ID) {
    initializeFlattenCFGLegacyPassPass(*PassRegistry::getPassRegistry());
  }
  bool runOnFunction(Function &F) override;

  void getAnalysisUsage(AnalysisUsage &AU) const override {
    AU.addRequired<AAResultsWrapperPass>();
  }

private:
  AliasAnalysis *AA;
};

bool FlattenCFGLegacyPass::runOnFunction(Function &F) {
  AA = &getAnalysis<AAResultsWrapperPass>().getAAResults();
  bool EverChanged = false;
  // iterativelyFlattenCFG can make some blocks dead.
  while (iterativelyFlattenCFG(F, AA)) {
    removeUnreachableBlocks(F);
    EverChanged = true;
  }
  return EverChanged;
}

// New Pass
struct FlattenCFGPass : PassInfoMixin<FlattenCFGPass> {
  PreservedAnalyses run(Function &F, FunctionAnalysisManager &AM);
};

PreservedAnalyses FlattenCFGPass::run(Function &F,
                                      FunctionAnalysisManager &AM) {
  bool EverChanged = false;
  AliasAnalysis *AA = &AM.getResult<AAManager>(F);
  // iterativelyFlattenCFG can make some blocks dead.
  while (iterativelyFlattenCFG(F, AA)) {
    removeUnreachableBlocks(F);
    EverChanged = true;
  }
  return EverChanged ? PreservedAnalyses::none() : PreservedAnalyses::all();
}
```

两者的 pass 注册代码如下：

```cpp
// Legacy Pass
char FlattenCFGLegacyPass::ID = 0;

INITIALIZE_PASS_BEGIN(FlattenCFGLegacyPass, "flattencfg", "Flatten the CFG",
                      false, false)
INITIALIZE_PASS_DEPENDENCY(AAResultsWrapperPass)
INITIALIZE_PASS_END(FlattenCFGLegacyPass, "flattencfg", "Flatten the CFG",
                    false, false)

#define INITIALIZE_PASS_BEGIN(passName, arg, name, cfg, analysis)              \
  static void *initialize##passName##PassOnce(PassRegistry &Registry) {

#define INITIALIZE_PASS_DEPENDENCY(depName) initialize##depName##Pass(Registry);
#define INITIALIZE_AG_DEPENDENCY(depName)                                      \
  initialize##depName##AnalysisGroup(Registry);

// 上述宏展开后的函数
// static void *initializeFlattenCFGLegacyPassPassOnce(PassRegistry &Registry) {
//   initializeAAResultsWrapperPassPass(Registry);
//   PassInfo *PI =
//       new PassInfo("Flatten the CFG", "flattencfg", &FlattenCFGLegacyPass::ID,
//                    PassInfo::NormalCtor_t(callDefaultCtor<FlattenCFGLegacyPass>),
//                    false, false);
//   Registry.registerPass(*PI, true);
//   return PI;
// }
// static llvm::once_flag InitializeFlattenCFGLegacyPassPassFlag;
// void llvm::initializeFlattenCFGLegacyPassPass(PassRegistry &Registry) {
//   llvm::call_once(InitializeFlattenCFGLegacyPassPassFlag,
//                   initializeFlattenCFGLegacyPassPassOnce, std::ref(Registry));
// }

// New Pass
FunctionPassManager FPM;
FPM.addPass(CREATE_PASS);
```

### 参考资料

- [Writing an LLVM Pass](https://llvm.org/docs/WritingAnLLVMNewPMPass.html)
- [LLVM New Pass Manager](https://llvm.org/docs/NewPassManager.html)
- [LLVM Legacy Pass](https://llvm.org/docs/WritingAnLLVMPass.html)
- [LLVM Pass 其零：新的 Pass 机制](https://cloud.tencent.com/developer/article/2259875)
- [LLVM Pass 其一：PassManager](https://cloud.tencent.com/developer/article/2259878)
- [LLVM Pass 其二：Analysis 与 AnalysisManager](https://cloud.tencent.com/developer/article/2259881)
