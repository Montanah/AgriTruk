#!/usr/bin/env bash
set -euo pipefail

# scripts/build_prod_all.sh
# Interactive EAS build helper. Prompts which artifacts to build and runs them sequentially.
# Logs are saved to ./build-logs/

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
LOG_DIR="$ROOT_DIR/build-logs"
mkdir -p "$LOG_DIR"

EAS_CMD=${EAS_CLI:-npx eas}
NON_INTERACTIVE_FLAG=""
if [ "${EAS_NONINTERACTIVE:-0}" = "1" ]; then
  NON_INTERACTIVE_FLAG="--non-interactive"
fi

echo "Starting interactive production build helper: $(date)" | tee "$LOG_DIR/build_all.log"

run_build() {
  local platform=$1
  local profile=$2
  local label=$3
  local out_log="$LOG_DIR/${label// /_}.log"

  echo "\n===== BUILD: $label ($platform / profile=$profile) =====" | tee -a "$LOG_DIR/build_all.log"
  echo "Command: $EAS_CMD build -p $platform --profile $profile $NON_INTERACTIVE_FLAG" | tee -a "$LOG_DIR/build_all.log"

  # Run build and tee output
  $EAS_CMD build -p "$platform" --profile "$profile" $NON_INTERACTIVE_FLAG 2>&1 | tee "$out_log"
  local rc=${PIPESTATUS[0]:-0}
  if [ "$rc" -ne 0 ]; then
    echo "Build failed: $label (exit $rc). See $out_log" | tee -a "$LOG_DIR/build_all.log"
    return $rc
  fi

  echo "Build finished: $label. Log: $out_log" | tee -a "$LOG_DIR/build_all.log"
  return 0
}

print_menu() {
  echo "\nSelect which builds to run:"
  echo "  1) Android APK (production-apk)"
  echo "  2) Android AAB (production)"
  echo "  3) iOS IPA (appstore)"
  echo "  4) All of the above"
  echo "  q) Quit"
  echo "You can choose multiple by separating with commas, e.g. 1,3"
}

read_choices() {
  read -r -p $'Enter choice (default: 4 for All): ' CHOICE
  CHOICE=${CHOICE:-4}
  # Normalize: remove spaces
  CHOICE=$(echo "$CHOICE" | tr -d '[:space:]')
  # Support comma separated
  IFS=',' read -r -a SEL <<< "$CHOICE"
  BUILD_APK=0
  BUILD_AAB=0
  BUILD_IPA=0
  for c in "${SEL[@]}"; do
    case "$c" in
      1) BUILD_APK=1 ;;
      2) BUILD_AAB=1 ;;
      3) BUILD_IPA=1 ;;
      4) BUILD_APK=1; BUILD_AAB=1; BUILD_IPA=1 ;;
      q|Q) echo "Aborted by user."; exit 0 ;;
      *) echo "Ignoring unknown choice: $c" ;;
    esac
  done
}

confirm() {
  echo "\nSelected builds:"
  $BUILD_APK && echo " - Android APK"
  $BUILD_AAB && echo " - Android AAB"
  $BUILD_IPA && echo " - iOS IPA"
  read -r -p $'Proceed? (y/N): ' yn
  case "$yn" in
    [Yy]*) return 0 ;;
    *) echo "Aborted."; exit 0 ;;
  esac
}

# Check eas is available (npx will still work)
if ! command -v ${EAS_CLI:-eas} >/dev/null 2>&1; then
  echo "Note: 'eas' not found in PATH; npx will be used to invoke EAS if available." | tee -a "$LOG_DIR/build_all.log"
fi

# Check EAS login
if ! $EAS_CMD whoami >/dev/null 2>&1; then
  echo "You are not logged into EAS (or 'whoami' failed). The build may prompt for login." | tee -a "$LOG_DIR/build_all.log"
fi

print_menu
read_choices
confirm

RC=0

if [ "$BUILD_APK" -eq 1 ]; then
  run_build android production-apk "Android APK" || RC=$?
  if [ "$RC" -ne 0 ]; then
    echo "Stopping due to failure in Android APK build." | tee -a "$LOG_DIR/build_all.log"
    exit $RC
  fi
fi

if [ "$BUILD_AAB" -eq 1 ]; then
  run_build android production "Android AAB (App Bundle)" || RC=$?
  if [ "$RC" -ne 0 ]; then
    echo "Stopping due to failure in Android AAB build." | tee -a "$LOG_DIR/build_all.log"
    exit $RC
  fi
fi

if [ "$BUILD_IPA" -eq 1 ]; then
  run_build ios appstore "iOS IPA (App Store)" || RC=$?
  if [ "$RC" -ne 0 ]; then
    echo "iOS build failed. You may need to login to Apple/Configure credentials." | tee -a "$LOG_DIR/build_all.log"
    exit $RC
  fi
fi

echo "All selected builds completed successfully at $(date)" | tee -a "$LOG_DIR/build_all.log"
exit 0
