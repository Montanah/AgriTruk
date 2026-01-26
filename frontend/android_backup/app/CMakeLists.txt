# CMakeLists.txt for TRUKapp - Suppresses deprecation warnings for picker compatibility
cmake_minimum_required(VERSION 3.22)
project(TRUKapp)

# Add compiler flags to suppress deprecation warnings globally
# The @react-native-picker/picker library uses deprecated ContextContainer::Shared API
# which was removed in React Native 0.83+
# -Wno-deprecated-declarations suppresses these warnings
add_compile_options(-Wno-deprecated-declarations)

# Also set via CMAKE_CXX_FLAGS and CMAKE_C_FLAGS for all targets
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-deprecated-declarations")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wno-deprecated-declarations")

# Include the default app setup
include(${CMAKE_CURRENT_SOURCE_DIR}/../node_modules/react-native/ReactAndroid/cmake-utils/default-app-setup.cmake)
