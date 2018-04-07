# Contributing

First of all, thank you for your interest in contributing to headless-chrome-crawler!
When contributing to this project, please first discuss the change you wish to make via issue before making a change.

Please note that this project has a [code of conduct](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/CODE_OF_CONDUCT.md), please follow it in all your interactions with this project.

## Contributing Process

1. Modify code following [ESLint](https://eslint.org) and the code should be annotated with [JSDoc annotations](https://github.com/Microsoft/TypeScript/wiki/JSDoc-support-in-JavaScript).
2. Make sure all tests are passed by `yarn test` (or run `yarn test-all` when you modify the [RedisCache](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/cache/redis.js)'s code). Modify tests when the interface has changed.
2. Update the [README.md](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/API.md) with details of changes to the interface.
3. Update the [CHANGELOG.md](https://github.com/yujiosaka/headless-chrome-crawler/blob/master/CHANGELOG.md). The versioning scheme we use is [Semantic Versioning](http://semver.org/spec/v2.0.0.html).
4. Make your commit message following [Conventional Commits](https://conventionalcommits.org/).
5. Make a Pull Request and you may request a reviewer to merge your commit.
