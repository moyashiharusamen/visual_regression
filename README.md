# ビジュアルリグレッションテストツール

## version

1.0.0

## 概要

前回と今回の実行時の状態を保存したスクリーンショット同時での比較を行うツールです。

## 仕様

- ブラウザ Chromium 75.0.3738.0 を使用しています。（puppeteer の仕様）
- 各プロジェクトディレクトリの構成が `/projectName/docs/` のように `docs` の配下にあること。
    - ※ `docs` がない場合でも l15 の変数 `replaceText` の値を修正すれば使用できます。
- 初回起動時は比較対象がないため、指定されたファイルのスクリーンショットの撮影だけ行われます。

## 依存 node package

以下の package を `npm install` or `yarn add` してから使用してください。

- puppeteer
    - 自動化テストツール
    - スクリーンショットを撮るのに使用
- resemblejs
    - 画像比較
- fs-extra
    - ファイル、ディレクトリ操作
- path
    - パス操作

## 使い方

1. imageDiff.js を package.json と同階層に置く
2. 以下の変更箇所を参照して、ローカルに合った設定に変更する
3. Bash （or コマンドプロンプト or power shell）を起動
4. `$ node imageDiff` of `$ node imageDiff.js` と打つ
5. js ファイルが起動して、root に指定したディレクトリ以下の .html ファイルを全て比較する

## オプション

実行時に `--all` または `-a` を付与すると指定ディレクトリ配下の html ファイル全て（node_modules は除く）の比較を行えます。

`$ node imageDiff --all` or `$ node imadeDiff -a`

### l17

変数 `selectPaths`

差分を取りたいパスが一部の場合はこちらで設定してください。

## 各自変更箇所

使用する際に各々の環境に合ったものに変更しなければならない箇所があるので、ご注意ください。

### l11

変数 `device`

撮影したいデバイスに変更できます。
種類、詳細などは以下のドキュメントを参照してください。
[DeviceDescriptors.js](https://github.com/GoogleChrome/puppeteer/blob/master/DeviceDescriptors.js)

### l4, l15

`localhostName` を各々の Xampp で設定している localhost の名前にしてください。

例：yayoi:8080

### l16

変数 `dirPath`

`resolve` の第二引数に指定したパス以下の html ファイルを再帰的に検索します。

## 注意点

- 初期起動時は比較用ディレクトリの作成と、元となるスクリーンショットの作成をします。
- js ファイルと同階層に「screenshot」というディレクトリが出来ます
    - git 管理不要な場合は .gitignore で設定してください
- デモでの確認はできません
    - Basic 認証を突破する記述をしていないため
- 除外したい、したくないディレクトリがある場合は 変数 `exclusionDir` に `|` （パイプ）区切りで増減させてください
