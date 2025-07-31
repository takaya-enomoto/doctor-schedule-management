# 医師出勤管理 - セットアップガイド

## 📋 必要な環境
- Node.js (バージョン 18以上)
- npm または yarn

## 🚀 インストール手順

### 1. アプリをダウンロード
このフォルダ全体を共有相手のPCにコピーしてください。

### 2. 依存関係のインストール
```bash
# コマンドプロンプトまたはPowerShellで実行
cd work-calendar-app
npm install
```

### 3. アプリの起動
```bash
# 開発モード（推奨）
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

### 4. 本番用ビルド（オプション）
```bash
# 本番用にビルド
npm run build

# ビルドしたファイルをプレビュー
npm run preview
```

## 💾 Google Drive連携の設定

### 環境変数ファイルの作成
`.env`ファイルを作成し、以下の内容を設定してください：

```
VITE_GOOGLE_CLIENT_ID=639287110166-l6peiuisqpc3o5gibjjnmu7k3ui28ho2.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSyBmdBloS0KSZLFeJXF0lXjy-v7BQ29GPyQ

# 固定フォルダID（重複フォルダ防止のため必須）
VITE_SHARED_FOLDER_ID=1p57H4bwTXgXi3z7so0YOkp53JXmnSz_P
```

**重要**: この設定により全ユーザーが同じ共有フォルダを使用し、重複フォルダの作成を防げます。

### 共有フォルダについて
- 指定フォルダ: https://drive.google.com/drive/folders/1p57H4bwTXgXi3z7so0YOkp53JXmnSz_P
- このフォルダへのアクセス権限が必要です
- アプリで「Google Driveにサインイン」後、共有データの保存・読み込みが可能です

## 🆘 トラブルシューティング
- Node.jsがインストールされていない場合は、nodejs.orgからダウンロードしてください
- `npm install`でエラーが出る場合は、Node.jsのバージョンを確認してください
- ポート5173が使用中の場合は、自動的に別のポートが選択されます

## 🔧 カスタマイズ
- 病院名や場所名の変更: `src/types.ts`と各コンポーネントを編集
- 色やスタイルの変更: `src/App.css`を編集
- 機能の追加: 開発者にお問い合わせください