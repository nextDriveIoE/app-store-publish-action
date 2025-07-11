#!/bin/bash

# GitHub Action 發佈準備腳本
# 此腳本會建置專案並準備 node_modules 和 dist 目錄用於版本控制

set -e

echo "🚀 準備 GitHub Action 發佈..."

# 清理舊的建置檔案
echo "🧹 清理舊的建置檔案..."
rm -rf dist/
rm -rf node_modules/

# 安裝生產環境依賴
echo "📦 安裝生產環境依賴..."
npm ci --production

# 建置 TypeScript
echo "🔨 建置 TypeScript..."
npm run build

# 安裝所有依賴 (包含 devDependencies)
echo "📦 安裝所有依賴..."
npm install

# 確認重要檔案存在
echo "✅ 檢查重要檔案..."
if [ ! -f "dist/action.js" ]; then
    echo "❌ 錯誤: dist/action.js 不存在"
    exit 1
fi

if [ ! -f "action.yml" ]; then
    echo "❌ 錯誤: action.yml 不存在"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "❌ 錯誤: node_modules 目錄不存在"
    exit 1
fi

echo "🎉 發佈準備完成！"
echo ""
echo "接下來的步驟:"
echo "1. 提交所有變更: git add . && git commit -m 'Prepare for release'"
echo "2. 建立標籤: git tag v1.0.0"
echo "3. 推送標籤: git push origin v1.0.0"
echo ""
echo "或者使用以下一行命令:"
echo "git add . && git commit -m 'Prepare for release' && git tag v1.0.0 && git push origin v1.0.0"