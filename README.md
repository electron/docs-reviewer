# electron-docs-reviewer

> A GitHub App built with [Probot](https://github.com/probot/probot) that A bot to help the docs team review changes in electron/electron

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Docker

```sh
# 1. Build container
docker build -t electron-docs-reviewer .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> electron-docs-reviewer
```

## Contributing

If you have suggestions for how electron-docs-reviewer could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2022 Samuel Attard
