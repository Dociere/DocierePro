cmake_minimum_required(VERSION 3.16)
project(dociere_sidecar)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

find_package(nlohmann_json REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(QPDF REQUIRED IMPORTED_TARGET libqpdf)

add_executable(sidecar sidecar.cpp main.cpp qpdf.cpp)

target_link_libraries(sidecar
  PRIVATE
    nlohmann_json::nlohmann_json
    PkgConfig::QPDF
)

target_include_directories(sidecar PRIVATE ${QPDF_INCLUDE_DIRS})

# Keep static C++ runtime — reduces host deps
target_link_options(sidecar PRIVATE -static-libstdc++ -static-libgcc)

# $ORIGIN tells the binary to look for .so files next to itself
set_target_properties(sidecar PROPERTIES
  BUILD_RPATH    "$ORIGIN/libs"
  INSTALL_RPATH  "$ORIGIN/libs"
  BUILD_WITH_INSTALL_RPATH TRUE
)

if(WIN32)
  set_property(TARGET sidecar PROPERTY
    MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()