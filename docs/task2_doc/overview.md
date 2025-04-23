## 任务描述

实验一中我们实现了一个词法分析器，源代码文件输入词法分析器后将会生成 token 流。而在本次实验中，我们首先需要使用 Bison 或 ANTLR 完成一个语法分析器，token 流输入到语法分析器之后会生成语法分析树 AST。AST 主要反映了程序的结构，但不足以全面表示程序的语义信息。语法分析图 ASG 在 AST 的基础上增加了额外的语义信息，如作用域、类型信息、变量和函数之间的关系等，这有助于接下里的编译优化、类型检查和代码生成等步骤。但是在本次实验中不管是 AST 还是 ASG，都是位于比较复杂的数据结构，不便于同学们打印出来以协助调试，也不便于实验评分，所以最终我们还需要实现从 ASG 到 JSON 转换。

下图展示了实验的整体结构：

![实验二总览](../images/task2_antlr/lab2_overview.jpg)

---

完成实验二的方式同实验一一样，需要同学们不断对比标准答案和当前输出，找到需要改进的内容，进行完善。至于如何改进实验二的程序以输出正确答案，将在“公用代码介绍”以及具体的实验章节中介绍。同学们可以选择 Bison 或 ANTLR 来完成本次实验。

## 输入输出简介

在本次实验中，使用 Bison 和 ANTLR 的输入并不相同。前者的输入为 task1 的输出（token 流，例如`/YatCC/build/test/task1/functional-0/000_main.sysu.c`），而后者的输入为 task0 的输出（经过预处理的源代码，例如`/YatCC/build/test/task0/functional-0/000_main.sysu.c`）。

而输出都是由 clang parse 生成，是代表 ASG 的 JSON 文件，例如`/YatCC/build/test/task2/functional-0/000_main.sysu.c/answer.json`（以下只截取了部分内容）：

```json
{
  "id": "0x55d4efa4f008",
  "kind": "TranslationUnitDecl",
  "loc": {},
  "range": {
    "begin": {},
    "end": {}
  },
  "inner": [
    {
      "id": "0x55d4efa4f838",
      "kind": "TypedefDecl",
      "loc": {},
      "range": {
        "begin": {},
        "end": {}
      },
      "isImplicit": true,
      "name": "__int128_t",
      "type": {
        "qualType": "__int128"
      },
// ...
```

以上面这个 JSON 文件为例，进行一些解释（实际上同学们只需要关心 `kind` ， `name` ， `value` ， `type` 这四个关键词，我们的评测系统也只关注输出中的这四个关键字的正确性）：

- `id`: 唯一标识符，用于区分 AST 中的每一个节点。
- `kind`: 节点语法类型，表示该节点代表的源代码语法结构的种类，如 `TypedefDecl`（类型定义声明）、`BuiltinType`（内置类型）、`FunctionDecl`（函数声明）等。
- `loc`: 位置信息，通常包含文件名、行号和列号，用于指示源代码中该元素的位置。
- `range`: 范围信息，指出了源代码中该节点覆盖的起始和结束位置。它有 begin 和 end 两个属性，每个属性可能包含偏移量、行号、列号等信息，用于准确定位代码片段。
- `inner`: 内部节点，这个列表包含了当前节点下的子节点。例如，一个 `FunctionDecl` 节点会包含它的参数和函数体等子节点。
- `isImplicit`: 表示该声明是否是隐式的，即没有在源代码中直接写出来，而是由编译器自动生成的。
- `name`: 节点名称，比如类型名称、函数名称等。
- `type`: 节点类型，包含了源代码的类型信息，如`__int128`、`unsigned __int128` 等。对于类型节点，`qualType` 属性描述了类型的完整限定名。
- `decl`: 声明信息，某些节点（如 `RecordType`）可能包含对声明本身的引用。
- `size`: 大小，主要用于数组类型，表示数组的元素数量。
- `valueCategory`: 值类别，如 `prvalue` 表示纯右值。
- `value`: 节点值，对于字面量如整数字面量，这个字段包含了具体的值。

此外，通过 VSCode 可以很方便地看到 JSON 文件的结构。鼠标点击下图中红框里的`...`，就会显示这个文件的结构：

![alt text](../images/bison/task2-json.png)

可以看见，其最外层的结构的`kind`（种类）为`TranslationUnitDecl`。点击左侧图标展开，可以看到属性`inner`还包含其余六个部分：前五个都是`TypedefDecl`，最后一个是`FunctionDecl`：

![alt text](../images/bison/task2-answer-exam.png)

所以这个 JSON 文件表示的 ASG，结构如下：

```bash
└── TranslationUnitDecl
    ├── 多个 TypedefDecl
    └── FunctionDecl
        └── CompoundStmt
            └── ReturnStmt
                └── IntegerLiteral
```

## 评分标准

同学们查看 JSON 文件，会发现上述每个节点里面包含了非常多的属性，除去 TypedefDecl 不用管之外，我们的评分以属性打印为准，具体如下：

- 是否提取出正确的 `kind`、`name`、`value` 键值（不含 `InitListExpr`）（60 分）
- 是否提取出正确的 `type` 键值及是否构造正确的 `InitListExpr` 生成树（40 分）。

在根目录下的 `config.cmake` 中可以选择实验二的日志输出级别：

- 级别 1：对应 60 分标准的错误提示
- 级别 2：对应 100 分标准的错误提示
- 级别 3：对应完整 clang parse 输出的错误提示。

建议同学们在实验过程中从低到高选择不同的日志等级，比较当前输出与标准输出的区别，并逐渐完善代码。

同时，强烈建议（尤其是选用 Bison 完成 task2 的）同学们在`config.cmake`中**启用复活功能**，以直接使用标准的输入，避免 task1 中实现的不完善，影响 task2 的完成。是否启用复活功能，对本次实验的成绩没有任何影响。

## 文法参考 :id=grammer-reference

本实验设计时参考的文法是 SysY 语言文法。SysY 语言文法是一个非常完整的类 C 语言的文法，完成实验只需要用到其中的一部分。同学们还可以参考 [SysY 语言定义](https://gitlab.eduxiji.net/csc1/nscscc/compiler2021/-/blob/master/SysY%E8%AF%AD%E8%A8%80%E5%AE%9A%E4%B9%89.pdf)，来获取更详细的解释和说明。

下面是 SysY 语言文法的所有产生式，同学们只需要选取其中的一部分，即可完成实验：

<details>
  <summary>
    完整文法
  </summary>

```cpp
start
    : translation_unit
    ;

primary_expression
    : IDENTIFIER
    | CONSTANT
    | STRING_LITERAL
    | '(' expression ')'
    ;

postfix_expression
    : primary_expression
    | postfix_expression '[' expression ']'
    | postfix_expression '(' ')'
    | postfix_expression '(' argument_expression_list ')'
    | postfix_expression '.' IDENTIFIER
    | postfix_expression PTR_OP IDENTIFIER
    | postfix_expression INC_OP
    | postfix_expression DEC_OP
    | '(' type_name ')' '{' initializer_list '}'
    | '(' type_name ')' '{' initializer_list ',' '}'
    ;

argument_expression_list
    : assignment_expression
    | argument_expression_list ',' assignment_expression
    ;

unary_expression
    : postfix_expression
    | INC_OP unary_expression
    | DEC_OP unary_expression
    | unary_operator cast_expression
    | SIZEOF unary_expression
    | SIZEOF '(' type_name ')'
    ;

unary_operator
    : '&'
    | '*'
    | '+'
    | '-'
    | '~'
    | '!'
    ;

cast_expression
    : unary_expression
    | '(' type_name ')' cast_expression
    ;

multiplicative_expression
    : cast_expression
    | multiplicative_expression '*' cast_expression
    | multiplicative_expression '/' cast_expression
    | multiplicative_expression '%' cast_expression
    ;

additive_expression
    : multiplicative_expression
    | additive_expression '+' multiplicative_expression
    | additive_expression '-' multiplicative_expression
    ;

shift_expression
    : additive_expression
    | shift_expression LEFT_OP additive_expression
    | shift_expression RIGHT_OP additive_expression
    ;

relational_expression
    : shift_expression
    | relational_expression '<' shift_expression
    | relational_expression '>' shift_expression
    | relational_expression LE_OP shift_expression
    | relational_expression GE_OP shift_expression
    ;

equality_expression
    : relational_expression
    | equality_expression EQ_OP relational_expression
    | equality_expression NE_OP relational_expression
    ;

and_expression
    : equality_expression
    | and_expression '&' equality_expression
    ;

exclusive_or_expression
    : and_expression
    | exclusive_or_expression '^' and_expression
    ;

inclusive_or_expression
    : exclusive_or_expression
    | inclusive_or_expression '|' exclusive_or_expression
    ;

logical_and_expression
    : inclusive_or_expression
    | logical_and_expression AND_OP inclusive_or_expression
    ;

logical_or_expression
    : logical_and_expression
    | logical_or_expression OR_OP logical_and_expression
    ;

conditional_expression
    : logical_or_expression
    | logical_or_expression '?' expression ':' conditional_expression
    ;

assignment_expression
    : conditional_expression
    | unary_expression assignment_operator assignment_expression
    ;

assignment_operator
    : '='
    | MUL_ASSIGN
    | DIV_ASSIGN
    | MOD_ASSIGN
    | ADD_ASSIGN
    | SUB_ASSIGN
    | LEFT_ASSIGN
    | RIGHT_ASSIGN
    | AND_ASSIGN
    | XOR_ASSIGN
    | OR_ASSIGN
    ;

expression
    : assignment_expression
    | expression ',' assignment_expression
    ;

constant_expression
    : conditional_expression
    ;

declaration
    : declaration_specifiers ';'
    | declaration_specifiers init_declarator_list ';'
    ;

declaration_specifiers
    : storage_class_specifier
    | storage_class_specifier declaration_specifiers
    | type_specifier
    | type_specifier declaration_specifiers
    | type_qualifier
    | type_qualifier declaration_specifiers
    | function_specifier
    | function_specifier declaration_specifiers
    ;

init_declarator_list
    : init_declarator
    | init_declarator_list ',' init_declarator
    ;

init_declarator
    : declarator
    | declarator '=' initializer
    ;

storage_class_specifier
    : TYPEDEF
    | EXTERN
    | STATIC
    | AUTO
    | REGISTER
    ;

type_specifier
    : VOID
    | CHAR
    | SHORT
    | INT
    | LONG
    | FLOAT
    | DOUBLE
    | SIGNED
    | UNSIGNED
    | BOOL
    | COMPLEX
    | IMAGINARY
    | struct_or_union_specifier
    | enum_specifier
    | TYPE_NAME
    ;

struct_or_union_specifier
    : struct_or_union IDENTIFIER '{' struct_declaration_list '}'
    | struct_or_union '{' struct_declaration_list '}'
    | struct_or_union IDENTIFIER
    ;

struct_or_union
    : STRUCT
    | UNION
    ;

struct_declaration_list
    : struct_declaration
    | struct_declaration_list struct_declaration
    ;

struct_declaration
    : specifier_qualifier_list struct_declarator_list ';'
    ;

specifier_qualifier_list
    : type_specifier specifier_qualifier_list
    | type_specifier
    | type_qualifier specifier_qualifier_list
    | type_qualifier
    ;

struct_declarator_list
    : struct_declarator
    | struct_declarator_list ',' struct_declarator
    ;

struct_declarator
    : declarator
    | ':' constant_expression
    | declarator ':' constant_expression
    ;

enum_specifier
    : ENUM '{' enumerator_list '}'
    | ENUM IDENTIFIER '{' enumerator_list '}'
    | ENUM '{' enumerator_list ',' '}'
    | ENUM IDENTIFIER '{' enumerator_list ',' '}'
    | ENUM IDENTIFIER
    ;

enumerator_list
    : enumerator
    | enumerator_list ',' enumerator
    ;

enumerator
    : IDENTIFIER
    | IDENTIFIER '=' constant_expression
    ;

type_qualifier
    : CONST
    | RESTRICT
    | VOLATILE
    ;

function_specifier
    : INLINE
    ;

declarator
    : pointer direct_declarator
    | direct_declarator
    ;

direct_declarator
    : IDENTIFIER
    | '(' declarator ')'
    | direct_declarator '[' type_qualifier_list assignment_expression ']'
    | direct_declarator '[' type_qualifier_list ']'
    | direct_declarator '[' assignment_expression ']'
    | direct_declarator '[' STATIC type_qualifier_list assignment_expression ']'
    | direct_declarator '[' type_qualifier_list STATIC assignment_expression ']'
    | direct_declarator '[' type_qualifier_list '*' ']'
    | direct_declarator '[' '*' ']'
    | direct_declarator '[' ']'
    | direct_declarator '(' parameter_type_list ')'
    | direct_declarator '(' identifier_list ')'
    | direct_declarator '(' ')'
    ;

pointer
    : '*'
    | '*' type_qualifier_list
    | '*' pointer
    | '*' type_qualifier_list pointer
    ;

type_qualifier_list
    : type_qualifier
    | type_qualifier_list type_qualifier
    ;

parameter_type_list
    : parameter_list
    | parameter_list ',' ELLIPSIS
    ;

parameter_list
    : parameter_declaration
    | parameter_list ',' parameter_declaration
    ;

parameter_declaration
    : declaration_specifiers declarator
    | declaration_specifiers abstract_declarator
    | declaration_specifiers
    ;

identifier_list
    : IDENTIFIER
    | identifier_list ',' IDENTIFIER
    ;

type_name
    : specifier_qualifier_list
    | specifier_qualifier_list abstract_declarator
    ;

abstract_declarator
    : pointer
    | direct_abstract_declarator
    | pointer direct_abstract_declarator
    ;

direct_abstract_declarator
    : '(' abstract_declarator ')'
    | '[' ']'
    | '[' assignment_expression ']'
    | direct_abstract_declarator '[' ']'
    | direct_abstract_declarator '[' assignment_expression ']'
    | '[' '*' ']'
    | direct_abstract_declarator '[' '*' ']'
    | '(' ')'
    | '(' parameter_type_list ')'
    | direct_abstract_declarator '(' ')'
    | direct_abstract_declarator '(' parameter_type_list ')'
    ;

initializer
    : assignment_expression
    | '{' initializer_list '}'
    | '{' initializer_list ',' '}'
    ;

initializer_list
    : initializer
    | designation initializer
    | initializer_list ',' initializer
    | initializer_list ',' designation initializer
    ;

designation
    : designator_list '='
    ;

designator_list
    : designator
    | designator_list designator
    ;

designator
    : '[' constant_expression ']'
    | '.' IDENTIFIER
    ;

statement
    : labeled_statement
    | compound_statement
    | expression_statement
    | selection_statement
    | iteration_statement
    | jump_statement
    ;

labeled_statement
    : IDENTIFIER ':' statement
    | CASE constant_expression ':' statement
    | DEFAULT ':' statement
    ;

compound_statement
    : '{' '}'
    | '{' block_item_list '}'
    ;

block_item_list
    : block_item
    | block_item_list block_item
    ;

block_item
    : declaration
    | statement
    ;

expression_statement
    : ';'
    | expression ';'
    ;

selection_statement
    : IF '(' expression ')' statement
    | IF '(' expression ')' statement ELSE statement
    | SWITCH '(' expression ')' statement
    ;

iteration_statement
    : WHILE '(' expression ')' statement
    | DO statement WHILE '(' expression ')' ';'
    | FOR '(' expression_statement expression_statement ')' statement
    | FOR '(' expression_statement expression_statement expression ')' statement
    | FOR '(' declaration expression_statement ')' statement
    | FOR '(' declaration expression_statement expression ')' statement
    ;

jump_statement
    : GOTO IDENTIFIER ';'
    | CONTINUE ';'
    | BREAK ';'
    | RETURN ';'
    | RETURN expression ';'
    ;

translation_unit
    : external_declaration
    | translation_unit external_declaration
    ;

external_declaration
    : function_definition
    | declaration
    ;

function_definition
    : declaration_specifiers declarator declaration_list compound_statement
    | declaration_specifiers declarator compound_statement
    ;

declaration_list
    : declaration
    | declaration_list declaration
    ;
```

</details>
