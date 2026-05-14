#!/bin/bash

# ============================================================================
# CRF.xl Development Environment Setup Script
# ============================================================================
# This script automates the setup of the clinical metadata engine project.
# It is idempotent (safe to run multiple times).

set -e # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting CRF.xl Development Environment Setup..."

# 1. Prerequisite Checks
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v16+) to continue."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm to continue."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js detected: $NODE_VERSION"

# 2. Dependency Installation
echo "📦 Installing project dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    echo "⚠️ package.json not found. Skipping npm install."
    echo "💡 You may need to run 'npm init' or ensure you are in the project root."
fi

# 3. Directory Scaffolding
echo "📁 Ensuring directory structure exists..."
BASE_DIR="src/taskpane"
CORE_DIR="$BASE_DIR/core"
COMP_DIR="$BASE_DIR/components"

DIRECTORIES=(
    "$CORE_DIR/types"
    "$CORE_DIR/parser"
    "$CORE_DIR/generators/docx"
    "$CORE_DIR/generators/cdisc"
    "$COMP_DIR"
    "assets"
)

for dir in "${DIRECTORIES[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "   Created: $dir"
    fi
done

# 4. Configuration Setup (.gitignore)
echo "📄 Configuring .gitignore..."
cat <<EOF > .gitignore
# Dependency directories
node_modules/
jspm_packages/
lib/

# Build and distribution
dist/
build/
out/
bin/
obj/
release/
*.tsbuildinfo

# Office Add-in specific logs
manifest.xml.log
*.log

# Debug and System files
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
Thumbs.db

# IDE / Editor settings
.vscode/
.idea/
*.swp
*.swo

# Environment and Secrets
.env
.env.local

# Temporary files
temp/
tmp/
EOF
echo "✅ .gitignore updated."

# 5. Git Index Repair (Fixing node_modules tracking)
if [ -d .git ]; then
    echo "🧹 Cleaning Git index to ensure .gitignore is respected..."
    # This removes everything from the index and re-adds it, filtering via .gitignore
    git rm -r --cached . > /dev/null 2>&1
    git add .
    
    if ! git diff-index --quiet HEAD --; then
        echo "✨ Changes detected in Git tracking. Creating cleanup commit..."
        git commit -m "chore: dev environment setup - apply .gitignore rules" > /dev/null 2>&1
    fi
    echo "✅ Git index is now clean."
else
    echo "ℹ️  Not a git repository. Skipping Git cleanup."
fi

# 6. Type Checking & Build Verification
echo "🧪 Running initial type check..."
if command -v npx &> /dev/null && [ -f "tsconfig.json" ]; then
    npx tsc --noEmit || echo "⚠️  Initial type check found issues. This is expected if files are currently empty placeholders."
else
    echo "ℹ️  Skipping type check (npx or tsconfig.json missing)."
fi

# 7. Final Summary
echo ""
echo "===================================================================="
echo "✅ CRF.xl SETUP COMPLETE"
echo "===================================================================="
echo "Next Steps:"
echo " 1. Run your population scripts to fill the logic placeholders."
echo " 2. Start the dev server: 'npm start'"
echo " 3. Sideload the add-in in Excel to see the task pane."
echo "===================================================================="