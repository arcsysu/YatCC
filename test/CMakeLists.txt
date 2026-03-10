file(GLOB_RECURSE _rtlib_src rtlib/*.cc rtlib/*.cpp rtlib/*.c)
set(TEST_RTLIB_SO ${CMAKE_CURRENT_BINARY_DIR}/libtest-rtlib.so)
add_custom_target(
  test-rtlib
  ${CLANG_PLUS_EXECUTABLE}
  -shared
  -fPIC
  -o
  ${TEST_RTLIB_SO}
  -I
  ${CMAKE_CURRENT_SOURCE_DIR}/rtlib/include
  ${_rtlib_src}
  SOURCES ${_rtlib_src})

set(CTEST_COMMAND ${CMAKE_COMMAND}/../ctest)
cmake_path(NORMAL_PATH CTEST_COMMAND)
if(NOT EXISTS ${CTEST_COMMAND})
  message(FATAL_ERROR "未找到 CTest 命令，请检查 CMake 是否正确安装。")
endif()

# 官方测例目录
set(TEST_CASES_DIR ${CMAKE_CURRENT_SOURCE_DIR}/cases)

# 搜索所有官方测例，添加到 TEST_CASES
file(
  GLOB_RECURSE TEST_CASES
  RELATIVE ${TEST_CASES_DIR}
  "${TEST_CASES_DIR}/*.sysu.c")

# 生成官方全测例表
set(TEST_CASES_TXT ${CMAKE_CURRENT_BINARY_DIR}/cases.txt)
string(REPLACE ";" "\n" _lines "${TEST_CASES}")
file(WRITE ${TEST_CASES_TXT} "${_lines}")

# diy 测例目录
set(DIY_TEST_CASES_DIR ${CMAKE_CURRENT_SOURCE_DIR}/diy-cases)

# 搜索所有 diy 测例，添加到 DIY_TEST_CASES
# CONFIGURE_DEPENDS 使构建系统在每次构建时检查目录变化，自动触发重新配置
file(
  GLOB DIY_TEST_CASES
  CONFIGURE_DEPENDS
  RELATIVE ${DIY_TEST_CASES_DIR}
  "${DIY_TEST_CASES_DIR}/*.sysu.c")

# 生成 diy 全测例表
set(DIY_TEST_CASES_TXT ${CMAKE_CURRENT_BINARY_DIR}/diy-cases.txt)
string(REPLACE ";" "\n" _lines "${DIY_TEST_CASES}")
file(WRITE ${DIY_TEST_CASES_TXT} "${_lines}")

add_subdirectory(task0)
add_subdirectory(task1)
add_subdirectory(task2)
add_subdirectory(task3)
add_subdirectory(task4)
add_subdirectory(task5)