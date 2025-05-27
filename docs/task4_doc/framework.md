## 总览

本次实验的目录结构如下：

```text
task4/
├── CMakeLists.txt
├── ConstantFolding.cpp
├── ConstantFolding.hpp
├── Mem2Reg.cpp
├── Mem2Reg.hpp
├── README.md
├── StaticCallCounter.cpp
├── StaticCallCounter.hpp
├── StaticCallCounterPrinter.cpp
├── StaticCallCounterPrinter.hpp
├── llm
│   ├── LLMHelper.cpp
│   ├── LLMHelper.hpp
│   ├── PassSequencePredict.cpp
│   ├── PassSequencePredict.hpp
│   ├── __init__.py
│   └── prompts
│       ├── PassSeqPredSysPrTpl.xml
│       ├── PassSeqPredUserPrTpl.xml
│       ├── PassSummarySysPrTpl.xml
│       └── PassSummaryUserPrTpl.xml
└── main.cpp
```

实验四主目录下，除`main.cpp`外，是传统方法相关的代码文件，代表各种 LLVM Pass，例如常量折叠`ConstantFolding`、内存到寄存器`Mem2Reg` 和函数调用计数器 `StaticCallCounter`，供同学们参考。更详细的介绍可以查阅[传统方法](#classic-method)以及[优化算法](task4_doc/optimizations.md)两个章节。

主目录下的 `llm` 文件夹中，是大语言模型方法相关的代码文件，包括`LLMHelper`类的实现、调用 LLM 辅助优化的 LLVM Pass（例如 `PassSequencePredict`） 是一个示例参考。`llm` 文件夹下的 `prompts` 文件夹中是预先设置好的模版提示词，供同学们参考。更详细的介绍可以查阅下面的 [大语言模型方法](#llm-method) 一节。

---

`main.cpp` 中以宏定义的方式区分了传统方法逻辑和大语言模型方法逻辑。task4-class 和 task4-llm 两种构建目标，通过附加相应的宏定义，来生成对应的可执行文件。

`main.cpp` 的大致结构如下所示：

```cpp
/* 公共头文件和传统方法需要的头文件 */

#ifdef TASK4_LLM
/* LLM 方法需要的头文件 */
#endif

void
opt(llvm::Module& mod)
{
  /* 公共代码逻辑 */

#ifdef TASK4_LLM
  /* 添加 LLM 辅助编译优化的 LLVM Pass */
#else
  /* 添加传统方法的 LLVM Pass */
#endif

  /* 其他公共代码逻辑 */
}

int
main(int argc, char** argv)
{
  /* 公共代码逻辑 */
  /* 文件读取操作等 */
}
```

## 传统方法 :id=classic-method

本次实验的传统方法框架主要分为以下两部分：

- 注册 LLVM Pass：在`main.cpp`中注册需要使用的 Transform Pass 和 Analysis Pass，并指定优化顺序
- 实现 LLVM Pass：在 `optimizor.hpp` 中定义需要使用的 Transform Pass 和 Analysis Pass 类，并在其他文件中进行实现

注意，增加文件后需要按照本节[清理缓存](#清理缓存)的方式重新配置 CMake 缓存，否则会导致报错。

### 注册 LLVM Pass

注册 LLVM Pass 的代码主要在`main.cpp`的`opt()`函数中：

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

#ifdef TASK4_LLM
  /* ... */
#else
  // 添加Transform Pass到管理器中
  MPM.addPass(sysu::HelloWorldPass(llvm::errs()));
  MPM.addPass(sysu::StaticCallCounterPrinter(llvm::errs()));
  /* 在此处添加你需要注册的Transform Pass */

#endif

  // 运行Transform Pass
  MPM.run(mod, MAM);
}
```

以上代码清晰地展现了 Transform Pass 和 Analysis Pass 的注册方法：

- Transform Pass：使用`MPM.addPass(sysu::optPass())`函数注册
- Analysis Pass：使用`MAM.registerPass([]() { return sysu::analysisPass(); })`函数注册

将 Transform Pass 和 Analysis Pass 注册到`MPM`和`MAM`中表示对整个 LLVM Module 起作用。如果想实现更细粒度的优化，可以尝试注册到`FPM/FAM`、`LPM/LAM`，针对单个函数或单个循环进行优化。为了简化代码，本实验统一注册到`MPM/MAM`，这样可以从 LLVM Module 获取所有的函数和循环，进而进行优化。

需要注意的是 Transform Pass 的执行顺序与第三部分 Transform Pass 注册的顺序相同，因此在需要考虑优化次序对优化结果的影响，谨慎确定注册的顺序。而 Analysis Pass 只会在被使用时执行，因此 Analysis Pass 的注册顺序不影响执行顺序。

实例化 Transform Pass 时我们传入了`llvm::errs()`，将 Pass 过程的中间结果输出到标准错误流中，方便同学们进行[调试](task4_doc/overview.md#debug)。

### 实现 Transform Pass

以实现常量折叠优化`ConstantFolding`为例，首先将其定义添加到`optimizor.hpp`中：

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

- 所有 Transform Pass 都继承于`llvm::PassInfoMixin`类，接受 Pass 的名称作为模板参数中，初始化该 Pass
- Transform Pass 需要定义与实现`run()`函数，在该函数内同学们对生成的 LLVM IR 进行分析与变换，返回值表示该 Pass 是否会对分析 Pass 产生影响
- 在 Pass 运行时使用`llvm::raw_ostream &OS`进行输出

由于本实验基于 LLVM 17，因此不支持旧版本 LLVM 提供的基于继承`ModulePass`、`FunctionPass`等类的 Transform Pass 实现，新旧版本 Pass 机制的区别请阅读[Legacy Pass](#legacy-pass)一节。常量折叠的`run`函数主体代码如下：

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

以实现分析函数调用次数的`StaticCallCounter`为例，首先将其定义添加到`optimizor.hpp`中：

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

- 所有的 Analysis Pass 都继承于`llvm::AnalysisInfoMixin`，`llvm::AnalysisInfoMixin`继承于 Transform Pass 的继承对象 `llvm::PassInfoMixin`
- Analysis Pass 需要声明`static llvm::AnalysisKey Key`，因为其将作为 Analysis Pass 区别于其他 Pass 的唯一标识符被`AnalysisInfoMixin::ID()`函数返回
- Analysis Pass 需要声明`friend struct llvm::AnalysisInfoMixin<passName>`，否则`llvm::AnalysisKey Key`会因为是`AnalysisInfoMixin`的私有变量而报错
- Analysis Pass 的 `run()` 函数返回自定义的结果而非`llvm::PreservedAnalyses`

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

注意`static llvm::AnalysisKey Key`是一个静态成员变量，在实现时需要额外声明，否则会出现静态变量未声明的报错。定义和实现 Analysis Pass 后，我们可以在其他 Pass 中调用该 Pass，例如下面的`StaticCallCounterPrinter`调用了`StaticCallCounter`，将分析结果以表格的形式输出到文件中：

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

可以通过`run()`函数传入的`ModuleAnalysisManager &MAM`调用在`MAM`中注册过的 Analysis Pass，返回类型为被调用的 Analysis Pass 的`run()`函数中自定义的返回类型。通过 Analysis Pass 和 Transform Pass 的灵活组合，同学们可以实现许多代码优化算法。

### 清理缓存

增加新的 Pass 文件后，直接构建 task4-score 时可能会报错`undefine reference ...`，这是因为增加新文件后 CMake 的缓存未更新，导致新增文件未参与编译链接导致的。因此，在增加新文件后，需要像下图一样，清理缓存，并重新构建 CMake 配置：

![删除CMake Cache](../images/task4/delete_cache.png)

### Legacy Pass

本小节主要介绍新旧版本 LLVM 的 Pass 机制（下简称新 Pass 和旧 Pass）的不同，为拓展内容，同学们可以选择性阅读。

新旧 Pass 对于开发者而言，最明显的区别是代码量。旧 Pass 由于设计问题，需要编写很多代码完成一个工作。而重构后的新 Pass 变得非常简洁与高效，使得开发者能够更方便地为 LLVM 添加优化。

具体而言，两者的区别如下：

- **继承**：旧 Pass 的继承比较“细粒度”，例如继承`FunctionPass`表示该 Pass 针对单个 fuction 进行优化，当优化对象为 module 和 loop 等结构时需要继承对应的类。新 Pass 统一继承`PassInfoMixin`类。
- **定义**：
  - 旧 Pass 需要声明 ID，该 ID 将作为区分不同 Pass 的唯一标识符，同时 ID 作为静态成员变量，需要在结构体定义外初始化。新 Pass 以继承`PassInfoMixin`时传入的模板名，作为 Pass 的标识符。
  - 旧 Pass 需要调用`initializexxxx()`函数进行初始化，这个初始化函数需要通过给 LLVM 预定义的宏传入参数生成，而新 Pass 则不需要额外初始化。
  - 旧 Pass 中需要使用 Analysis Pass，需要定义`getAnalysisUsage()`函数并通过`AU.addRequired<...>()`手动添加 Analysis Pass。新 Pass 则只需要给 `run()` 函数中传入对应的 Analysis Pass 管理器，例如传入`FunctionAnalysisManager &FAM`，即可在函数内使用在 FAM 注册过的 Analysis Pass。
- **实现**：旧 Pass 使用`runOnFunction()`函数实现优化，函数返回值表示当前 Pass 是否修改过传入参数的内容。新 Pass 使用`run()`函数实现优化，函数返回值表示当前 Pass 是否会改变某些 Analysis Pass 的结果。
- **注册**：旧 Pass 需要使用预定义宏生成`initializexxx()`函数，并定义新的`PassInfo`后注册。新版本 Pass 只需要通过`addPass()`注册。

---

以实现`FlattenCFGPass`为例，旧 Pass 的注册如下：

```cpp
// 声明ID，并在定义外进行初始化
char FlattenCFGLegacyPass::ID = 0;
// 利用LLVM的预定义宏生成初始化函数
INITIALIZE_PASS_BEGIN(FlattenCFGLegacyPass, "flattencfg", "Flatten the CFG", false, false)
INITIALIZE_PASS_DEPENDENCY(AAResultsWrapperPass)
INITIALIZE_PASS_END(FlattenCFGLegacyPass, "flattencfg", "Flatten the CFG", false, false)
```

预定义宏形如：

```cpp
#define INITIALIZE_PASS_BEGIN(passName, arg, name, cfg, analysis)  static void *initialize##passName##PassOnce(PassRegistry &Registry) {
#define INITIALIZE_PASS_DEPENDENCY(depName) initialize##depName##Pass(Registry);
```

最终，上面的宏展开为：

```cpp
static void *initializeFlattenCFGLegacyPassPassOnce(PassRegistry &Registry) {
  initializeAAResultsWrapperPassPass(Registry);
  PassInfo *PI =
      new PassInfo("Flatten the CFG", "flattencfg", &FlattenCFGLegacyPass::ID,
                   PassInfo::NormalCtor_t(callDefaultCtor<FlattenCFGLegacyPass>),
                   false, false);
  Registry.registerPass(*PI, true);
  return PI;
}
static llvm::once_flag InitializeFlattenCFGLegacyPassPassFlag;
void llvm::initializeFlattenCFGLegacyPassPass(PassRegistry &Registry) {
  llvm::call_once(InitializeFlattenCFGLegacyPassPassFlag,
                  initializeFlattenCFGLegacyPassPassOnce, std::ref(Registry));
}
```

旧 Pass 的定义和实现如下：

```cpp
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
```

---

新 Pass 的注册如下：

```cpp
FunctionPassManager FPM;
FPM.addPass(CREATE_PASS);
```

新 Pass 的定义和实现如下：

```cpp
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

显然，编写新 Pass 的代码量大大减少，且代码更为简洁易读。

### 参考资料

- [Writing an LLVM Pass](https://llvm.org/docs/WritingAnLLVMNewPMPass.html)
- [LLVM New Pass Manager](https://llvm.org/docs/NewPassManager.html)
- [LLVM Legacy Pass](https://llvm.org/docs/WritingAnLLVMPass.html)
- [LLVM Pass 其零：新的 Pass 机制](https://cloud.tencent.com/developer/article/2259875)
- [LLVM Pass 其一：PassManager](https://cloud.tencent.com/developer/article/2259878)
- [LLVM Pass 其二：Analysis 与 AnalysisManager](https://cloud.tencent.com/developer/article/2259881)

## 大语言模型方法 :id=llm-method

本次实验的大语言模型方法框架主要分为以下两部分：

- 封装调用 LLM 的 `openai` API，模拟多轮对话：编写 Python 脚本 `__init__.py` 封装 `openai` 库的 API，模拟多轮对话，借助 `pybind11` 库，在 `LLMHelper` 中进一步封装为 C++ 接口，同学们可以直接使用 `LLMHelper` 这个类来进行 LLM API 的调用。
- 调用封装模块，运用 LLM 辅助 LLVM IR 的分析与优化：编写 LLVM Pass 和提示词，调用 LLM 辅助编译优化。在 `main.cpp` 中使用 LLM 辅助的 LLVM Pass 完成 LLVM IR 的变换，灵活运用大语言模型实现性能优化，而同学们的任务就在于此。

### 提示工程

在详细讲解代码框架之前，首先同学们简要介绍一下提示工程，已经了解提示工程以及 LLM API 调用方式的同学可以跳过此节。

**大语言模型**（Large Language Model，**LLM**）本质上只是一个预测模型，给定一段输入文本，又称为**提示词**（**Prompt**），LLM 会根据自己在预训练和微调过程中“学习”过的海量训练数据，预测下一个最有可能出现的词（**Token**）是什么，并将其加入到输出末尾，然后接着预测下一个 Token 是什么。它会不断地重复以上过程，最终形成一份完整的回答。

LLM 的输出在很大程度上依赖于用户提供的 Prompt。消耗了巨大的计算资源和维护资源，学习了海量的数据，拥有动辄几十亿、上百亿的参数数的 LLM 本身是十分聪明的，但是其目标是不明确的，因此需要用户撰写高效的提示词为其布置任务，设置出发点，使得 LLM 尽可能生成具体的、可操作的、任务相关且符合用户期望的内容。当 LLM 没有生成预期响应时，可以进一步调整 Prompt，使用提示工程中的种种技术，得到 LLM 的高质量回复。

提示词的作用可以理解为给 LLM 这个预测模型设定一个初始状态，并引导其走向用户所期望的生成序列，其可以是一段非常简单的指令，也可以很复杂，例如可以包含补充背景知识信息的上下文（**Context**）、任务描述、风格与角色、格式规范等等。LLM 生成内容的质量直接取决于提示词有多明确、多详细，以及提示词是否是结构化的。

**提示工程**（Prompt Engineering）是指撰写高效提示词的过程，旨在通过设计和优化提示词来引导 LLM 生成更符合用户期望的内容。提示工程的核心在于理解 LLM 的工作原理，并利用其特性来构建有效的提示词。

---

在与 LLM 打交道，尤其是通过 API 在 LLM 应用中与其交互进行对话补全，也即常用的聊天对话服务时，经常会碰到下述几个参数，其可以直接控制 LLM 的行为：

- `max_tokens`：一次 API 请求中 LLM 生成的内容的**最大 Token 数量**。这与上下文长度不同，输入 Token 和输出 Token 的长度会进一步受到上下文长度的限制。此参数太小可能会让 LLM 戛然而止，无法输出足够有效的内容；太大可能会导致 LLM 响应时间过长，在关键信息之后输出许多无意义的填充性内容，从经济角度来看也会浪费 API 配额。
- `temeprature`：**采样温度**，介于 0-1 之间，控制 LLM 回复的随机性（创意性）。采样温度越低，则 LLM 的回复越稳定和集中，较为“保守”。采样温度越高，则 LLM 的回复随机性越强，越不可预测。LLM 会考虑更多的可能性，增加不太可能出现的 Token 的概率，降低了较可能出现的 Token 的概率，更加富有“创意”，不过也可能会输出更加离谱的内容。
- `top-p`：又称为**核采样**（Nuclear Sampling），是一个概率阈值，介于 0-1 之间，同样用于管理 LLM 输出的随机性。只有累计出现概率超过这个阈值的 Tokens 才会被考虑。其值越低，则 LLM 的输越具有创造性，反之则越可预测
- `stream`：**流式输出**，布尔值。如果为真则 LLM 断断续续返回输出结果，每次返回一个输出块（Chunk），这些块最终结合起来就是一个完整输出。在网页中使用 LLM 服务进行交互时，都是采用流式输出的方式，一块一块地在屏幕上显示出 LLM 的响应，以减少用户的等待时间，提升用户体验。如果 `stearm` 为假则 LLM 生成全部内容后才会返回输出结果。

LLM API 的参数是相互影响的，`temperature` 通常不建议与 `top-p` 一起使用，`temperature = 0` 将会导致 `top-p` 失效。没有什么配置参数是一劳永逸的，需要用户根据自身需求和具体任务来设置。

---

在调用 LLM API 进行对话补全时，每一条提示词都带有**角色**（Role）字段，标明提示词的类型，常见的角色有以下三种：

- `system`：系统级提示词，设置对话的初始语境，对 LLM 进行身份设定，为整个对话奠定基调，让 LLM 理解自己是谁，任务是关于什么方面的，应当在对话中如何表现自己。系统级提示词并不会被 LLM 进行直接的回答，而是作为上下文影响之后的回复的风格和内容。

- `user`：用户级提示词，表示用户直接对 LLM 提出的请求、命令和问题，这是 LLM 需要直接做出回应的内容。

- `assistant`：大模型的过往回答，用于构建多轮对话的上下文，使得 LLM 能够记住自己曾经说过什么。LLM 会将这些内容作为历史对话，影响接下来的回答。如果没有 assistant 消息， 则 LLM 会认为这是第一次回答。

---

一个标准且全面的提示词可以包含以下几个关键部分，它们共同指引 LLM 输出用户期望的内容。虽然并不是每个提示词都必须包含这几个部分，但是了解每个部分可以帮助我们创建更加高效、有针对性的提示词：

1. 角色（Role）：告诉模型“你是谁”，为 LLM 指定一个角色，也称为**人物设定**。通过让 LLM 扮演某个特定角色，并指定其背景知识、专业技能、语气和风格等等，促使其根据指定的角色来调整回复内容，特别是针对对于特定领域的对话。
2. 指令（Instruction）：明确模型任务，明确告诉 LLM 应该执行什么任务，如代码编写、翻译等，可以用一句话概括，也可以对 LLM 提出各种要求和限制，如限制输出格式和敏感词设置等。没有明确的指令，LLM 就会像无头苍蝇到处乱撞，不清楚自己的工作内容。
3. 示例（Example）：示范正确输出方式，提供示例可以帮助 LLM 理解如何回复，设置回复格式、风格和结构，尤其是在任务较为复杂的时候。
4. 上下文（Context）：提供背景信息，补充背景知识、数据、事实等额外信息，也可以是历史对话。

不是每一个部分都会包含在每一段提示词中，也没有单一的、“正确”的顺序去安排各个部分，通常建议在正式的任务中，提示词至少包含角色和指令，以及一些额外的信息。

---

提示工程中包含多种提示策略，比较简单和常用的如：

1. **零样本**（Zero-shot）：最为简单直接的提示方法，不提供任何示例，直接描述任务或进行提问，LLM 回复的质量完全依赖于其通过预训练和微调所学习到的知识，适用于简单的任务。
2. **少样本**（Few-shot/One-shot）：除了提供任务描述和问题，还需提供一到几个示例，让 LLM 识别出其中的输入输出模式，模仿示例，生成更加准确的回复。示例也可以考虑一些边缘情况。
3. **思维链**（Chain-of-thought）：提示模型逐步展开推理过程，一步一步进行思考以解决问题。LLM 会先输出推理过程，再输出最终的答案。思维链能够显著提升 LLM 在数学题等需要逻辑推理和思考的任务中的表现。
4. **检索生成增强**（Retrieval-Augmented Generation，**RAG**）：LLM 作为一种静态语言模型，其内部知识完全依赖于训练过程中吸收的语料库，而 RAG 技术将 LLM 与外部知识库链接起来，以补充实时信息。当用户的提示词到来时，RAG 引擎会通过嵌入模型和重排序模型，根据用户的提示词，对预先建立好的、可随时更新且更新成本相比训练 LLM 小得多的知识库进行检索，并将检索到的相关知识，作为用户提示词中的上下文，一起作为 LLM 的输入，以期望 LLM 生成更为准确和实时的内容。

### 调用 LLM

同学们可以使用 `LLMHelper` 这个类来进行对任何兼容 `OpenAI` 接口的 LLM 的调用，其声明与定义分别在 `LLMHelper.hpp` 和 `LLMHelper.cpp` 中。这个类的主要目的是提供一个接口，底层通过调用 Python 模块与 LLM 交互（可以查看`LLMHelper.cpp`）。Python 模块实现在 `llm/__init__.py` 中。

`LLMHelper`类的`public` 成员变量和方法如下所示：

```cpp
class LLMHelper
{
public:
  enum class Role : std::uint8_t
  {
    kUser,
    kSystem,
    kAssistant,
  };

  LLMHelper(llvm::StringRef apiKey, llvm::StringRef baseURL);

  std::string create_new_session();

  void delete_session(llvm::StringRef sessionID);

  void add_content(llvm::StringRef sessionID,
                   Role role,
                   llvm::StringRef content);

  std::string chat(llvm::StringRef sessionID,
                   llvm::StringRef model,
                   const pybind11::list& handlers,
                   const pybind11::dict& params);
};
```

- 构造函数：通过传入 `apiKey` 和 `baseUrl`，来指定要使用的大语言模型以及认证凭证。
- `create_new_session()`：创建一场对话。同学们每次重新打开网页或者 APP，向 LLM 发送第一条消息时，就创建一场新的对话。函数返回值为对话 ID（`sessionID`），在 LLM 服务的网页端开启一场对话后，都能在网页 URL 的尾部看到一串表示对话 ID 的字符串。例如 [DeepSeek](https://chat.deepseek.com/)，其某个对话的 URL 可能形如`https://chat.deepseek.com/a/chat/s/114514-1919180-xxxx-xxxx-xxxxx`，其尾部的 `114514-1919180-xxxx-xxxx-xxxxx` 部分就是`sessionID`，它唯一标识了一场对话。
- `delete_session()`：删除一场对话，包括其内部的所有对话记录。
- `add_content()`：向一场对话中发送消息（提示词），其中
  - `sessionID` 指定了是哪一场对话；
  - `role` 指定了身份，可以是`system`、`user`和`assistant`；
  - `content` 则为消息的具体内容。
- `chat()`：发送对话，获得大语言模型的回复。

  - `sessionID` 指定要发送哪一场对话；
  - `model` 指定要使用哪一个模型，例如 `deepseek-reasoner` 或者 `deepseek-chat`；
  - `handlers` 用于处理大语言模型的回复，例如识别并去除 LLM 回复中的特定信息（比如`deepseek-r1` 模型的回复中以 `</think>` 结尾的思维链）。

    `handlers` 是一个 Python 的 `list` 对象，其元素为 Python 函数，每一个函数都是以字符串作为参数，并且返回处理好的字符串。`handlers` 中的函数按照其加入列表的顺序依次作用于 LLM 的回复；

  - `params`，本次对话请求中的其他参数，例如 `temperature`，`stream`，`max_tokens` 等等目标 LLM 支持的参数。`params`是一个 Python 的字典类型。

---

以下是一个使用 `LLMHelper`类的简要示例：

```cpp
#include "LLMHelper.h"
// 要想在 C++ 中使用 Python 语言特性，需要包含此头文件
#include <pybind11/embed.h>
// 使用 pybind11 定义的字面量语法
using namespace pybind11::literals;

// 初始化 Python 解释器，使得可以使用 Python 语言特性
// 仅能在 guard 所在的作用域内使用 Python 语言特性
pybind11::scoped_interpreter guard {};

// 导入 sys 包，添加实验四的路径到 sys.path 中，方便 import llm
pybind11::module_ sys = pybind11::module_::import("sys");
sys.attr("path").attr("append")("<task4_dir>");

// 初始化 LLMHelper，传入 api_key 和 base_url
auto helper = LLMHelper("<api_key>", "<base_url>");

// 新建一场对话
std::string sessionID helper.create_new_session();

// 加入消息（提示词）
// 系统级提示词
std::string systemPrompt = "你是一位得力助手，能很好的解决用户的问题";
helper.add_content(sessionID, LLMHelper::Role::kSystem, systemPrompt);
// 用户级提示词
std::string userPrompot = "你好！";
helper.add_content(sessionID, LLMHelper::Role::kUser, userPrompot);

// 创建 handlers
auto handlers = pybind11::list();

// 导入 `llm/__init__.py`，去除思维链的函数在此文件中
pybind11::module_ llm = pybind11::module_::import("llm");
// 获得去除 deepseek-r1 思维链的函数
auto remove_deepseek_r1_think = llm.attr("remove_deepseek_r1_think");
// 加入到 handlers 中
handlers.attr("append")(remove_deepseek_r1_think);

// 其他请求参数，使用用户定义字面量语法
auto params = pybind11::dict("max_tokens"_a = 8192, "stream"_a = false, "temperature"_a = 0);

// 发送对话，获得回复
std::string response = helper.chat(sessionID, "deepseek-reasoner", handlers, params);

// 删除对话
helper.delete_session(sessionID);
```

1. 首先需要包含相应的头文件；
2. 为了在 C++ 中调用 Python 模块，以及使用一些必要的 Python 语言特性，需要将 Python 解释器嵌入 C++ 中；`pybind11::scoped_interpreter guard {}` 初始化了解释器，并且限定了只能在 `guard` 所在的作用域中使用 Python 语言特性。对于本例而言，`guard`在“全局变量区”被声明，所以整个程序都可以使用 Python 语言特性；
3. 接着导入 Python 的 `sys` 库，并利用`sys`库将实验四目录添加到包搜索路径中，方便后续导入`llm`包；
4. 创建 `LLMHelper` 的实例，创建对话，添加消息，发送对话，删除对话。

`remove_deepseek_r1_think()` 函数是为了去除 `deepseek-r1` 模型的输出中以 `</think>` 结尾的思维链，其具体实现在 `llm/__init__.py` 中。该文件中，还是实现了其他处理函数：

````py
def remove_deepseek_r1_think(s: str) -> str:
    """去除 deepseek-r1 回复中的思维链 """
    if "</think>" in s:
        s = s.split("</think>", 1)[1].strip()
    return s


def remove_md_block_marker(marker: str):
    def remove(s: str) -> str:
        """去除 LLM 回复中开头和结尾的 markdown 代码块标记 marker"""
        if s.startswith(f"```{markder}"):
            lines = s.splitlines()
            s = "\n".join(lines[1:-1]).strip()
        return s

    return remove


def extract_text_from_xml(tag: str):
    def extract(s: str) -> str:
        """提取 xml 字符串中，第一个 tag 为特定 tag 的节点的 text 内容"""
        et = ET.fromstring(s)
        node = et.find(tag)
        assert node is not None, f"无法找到 tag 为 {tag} 的节点"
        text = node.text
        assert text is not None, "节点中不含有 text！"
        return text.strip()

    return extract
````

### pybind11 简介

`pybind11` 是一个轻量级的 C++ 库，用于将 C++ 代码与 Python 进行绑定，使得 C++ 可以直接调用 Python 的功能，反之亦然。它提供了一种简单的方式来创建 Python 扩展模块，并且能够在 C++ 中使用 Python 对象和函数。

在 `pybind11` 中，要想使用 Python 对象的成员变量和方法，需要使用 `.attr()`，并传入要使用的成员变量和方法的名字，`.attr()` 就等同于 Python 中的点号 `.`。

`pybind11` 中内置了 Python 类型，如 `pybind11::list`、`pybind11::dict`、`pybind11::str()`等。这些类型也可以通过 `.cast<T>` 这一成员函数，转换为其他类型的变量（甚至是 C++ 类型，比如 `std::string`）。

`"max_tokens"_a = 8192` 中的 `_a` 为 `pybind11` 的字面量语法，等同于 `pybind11::arg("max_tokens") = 8192`，都是创建一个命名参数，参数名就是`_a`前面的字符串字面量 `max_tokens`，参数值为等号之后的 8192。这又等同于 Python 中的 `params[max_tokens] = 8192`。此方法也可用在函数传参时的关键字参数。要想使用 `_a`这种字面量语法，需要用 `using namespace pybind11::literals` 引入 `pybind11::literals`。

`pybind11` 并非是实验四的重点，同学们不需要深入了解它。引入此库是为了利用 Python 强大的字符串处理能力以及与 LLM 调用相关的库。同学们可以根据自身的需要在 `llm/__init__.py` 中添加内容并在 C++ 中调用。

更多 pybind11 的介绍请见官方文档：[pybind11 documentation](https://pybind11.readthedocs.io/)

### 编写 LLVM Pass

通过前面的介绍，同学们已经了解了如何借助 `pybind11`库和`LLMHelper`类调用 LLM。大语言模型方法中，仍然需要编写 LLVM Pass，方便和 LLVM 优化工作流相耦合。与传统方法中编写的 LLVM Pass 的不同之处在于，大模型方法中编写的 Pass 的内部，是通过调用 LLM 获得辅助编译优化的信息，进行更好的编译优化决策。

接下来以模版代码中的 `PassSequencePredict` 为例，讲解该如何编写大模型方法中的 LLVM Pass。`PassSequencePredict`这个 Pass 的功能，是根据给定 LLVM IR 和一系列可用的 LLVM Pass（可以是传统方法中的 Pass，也可以是大语言模型方法中的 Pass），通过与大语言模型的交互来预测并应用 LLVM Pass 序列，期望显著提升 LLVM IR 的性能。

---

`PassSequencePredict` 中以`PassInfo`结构体来存储每个可用的 LLVM Pass 的信息：

```cpp
struct PassInfo
{
    std::string mClassName; // Pass 的名字
    std::string mHppPath;   // Pass 的头文件路径
    std::string mCppPath;   // Pass 的实现文件路径
    std::string mSummaryPath;  // 对 Pass 的分析结果保存路径
    std::function<void(llvm::ModulePassManager&)> mAddPass;  // 构造 Pass 实例，并加入模块 Pass 管理器的函数
};

// 存储所有可用的 Pass 信息
std::vector<PassInfo> mPassesInfo;
```

`PassSequencePredict` 的工作逻辑有两步：

1. 调用 LLM，分析可用的 LLVM Pass。

   对每个 Pass，读取其类名、头文件和具体实现，然后发送给大语言模型进行分析总结，得到 Pass 的功能以及对 LLVM IR 所起的作用，并保存到特定的结果文件中，方便分析结果复用，避免重复分析。如果结果文件的最后修改时间晚于 Pass 的头文件或实现文件的最后修改时间，说明上一次 Pass 后，Pass 修改了，因此需要重新分析。

   这一步由 `PassSequencePredict` 中的 `pass_summary()` 函数完成。`pass_summary()` 函数中调用 LLM 时用到的 Prompt 模板已经预先写好并存储在 `llm/prompts/` 文件夹中。其中`PassSummarySysPrTpl` 为系统级提示词模版，`PassSummaryUserPrTpl` 为用户级提示词模版，均为 `xml` 格式。

   这里利用 C++ 读取文件（`read_file()`），得到`std::string`，然后转换为 `pybind11::str`，再调用 `.attr("format")`，也就是 Python 中的 `str.format()` 来格式化字符串，并使用 `_a` 进行关键字传参数：

   ```cpp
   namespace Py = pybind11;
   using pybind11::literals;

   std::string
   PassSequencePredict::pass_summary(PassSequencePredict::PassInfo& passInfo)
   {
     // 判断是否存在输出文件以及其是否过时
     // 对比缓存内容、头文件和实现文件的最后修改时间
     if (Fs::exists(passInfo.mSummaryPath)) {
       auto hppLastWriteTime = Fs::last_write_time(passInfo.mHppPath);
       auto cppLastWriteTime = Fs::last_write_time(passInfo.mCppPath);
       auto summaryLastWriteTime = Fs::last_write_time(passInfo.mSummaryPath);

       if (summaryLastWriteTime >= hppLastWriteTime &&
           summaryLastWriteTime >= cppLastWriteTime) {
         return read_file(passInfo.mSummaryPath);
       }
     }

     // 调用 LLM
     // 读取预先存储在文件中的提示词
     std::string systemPrompt =
       read_file(TASK4_DIR "/llm/prompts/PassSummarySysPrTpl.xml");
     auto userPrompt =
       Py::str(read_file(TASK4_DIR "/llm/prompts/PassSummaryUserPrTpl.xml"))
         .attr("format")("name"_a = passInfo.mClassName,
                         "hpp"_a = read_file(passInfo.mHppPath),
                         "cpp"_a = read_file(passInfo.mCppPath))
         .cast<std::string>();

     // 创建会话
     std::string sessionID = mHelper.create_new_session();
     mHelper.add_content(sessionID, Role::kSystem, systemPrompt);
     mHelper.add_content(sessionID, Role::kUser, userPrompt);

     Py::module_ llm = Py::module_::import("llm");
     Py::list handlers;
     handlers.append(llm.attr("remove_deepseek_r1_think"));
     handlers.append(llm.attr("remove_md_block_marker")("xml"));
     std::string response = mHelper.chat(
       sessionID,
       "deepseek-r1",
       handlers,
       Py::dict("max_tokens"_a = 8192, "stream"_a = false, "temperature"_a = 0));

     write_file(passInfo.mSummaryPath, response);

     // 删除会话
     mHelper.delete_session(sessionID);
     return response;
   }
   ```

2. 预测 Pass 应用序列，并应用到 LLVM IR 上。

   分析完所有给定的 LLVM Pass 后，将各个 Pass 的分析结果拼接，连同输入的 LLVM IR，一起发送给大语言模型进行 Pass 序列的预测，此部分逻辑在 `run` 函数中：

   ```cpp
   llvm::PreservedAnalyses
   PassSequencePredict::run(llvm::Module& mod, llvm::ModuleAnalysisManager& mam)
   {
     // 生成 pass summary
     std::string passSummary;
     for (auto& passLocation : mPassesInfo) {
       passSummary.append(pass_summary(passLocation));
     }

     // 将 LLVM::Module 转换为字符串，发送给大模型进行 IR 的分析
     std::string module;
     llvm::raw_string_ostream os(module);
     mod.print(os, nullptr, false, true);
     os.flush();

     // 读取提示词
     std::string systemPrompt =
       read_file(TASK4_DIR "/llm/prompts/PassSeqPredSysPrTpl.xml");
     auto userPrompt =
       Py::str(read_file(TASK4_DIR "/llm/prompts/PassSeqPredUserPrTpl.xml"))
         .attr("format")("ir"_a = module, "passes"_a = passSummary)
         .cast<std::string>();

     // 创建 LLM 会话
     auto sessionID = mHelper.create_new_session();
     mHelper.add_content(sessionID, Role::kSystem, systemPrompt);
     mHelper.add_content(sessionID, Role::kUser, userPrompt);

     // 处理大语言模型回复
     Py::list handlers;
     Py::module_ utils = Py::module_::import("yatcc_llm.utils");
     handlers.append(utils.attr("remove_deepseek_r1_think"));
     handlers.append(utils.attr("remove_md_block_marker")("xml"));
     // 提取 pass sequence
     handlers.append(utils.attr("extract_text_from_xml")("sequence"));

     // 发送会话
     std::string response = mHelper.chat(
       sessionID,
       "deepseek-r1",
       handlers,
       Py::dict("max_tokens"_a = 8192, "temperature"_a = 0, "stream"_a = false));

     // 将字符串形式的 pass sequence 转换为 Py::list
     auto passSequence = Py::str(response).attr("split")(",").cast<Py::list>();

     // 定义 pass 类名到 <向 ModulePassManager 添加其实例的函数> 的映射
     std::unordered_map<std::string, std::function<void(llvm::ModulePassManager&)>>
       map;
     for (auto& passInfo : mPassesInfo) {
       map[passInfo.mClassName] = passInfo.mAddPass;
     }

     // 向 mpm 中添加 pass
     llvm::ModulePassManager mpm;
     for (auto& passClassName : passSequence) {
       map[passClassName.cast<std::string>()](mpm);
     }
     mpm.run(mod, mam);

     // 删除会话
     mHelper.delete_session(sessionID);

     // 不需要保留任何分析结果
     return llvm::PreservedAnalyses::none();
   }
   ```

   该函数中：

   1. 首先调用`pass_summary()`函数分析所有可用的 LLVM Pass，并将其分析结果拼接成一个字符串 `passSummary`；
   2. 然后从 `llm/prompts` 文件夹中读取系统级和用户级提示词模板，分别为 `PassSeqPredSysPrTpl.xml` 和 `PassSeqPredUserPrTpl.xml`，填充模板并发送给模型，让模型生成推荐的 Pass 序列；
   3. 最后解析返回的 Pass 序列，构建模块 Pass 管理器，将 Pass 添加到模块并运行，进行优化。

---

完成 `PassSequencePredict` 这个 LLM 加持下的 Pass 后，就可以在 `main.cpp` 中的 `TASK4_LLM` 宏定义中使用。下面的代码以传统方法中的三种示例 LLVM Pass 作为可用 Pass，然后用 `PassSequencePredict` 做 Pass 序列预测：

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

#ifdef TASK4_LLM
  // 使用 LLM 技术来辅助编译优化
  // 初始化 Python 解释器
  Py::scoped_interpreter guard{};
  // import sys 库，添加 TASK4_DIR 到寻找 Python 库的 path 中
  Py::module_ sys = Py::module_::import("sys");
  sys.attr("path").attr("append")(TASK4_DIR);

  // 添加 LLM 加持的 Pass 到优化管理器中
  mpm.addPass(PassSequencePredict(
    "<api_key>",
    "<base_url>",
    {
      { "StaticCallCounterPrinter",
        TASK4_DIR "/StaticCallCounterPrinter.hpp",
        TASK4_DIR "/StaticCallCounterPrinter.cpp",
        "StaticCallCounterPrinter.xml",
        [](llvm::ModulePassManager& mpm) {
          mpm.addPass(StaticCallCounterPrinter(llvm::errs()));
        } },
      { "Mem2Reg",
        TASK4_DIR "/Mem2Reg.hpp",
        TASK4_DIR "/Mem2Reg.cpp",
        "Mem2Reg.xml",
        [](llvm::ModulePassManager& mpm) { mpm.addPass(Mem2Reg()); } },
      { "ConstantFolding",
        TASK4_DIR "/ConstantFolding.hpp",
        TASK4_DIR "/ConstantFolding.cpp",
        "ConstantFolding.xml",
        [](llvm::ModulePassManager& mpm) {
          mpm.addPass(ConstantFolding(llvm::errs()));
        } },
    }));
#else
  /* ... */
#endif

  // 运行Transform Pass
  MPM.run(mod, MAM);
}
```

### 提示词参考

在 `llm/prompts/` 目录下提供了 `PassSequencePredict` 工作流中两个步骤的提示词参考，并且分为系统级提示词和用户级提示词，均为 `xml` 格式。

以下是第一步 Pass 分析的系统级提示词：

```xml
<task>
  你是一位熟悉 LLVM 和 C++17 的编译优化专家，精通 LLVM IR、LLVM Pass 和相关优化技术。你可以深入分析用 C++17 和 LLVM 库编写的 LLVM Pass 代码，并准确解释其功能。
  <instructions>
    1. 分析用户提供的 LLVM Pass 类名，以及对应的头文件和实现文件；
    2. 总结这个 Pass 的功能，实现了什么优化，它如何影响 LLVM IR；
    3. 提供有价值的见解，以帮助他人更好地理解代码;
    4. 遵循以下 xml 格式进行输出:
    <pass>
      <name>
        {{ LLVM Pass 类名，即用户指定需要分析的 LLVM Pass }}
      </name>
      <description>
        {{ 优化方法概述 }}
      </description>
      <effect>
        {{ 对 LLVM IR 起到的效果 }}
      </effect>
    </pass>
    5. 不要输出任何额外的信息，务必按照上述要求进行回复。
  </instructions>
</task>
```

通常编写提示词与 LLM 进行交互，采用的是 `markdown`、`json` 格式或者仅仅是一段话，没有固定格式。`xml` 格式的提示词为 Anthropic 公司所推荐，并且比较适合该公司的 `Claude` 系列大语言模型。

`xml` 格式的提示词容易解析，并且各个组件结构分明，适合人类阅读，还可以用双花括号 `{{ }}` 标出 LLM 需要填充的内容。单花括号 `{ }` 包裹的内容，在使用 Python 的 `str.format` 方法处理模板时，会被当作格式化字符串的占位符，进行填充。

我们鼓励同学们探索不同风格的提示词，来探索不同提示词的效果。

### 提示

1. 推荐同学们优先实现传统方法中的强度削弱（StrengthReduction）、公共子表达式消除（Common Subexpression Elimination，CSE）和循环无关变量移动（Loop-invariant code motion，LICM）三种优化算法。这三种 Pass 拿去让 LLM 做 Pass 序列预测时，可能相对比较有效；
2. 同学们可以针对 `PassSequencePredict` 这一 LLM 辅助编译优化方法，撰写更优质的提示词，使得 LLM 的回复质量更高；
3. 除了 `PassSequencePredict`，还可以探索让 LLM 直接进行 IR 变换或者辅助优化决策的制定（让 LLM 判断是否进行函数内敛、循环展开因子）等，同学们可以自由探索。
