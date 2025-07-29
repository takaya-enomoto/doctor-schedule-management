# オンライン公開ガイド

## 🌐 無料でWebアプリとして公開する方法

### 方法1: GitHub + Netlify（推奨）

#### ステップ1: GitHubにアップロード
1. [GitHub](https://github.com)でアカウント作成
2. 新しいリポジトリを作成
3. このフォルダの内容をアップロード

#### ステップ2: Netlifyでデプロイ
1. [Netlify](https://netlify.com)でアカウント作成
2. "New site from Git"を選択
3. GitHubリポジトリを連携
4. ビルド設定:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Deploy!

**結果**: 誰でもアクセスできるURLが発行されます（例: https://your-app.netlify.app）

### 方法2: Vercel
1. [Vercel](https://vercel.com)でアカウント作成
2. GitHubリポジトリをインポート
3. 自動でデプロイされます

### 方法3: GitHub Pages
1. GitHubリポジトリの設定でPages を有効化
2. GitHub Actions でビルド自動化設定が必要

## ⚠️ 注意事項
- データはブラウザごとに保存されるため、他の人とデータは共有されません
- 各ユーザーが独自のデータを管理することになります
- 複数人でデータを共有したい場合は、別途データベース機能が必要です

## 🔐 セキュリティ
- 現在のアプリはローカルストレージを使用しているため、個人情報は外部に送信されません
- 各ユーザーのデータは完全にプライベートです