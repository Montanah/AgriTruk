#!/bin/bash

# Android Emulator Performance Optimization Script for Ubuntu
# This script configures your system for optimal Android emulator performance

set -e

echo "=========================================="
echo "Android Emulator Performance Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root for certain operations
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please run this script as a regular user (not root)${NC}"
   exit 1
fi

echo "Step 1: Checking system requirements..."
echo "----------------------------------------"

# Check CPU virtualization support
if grep -q vmx /proc/cpuinfo || grep -q svm /proc/cpuinfo; then
    echo -e "${GREEN}✓ CPU virtualization support detected${NC}"
else
    echo -e "${RED}✗ CPU virtualization not supported. Enable in BIOS/UEFI${NC}"
    exit 1
fi

# Check KVM modules
if lsmod | grep -q kvm; then
    echo -e "${GREEN}✓ KVM modules loaded${NC}"
else
    echo -e "${YELLOW}⚠ KVM modules not loaded. Loading...${NC}"
    sudo modprobe kvm
    sudo modprobe kvm_intel 2>/dev/null || sudo modprobe kvm_amd 2>/dev/null
fi

# Check if user is in kvm group
if groups | grep -q kvm; then
    echo -e "${GREEN}✓ User is in kvm group${NC}"
else
    echo -e "${YELLOW}⚠ Adding user to kvm group...${NC}"
    sudo usermod -aG kvm $USER
    echo -e "${YELLOW}⚠ You may need to log out and back in for this to take effect${NC}"
fi

# Check /dev/kvm permissions
if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
    echo -e "${GREEN}✓ /dev/kvm is accessible${NC}"
else
    echo -e "${YELLOW}⚠ Fixing /dev/kvm permissions...${NC}"
    sudo chmod 666 /dev/kvm
    # Make it permanent
    if ! grep -q "KERNEL==\"kvm\", GROUP=\"kvm\", MODE=\"0666\"" /etc/udev/rules.d/99-kvm.rules 2>/dev/null; then
        echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666"' | sudo tee /etc/udev/rules.d/99-kvm.rules > /dev/null
        sudo udevadm control --reload-rules
        sudo udevadm trigger
    fi
fi

echo ""
echo "Step 2: Checking NVIDIA drivers..."
echo "----------------------------------------"

# Check if NVIDIA GPU exists
if lspci | grep -i nvidia > /dev/null; then
    echo -e "${GREEN}✓ NVIDIA GPU detected${NC}"
    
    # Check if NVIDIA drivers are installed
    if command -v nvidia-smi > /dev/null 2>&1; then
        echo -e "${GREEN}✓ NVIDIA drivers installed${NC}"
        nvidia-smi --query-gpu=name,driver_version --format=csv,noheader | head -1
    else
        echo -e "${YELLOW}⚠ NVIDIA drivers not installed${NC}"
        echo ""
        echo "To install NVIDIA drivers, run:"
        echo "  sudo ubuntu-drivers autoinstall"
        echo "  # OR manually:"
        echo "  sudo apt update"
        echo "  sudo apt install nvidia-driver-535 nvidia-utils-535"
        echo ""
        read -p "Do you want to install NVIDIA drivers now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo ubuntu-drivers autoinstall
            echo -e "${YELLOW}⚠ Please reboot after driver installation${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ No NVIDIA GPU detected (using integrated graphics)${NC}"
fi

echo ""
echo "Step 3: Configuring Android Emulator settings..."
echo "----------------------------------------"

# Create/update emulator config directory
EMULATOR_CONFIG_DIR="$HOME/.android"
mkdir -p "$EMULATOR_CONFIG_DIR"

# Create advancedFeatures.ini for better performance
cat > "$EMULATOR_CONFIG_DIR/advancedFeatures.ini" << 'EOF'
# Android Emulator Advanced Features Configuration
# Optimized for performance

Vulkan = on
VulkanSnapshots = on
VulkanQueueSubmitWithCommands = on
VulkanBatchedDescriptorSetUpdate = on
VulkanIgnoredHandles = on
VulkanShaderFloat16Int8 = on
VulkanQueueSubmitWithCommands = on
VulkanBatchedDescriptorSetUpdate = on
VulkanIgnoredHandles = on
VulkanShaderFloat16Int8 = on
Mac80211_hwsim = on
CarVhalTable = on
CarProperty = on
CarRotary = on
CarVhalReplay = on
CarInstrumentCluster = on
CarUserHal = on
CarEmulator = on
CarMqPublisher = on
CarMqSubscriber = on
CarOccupantConnectionService = on
CarBluetooth = on
EOF

echo -e "${GREEN}✓ Created advancedFeatures.ini${NC}"

# Create hardware acceleration config
cat > "$EMULATOR_CONFIG_DIR/hardware-qemu.ini" << 'EOF'
# Hardware acceleration settings for QEMU
# Optimized for Intel CPUs with KVM

[configs]
# Use hardware acceleration
hw.ramSize = 4096
hw.gpu.enabled = yes
hw.gpu.mode = host
hw.cpu.ncore = 4
hw.cpu.model = host
hw.mainKeys = no
hw.accelerometer = yes
hw.audioInput = yes
hw.audioOutput = yes
hw.battery = yes
hw.camera.back = webcam0
hw.camera.front = webcam0
hw.cpu.arch = x86_64
hw.dPad = no
hw.gps = yes
hw.keyboard = yes
hw.lcd.density = 420
hw.lcd.height = 1920
hw.lcd.width = 1080
hw.ramSize = 4096
hw.sdCard = yes
hw.sensors.orientation = yes
hw.sensors.proximity = yes
hw.trackBall = no
vm.heapSize = 512
disk.cachePartition = on
disk.cachePartition.size = 66MB
disk.dataPartition.size = 2G
EOF

echo -e "${GREEN}✓ Created hardware-qemu.ini${NC}"

echo ""
echo "Step 4: System optimizations..."
echo "----------------------------------------"

# Check swappiness (should be low for better performance)
SWAPPINESS=$(cat /proc/sys/vm/swappiness)
if [ "$SWAPPINESS" -gt 10 ]; then
    echo -e "${YELLOW}⚠ Swappiness is $SWAPPINESS (recommended: 10)${NC}"
    echo "To optimize, add to /etc/sysctl.conf:"
    echo "  vm.swappiness=10"
    read -p "Do you want to set swappiness to 10 now? (requires sudo) (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf > /dev/null
        sudo sysctl vm.swappiness=10
        echo -e "${GREEN}✓ Swappiness set to 10${NC}"
    fi
else
    echo -e "${GREEN}✓ Swappiness is optimal ($SWAPPINESS)${NC}"
fi

# Check if CPU governor is set to performance
if [ -f /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor ]; then
    CURRENT_GOVERNOR=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor)
    if [ "$CURRENT_GOVERNOR" != "performance" ]; then
        echo -e "${YELLOW}⚠ CPU governor is '$CURRENT_GOVERNOR' (performance recommended)${NC}"
        echo "To set performance mode:"
        echo "  sudo cpupower frequency-set -g performance"
        echo "Or install cpufrequtils:"
        echo "  sudo apt install cpufrequtils"
    else
        echo -e "${GREEN}✓ CPU governor is set to performance${NC}"
    fi
fi

echo ""
echo "Step 5: Environment variables..."
echo "----------------------------------------"

# Add to bashrc/zshrc if not already present
SHELL_RC="$HOME/.bashrc"
if [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
fi

if ! grep -q "ANDROID_EMULATOR_USE_SYSTEM_LIBS" "$SHELL_RC"; then
    echo "" >> "$SHELL_RC"
    echo "# Android Emulator Performance Optimizations" >> "$SHELL_RC"
    echo "export ANDROID_EMULATOR_USE_SYSTEM_LIBS=1" >> "$SHELL_RC"
    echo "export ANDROID_EMULATOR_KVM_DEVICE=/dev/kvm" >> "$SHELL_RC"
    echo "export ANDROID_EMULATOR_USE_SYSTEM_IMAGES=1" >> "$SHELL_RC"
    echo -e "${GREEN}✓ Added emulator environment variables to $SHELL_RC${NC}"
    echo -e "${YELLOW}⚠ Run: source $SHELL_RC (or restart terminal)${NC}"
else
    echo -e "${GREEN}✓ Environment variables already configured${NC}"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. If NVIDIA drivers were installed, REBOOT your system"
echo "2. Source your shell config: source $SHELL_RC"
echo "3. Create/configure your Android emulator with these settings:"
echo ""
echo "   Recommended AVD settings:"
echo "   - RAM: 4096 MB (or more if you have 16GB+ RAM)"
echo "   - VM heap: 512 MB"
echo "   - Graphics: Hardware - GLES 2.0 (or Automatic)"
echo "   - Multi-core CPU: 4 cores"
echo "   - Hardware acceleration: Yes"
echo ""
echo "4. When starting emulator, use:"
echo "   emulator -avd YOUR_AVD_NAME -gpu host -accel on"
echo ""
echo "Or in Expo/React Native:"
echo "   npx expo start --android"
echo ""
echo "For better performance, also consider:"
echo "  - Closing unnecessary applications"
echo "  - Using a lighter AVD (API 30+ with x86_64)"
echo "  - Reducing emulator resolution if needed"
echo ""


