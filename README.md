# 概要

下記ブログにて紹介するシステムのソースです。

https://agaroot-itp.com/blog/2118/

# 各バージョン

- node: v20.11.1
- Typescript: v20.11.1
- cdk: 2.133.0 (build dcc1e75)

# 構築手順

## GitHub の準備

1. 本ソースがプッシュされた GitHub リポジトリを作成してください。
1. システム構築用のブランチを作成してください。各ブランチ毎にシステムが構築されますので、例えば開発環境用に develop ブランチ、本番環境用に production ブランチといった具合にブランチを作成していくと良いでしょう。

## GitHub と AWS の接続

1. [GitHub リポジトリと AWS との接続を作成](https://docs.aws.amazon.com/ja_jp/codepipeline/latest/userguide/connections-github.html)します。

## 環境変数の記述

1. [.env](./.env)ファイルに環境変数を以下の通りに記述し、システム構築に用いるブランチにプッシュします。

- `APP_NAME`: アプリ名
- `ENV_NAME`: 環境名 e.g. dev, prod...
- `DB_NAME`: データベース(スキーマ)名
- `REPO_OWNER_NAME`: GitHub リポジトリの所有者名
- `REPO_NAME`: GitHub リポジトリ名
- `BRANCH_NAME`: ブランチ名
- `CONNECTION_ID`: 先の手順で作成した GitHub リポジトリと AWS の接続
- `S3_LOGGING_BUCKET_NAME`: (option) 踏み台インスタンスに接続する際、セッションログを S3 バケットに出力する必要がある場合にはバケット名を記述
- `READER_NUM`: Aurora Serverless v2 のリーダーインスタンス数
- `MIN_ACU`: Aurora Serverless v2 の最小容量
- `MAX_ACU`: Aurora Serverless v2 の最大容量
- `ALLOW_ORIGINS`: REST API の CORS 設定で許容するオリジン(「,」区切りで複数指定可能)
- `NOTICE_EMAIL_ADDRESSES`: notice レベルのアラームを受け取るメールアドレス(「,」区切りで複数指定可能)
- `ALERT_EMAIL_ADDRESSES`: alert レベルのアラームを受け取るメールアドレス(「,」区切りで複数指定可能)
- `ALARM_ACTIONS_ENABLED`: アラームの有効するかどうか(`TRUE`とすると有効化)

## デプロイ

本ソースのトップディレクトリで、下記コマンドを実行します。

```bash
$ npm install
$ cdk bootstrap
$ cdk deploy
```

# 構築後の改修方法

システムの構築が終わった後は、ブランチに PR などによって改修ソースを反映すればリリース処理が行えます。
CodePipeline で CI/CD パイプラインが作成されているので、以前のバージョンも含めたリリースの実行や実行中のリリース処理の中断なども行えます。
