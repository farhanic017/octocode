#!/bin/sh
# OctoCode Installer — curl -fsSL https://raw.githubusercontent.com/farhanic017/octocode/main/install.sh | bash
set -e

REPO="farhanic017/octocode"
VERSION="${OCTOCODE_VERSION:-latest}"
INSTALL_DIR="${OCTOCODE_INSTALL_DIR:-$HOME/.octocode/bin}"

detect_platform() {
  os=$(uname -s | tr '[:upper:]' '[:lower:]')
  arch=$(uname -m)
  case "$os" in
    linux)
      if [ -f /etc/alpine-release ]; then
        os="linux-musl"
      fi
      ;;
    darwin) os="darwin" ;;
    mingw*|msys*|cyntwin*) os="windows" ;;
    *) echo "Unsupported OS: $os"; exit 1 ;;
  esac
  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) echo "Unsupported arch: $arch"; exit 1 ;;
  esac
  platform="${os}-${arch}"
}

get_download_url() {
  if [ "$VERSION" = "latest" ]; then
    VERSION=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed 's/.*"tag_name": *"\(.*\)".*/\1/')
  fi
  ext=""
  if [ "$os" = "windows" ]; then
    ext=".exe"
  fi
  echo "https://github.com/$REPO/releases/download/$VERSION/octocode-${platform}${ext}"
}

main() {
  echo "OctoCode Installer"
  echo ""
  detect_platform
  echo "Platform: $platform"
  echo "Version: $VERSION"
  echo ""

  mkdir -p "$INSTALL_DIR"
  url=$(get_download_url)
  echo "Downloading from: $url"
  curl -fsSL "$url" -o "$INSTALL_DIR/octo${ext}"
  chmod +x "$INSTALL_DIR/octo${ext}"
  echo ""
  echo "Installed to: $INSTALL_DIR/octo${ext}"
  echo ""
  echo "Add to PATH:"
  echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
  echo ""
  echo "Run: octo --help"
}

main
