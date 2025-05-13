## 传统方法框架介绍

本次实验的传统方法框架主要分为以下两部分：

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

## 大语言模型方法框架介绍

本次实验的大语言模型方法框架主要分为以下两部分：

- 使用 pybind11 封装 Python 调用：在`yatcc_llm`中存放 python 脚本调用大语言模型并指定LLM回复结果的过滤方式，在`LLMHelper`中使用 pybind11 封装 Python 调用
- 调用封装模块，运用 LLM 辅助 LLVM IR 的分析与优化：自定义 LLM 模块的调用脚本和 Prompts ，在 `main.cpp`中使用自定义的功能完成 LLVM IR 的转换，灵活运用大语言模型实现性能优化

### 使用 pybind11 封装 Python 调用

#### pybind11 功能介绍

pybind11 是一个用于 在 C++ 和 Python 之间创建绑定（bindings） 的轻量级头文件库，在实验四中用于在 C++ 中嵌入并调用 Python 代码。主要有以下几个功能：

- 在 C++ 中初始化 Python 解释器
- 加载 Python 模块、调用函数和类
- 传递参数并获取 Python 返回值
- 与 NumPy 等生态集成

在本实验中，我们利用 pybind11 将调用大语言模型的 Python 脚本封装成模块，在 C++ 主程序中高效调用模块，实现跨语言、高性能、易部署的系统。

安装 pybind11：
```
pip install pybind11
```

下面将以一个简单的例子展示 pybind11的封装和调用过程。基础的项目结构如下：

```
project/
├── main.cpp           # 使用 pybind11 封装 Python 并调用
├── example.py         # Python 脚本
├── CMakeLists.txt     
```

其中`main.cpp`的调用方式如下：

```
#include <pybind11/embed.h> // 嵌入模式
namespace py = pybind11;

int main() {
    py::scoped_interpreter guard{}; // 初始化 Python 解释器

    py::module_ myscript = py::module_::import("example");//引入 python 模块
    py::object func = example.attr("func");//调用脚本中的函数

    return 0;
}

```

更多介绍请见官方文档：[pybind11 documentation](https://pybind11.readthedocs.io/)

#### LLM python 模块

首先调用 LLM 需要在`yatcc_llm/__init__.py`定义LLM的初始化信息，与LLM进行交互的功能主要由 chat 函数实现。
```
def chat(
        self,
        session_id: str,
        model: str,
        handlers: List[Callable[[str], str]] = [],
        **params,
    ) -> str:
        messages = self.__sessions[session_id]
        response = (
            self.__client.chat.completions.create(
                messages=messages, model=model, **params
            )
            .choices[0]
            .message.content
        )

        for handler in handlers:
            response = handler(response)
        return response
```
`chat` 函数接受一个会话 ID、模型名称以及其他参数，发送会话内容到 OpenAI 的聊天接口，获取生成的回复，并应用可选的处理程序对回复进行进一步处理。

`yatcc_llm/utils.py`定义了一系列的过滤函数，目的是从LLM的回复中提取需要的信息，以下为实验给出的三个函数。

- `remove_deepseek_r1_think()`：从 deepseek_r1 的回复中过滤思维链
- `remove_md_block_marker()`：从回复中移除 markdown 标识符，提取代码
- `extract_text_from_xml()`：从 xml 中查询节点并提取文本

同学们可以根据自己的实际需求补充和完善LLM的调用和过滤功能。

#### LLM接口封装

`LLMHelper.cpp`主要目的是实现一个帮助类 `LLMHelper`，为 C++ 项目提供一个接口，用于通过 Python 模块与 LLM 交互。它将 LLM 的功能封装在 `LLMHelper`类中，屏蔽了底层实现的复杂性，方便在 C++ 项目中使用。

- 构造函数`LLMHelper`通过接收 API 密钥和基础 URL，初始化 Python 模块 yatcc_llm 中的 LLMHelperImpl 类。
- `create_new_session()`和`delete_session(llvm::StringRef sessionID)`用于创建和终止对话
- `chat()`进行聊天操作，发送消息给模型并返回模型的响应。

其中聊天操作的其他参数主要通过`add_content()`函数添加，代码如下：

```
void
LLMHelper::add_content(llvm::StringRef sessionID,
                       Role role,
                       llvm::StringRef content)
{
  std::string _role;
  switch (role) {
    case Role::kSystem:
      _role = "system";
      break;
    case Role::kUser:
      _role = "user";
      break;
    case Role::kAssistant:
      _role = "assistant";
      break;
  }
  this->mImpl.attr("add_content")(sessionID.data(), _role, content.data());
}
```

该函数的功能是向会话中添加内容（消息），同学们可以依据需求提供会话 ID、消息的角色和消息内容三个参数，以获取回复。同时实验提供系统、用户或助手三种角色的映射，帮助同学们获取更精准有效的回复。

### 自定义调用LLM的功能模块

通过前面的介绍相信同学们已经掌握了 pybind 的封装和调用，接下来可以自定义功能模块调用 LLM 辅助实验四的完成。这部分我们提供了`PassSequencePredict`模块，通过与大语言模型（LLM）的交互来预测并应用 LLVM 的 Pass 序列。接下来将详细介绍`PassSequencePredict`的构造，帮助同学们进一步了解如何利用LLM辅助实验四的性能优化。

`PassSequencePredict`模块中`run()`的实现代码如下：

```
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

其主要部分如下：

- 遍历生成 passInfo ：`pass_summary` 函数首先对比对比缓存内容、头文件和实现文件的最后修改时间判断输出文件是否已经存在或过时。通过读取`prompts`中预先定义的提示词，调用大语言模型分析用户提供的 LLVM Pass 类名，以及对应的头文件和实现文件，生成 Pass的基本信息
- pass序列生成：从`prompts`中读取系统和用户提示词模板（分别位于 `PassSeqPredSysPrTpl.xml` 和 `PassSeqPredUserPrTpl.xml`）
创建一个与大语言模型的会话，发送模块的 IR 和 Pass 摘要，让模型生成推荐的 Pass 序列
- 构建并执行 Pass 管理器：根据模型返回的 Pass 序列，动态构建 Pass 管理器（`llvm::ModulePassManager`），将推荐的 Pass 应用到模块上

完成`PassSequencePredict`模块的构建后就可以在主函数里进行使用。`main.cpp`主要负责输入IR文件，调用优化逻辑，并将结果写入输出文件。其中负责调用优化逻辑的函数是`opt`函数，其主要作用是配置和运行LLVM的Pass管理器，具体包括以下几个步骤：

-  定义了多级分析管理器，用于支持不同粒度（循环、函数、模块等）的分析和优化：
    - LoopAnalysisManager（循环分析管理器）：管理循环粒度的分析任务。
    - FunctionAnalysisManager（函数分析管理器）：管理函数级别的分析任务。
    - CGSCCAnalysisManager（调用图 SCC 分析管理器）：管理调用图中强连通子图的分析。
    - ModuleAnalysisManager（模块分析管理器）：管理模块级别的分析任务。
    - ModulePassManager（模块 Pass 管理器）：用于运行模块级别的 Pass。
 - 添加需要分析的Pass并初始化Python 解释器
 - 添加 LLM 加持的 Pass 到优化管理器中，这时调用`PassSequencePredict`模块，结合大语言模型预测 Pass 序列，运行优化 Pass

因此通过 Pass 管理器可以管理并运行一系列优化 Pass，不仅支持模块级别的优化，同时可以动态添加基于 LLM 的 Pass。此外，学生还可以通过自己的理解和需求自定义 prompt ，以下代码是`prompts/PassSummarySysPrTpl.xml`的内容，同学们不仅可以替换 prompt 内容，还可以使用 markdown、json 等多种格式进行编写。

```
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

综上，同学们可以根据实际需求定义模块，在模块内部自定义 prompt 和优化方式，调用封装的LLM接口输出优化内容，最后通过 Pass 管理器管理并运行优化。
