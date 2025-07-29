@echo off
echo 🏥 医師出勤管理アプリ - 初回セットアップ
echo.
echo Node.jsがインストールされているか確認中...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.jsがインストールされていません
    echo.
    echo 以下の手順でNode.jsをインストールしてください：
    echo 1. https://nodejs.org にアクセス
    echo 2. 緑色の「LTS」ボタンをクリックしてダウンロード
    echo 3. ダウンロードしたファイルを実行してインストール
    echo 4. インストール完了後、このファイルをもう一度実行してください
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js が見つかりました
echo.
echo 📦 アプリの依存関係をインストール中...
cd /d "%~dp0"
npm install

if errorlevel 1 (
    echo ❌ インストールでエラーが発生しました
    echo Node.jsを再インストールしてから再度お試しください
    pause
    exit /b 1
)

echo.
echo 🎉 セットアップ完了！
echo.
echo 次回からは「医師出勤管理を起動.bat」をダブルクリックするだけでアプリが使えます
echo.
pause