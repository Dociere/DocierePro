cmake_minimum_required(VERSION 3.16)
project(dociere_sidecar)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Release build = -O2, no debug symbols. Critical for production speed.
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

# nlohmann/json — header only, just needs to be on the include path
find_package(nlohmann_json REQUIRED)

# QPDF — installed via: brew install qpdf (mac) / apt install libqpdf-dev (linux)
find_package(PkgConfig REQUIRED)
pkg_check_modules(QPDF REQUIRED libqpdf)

add_executable(sidecar sidecar.cpp main.cpp qpdf.cpp)

target_link_libraries(sidecar
  PRIVATE
    nlohmann_json::nlohmann_json
    ${QPDF_LIBRARIES}
)

target_include_directories(sidecar PRIVATE ${QPDF_INCLUDE_DIRS})

# Windows: statically link runtime so no DLL hell in Electron packaging
if(WIN32)
  set_property(TARGET sidecar PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()