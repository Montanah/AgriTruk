cmake_minimum_required(VERSION 3.22)
project(appmodules)

# Add global C++ compiler flags to suppress deprecation warnings
# This is needed for @react-native-picker/picker compatibility with React Native 0.83.1
add_compile_options(-Wno-deprecated-declarations)

# Also set them explicitly for different language standards
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-deprecated-declarations")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wno-deprecated-declarations")

# Ensure flags are applied to all targets
string(APPEND CMAKE_CXX_FLAGS_DEBUG " -Wno-deprecated-declarations")
string(APPEND CMAKE_CXX_FLAGS_RELEASE " -Wno-deprecated-declarations")

