#!/bin/bash
# LinkedIn Auto Apply — One-Click Installer
# Double-click this file to install and launch the app.

set -e

clear
echo "============================================"
echo "   LinkedIn Auto Apply — Installing..."
echo "============================================"
echo ""

INSTALL_DIR="$HOME/linkedin-auto-apply"

# --- Install Homebrew if missing ---
if ! command -v brew &>/dev/null; then
  echo ">> Installing Homebrew (package manager)..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/null
  # Add brew to PATH for Apple Silicon and Intel
  if [ -f /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -f /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi

# --- Install Node.js if missing ---
if ! command -v node &>/dev/null; then
  echo ">> Installing Node.js..."
  brew install node
fi

# --- Install Git if missing ---
if ! command -v git &>/dev/null; then
  echo ">> Installing Git..."
  brew install git
fi

# --- Clone or update the repo ---
if [ -d "$INSTALL_DIR" ]; then
  echo ">> Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  echo ">> Downloading app..."
  git clone https://github.com/jtur671/linkedin-auto-apply.git "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# --- Install dependencies ---
echo ">> Installing dependencies..."
npm install --no-fund --no-audit 2>&1 | tail -1

# --- Set up database ---
echo ">> Setting up database..."
npx prisma generate --no-hints 2>&1 | tail -1
npx prisma db push --skip-generate 2>&1 | tail -1

echo ""
echo "============================================"
echo "   Done! Opening app in your browser..."
echo "============================================"
echo ""
echo "  (Keep this window open while using the app)"
echo "  (Press Ctrl+C to stop)"
echo ""

# --- Start the app and open browser ---
sleep 2 && open "http://localhost:3000" &
npm run dev
