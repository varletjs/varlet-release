# [1.1.0](https://github.com/varletjs/release/compare/v1.0.2...v1.1.0) (2026-03-23)


### Code Refactoring

* replace fs-extra with native fs methods ([5d3816e](https://github.com/varletjs/release/commit/5d3816e31e4e8aa0057862688a8b31b2835dc098))
* **test/release:** closer to the real environment ([16e481e](https://github.com/varletjs/release/commit/16e481eecbf452037ce4d740f21756a488a0c577))

## [1.0.2](https://github.com/varletjs/release/compare/v1.0.1...v1.0.2) (2026-02-07)


### Code Refactoring

* **changelog:** refactor changelog generation logic to enhance functionality and maintainability ([c3fbdd4](https://github.com/varletjs/release/commit/c3fbdd43b8a6fb02ddd48dda6d645d61d24c877a))

## [1.0.1](https://github.com/varletjs/release/compare/v1.0.0...v1.0.1) (2026-02-07)


### Features

* **changelog:** add support for breaking changes in changelog generation ([8945cf9](https://github.com/varletjs/release/commit/8945cf9e2766c3faaee2788f4a1d36d74fae3f56))

# [1.0.0](https://github.com/varletjs/release/compare/v0.4.4...v1.0.0) (2026-02-07)


### BREAKING CHANGES

* transform to pure ESM package and requires Node 20+ ([#41](https://github.com/varletjs/release/issues/41))


### Bug Fixes

* **release.ts:** handle publish errors and improve error logging ([8369475](https://github.com/varletjs/release/commit/83694758910d2ca06fd9cd8f52bb152647aa3e5b))
* **release.ts:** log all errors in release function ([6ef4365](https://github.com/varletjs/release/commit/6ef436577d3075625baf13019467e9a94f6deb47))
* **tests:** update mockCwd to handle cross-platform compatibility ([b3eae79](https://github.com/varletjs/release/commit/b3eae79d92659f0b09f0ea63d7970075d409d38a))


### Code Refactoring

* **cli:** bin/index.js -> src/cli.ts ([2b8b9a8](https://github.com/varletjs/release/commit/2b8b9a85afb21edc0ff1bf4dbbef4874e51f8564))
* **cli:** Change package version to import-based approach ([9aadda9](https://github.com/varletjs/release/commit/9aadda9cf749653bfa2250a0fe78fc8b9de436db))
* remove unused `glob` dependency ([7a508c8](https://github.com/varletjs/release/commit/7a508c8e7c9abf33f6d72165cddde5fb3630b2b0))


### Features

* Highlight current branch name in confirmation message ([6fa9ade](https://github.com/varletjs/release/commit/6fa9adec770c8de53345a18cf483ac7e4d782bfb))
* **release:** use release script ([487758c](https://github.com/varletjs/release/commit/487758cb834e09ca8fc9e5df7d393bb7f365a340))
* replace `@inquirer/prompts `nanospinner`  with @clack/prompts ([065c180](https://github.com/varletjs/release/commit/065c180ba1bfb4e68de60445de1d80dd3290d3f0))
* **tests:** add unit tests for commitLint and release modules ([5ec5c77](https://github.com/varletjs/release/commit/5ec5c7724d6acf79ee721df6e5e7520b1f542a4b))
* transform to pure ESM package and requires Node 20+ ([#41](https://github.com/varletjs/release/issues/41)) ([38726d6](https://github.com/varletjs/release/commit/38726d6254487a302f49107823c9dac96eabf6cc))

## [0.4.4](https://github.com/varletjs/release/compare/v0.4.2...v0.4.4) (2025-11-16)


### Bug Fixes

* fix the npm release error handling ([#37](https://github.com/varletjs/release/issues/37)) ([fb831c4](https://github.com/varletjs/release/commit/fb831c4ccc5a3c8b88e10e394a7f0a790c400db5))

## [0.4.2](https://github.com/varletjs/release/compare/v0.4.1...v0.4.2) (2025-11-06)


### Code Refactoring

* **release:** Better display of log information ([4054a7e](https://github.com/varletjs/release/commit/4054a7e2388ec863c61ee9a4136d50bb78398704))

## [0.4.1](https://github.com/varletjs/release/compare/v0.4.0...v0.4.1) (2025-05-21)


### Features

* **changelog:** enable refactor for display in the CHANGELOG.md ([#33](https://github.com/varletjs/release/issues/33)) ([2381b66](https://github.com/varletjs/release/commit/2381b66a42d0504b16b74fe5a2b73dd18b6195bc))

# [0.4.0](https://github.com/varletjs/release/compare/v0.3.3...v0.4.0) (2025-05-20)


### Features

* **changelog:** add writerOpts to customize commit type transformations ([#31](https://github.com/varletjs/release/issues/31)) ([c682b35](https://github.com/varletjs/release/commit/c682b35b431becc7aa6c06e742ca550cbd88125e))
* replace custom logger with rslog ([#29](https://github.com/varletjs/release/issues/29)) ([258e786](https://github.com/varletjs/release/commit/258e786c7a26095dd87e80c532192202e6e68326))

## [0.3.3](https://github.com/varletjs/release/compare/v0.3.2...v0.3.3) (2025-01-15)


### Code Refactoring

* remove unused title function ([#24](https://github.com/varletjs/release/issues/24)) ([ac37481](https://github.com/varletjs/release/commit/ac37481d8257585d73fa14deb2b131a960059007))


### Features

* support changelog preset ([#28](https://github.com/varletjs/release/issues/28)) ([9daf25c](https://github.com/varletjs/release/commit/9daf25cf58bfb55034118344f8c900d3f1e58820))

## [0.3.2](https://github.com/varletjs/release/compare/v0.3.1...v0.3.2) (2024-12-24)


### Bug Fixes

* skip confirm registry when skipNpmPublish is true ([#23](https://github.com/varletjs/release/issues/23)) ([ea20a40](https://github.com/varletjs/release/commit/ea20a40c191ba62c96b7e9c1522c3adb0ad42ccf))


### Code Refactoring

* optimize code ([#18](https://github.com/varletjs/release/issues/18)) ([b732aa2](https://github.com/varletjs/release/commit/b732aa2f4fd31945bc19fe906dcb1754145ea566))
* optimize version reading code ([#21](https://github.com/varletjs/release/issues/21)) ([4c3c25d](https://github.com/varletjs/release/commit/4c3c25d19537246ec6c934f6e9086ea6fb833414))

## [0.3.1](https://github.com/varletjs/release/compare/v0.3.0...v0.3.1) (2024-11-02)


### Code Refactoring

* optimize release type order ([#13](https://github.com/varletjs/release/issues/13)) ([8b5b017](https://github.com/varletjs/release/commit/8b5b0178d93753071349b9ef29641db5da8b1f3a))

# [0.3.0](https://github.com/varletjs/release/compare/v0.2.11...v0.3.0) (2024-10-26)


### Code Refactoring

* migrate from inquirer to @inquirer/prompts ([#9](https://github.com/varletjs/release/issues/9)) ([97f7282](https://github.com/varletjs/release/commit/97f7282cdd62cb51d79ad419396b7de7403b1594))
* release process for  error handling ([93bd80a](https://github.com/varletjs/release/commit/93bd80ab6cc69cc5254b8c64587b18df3e84d643))


### Features

* support viewing current version ([#12](https://github.com/varletjs/release/issues/12)) ([daf30da](https://github.com/varletjs/release/commit/daf30da9c3004074861915f19d4f28594551a672))

## [0.2.11](https://github.com/varletjs/release/compare/v0.2.10...v0.2.11) (2024-07-16)


### Features

* update release task function to accept version parameters ([e2b6ead](https://github.com/varletjs/release/commit/e2b6eadc3b2c9de5aa4341ee48ff21264c2c3a26))

## [0.2.10](https://github.com/varletjs/release/compare/v0.2.9...v0.2.10) (2024-04-26)


### Features

* add remote version check to release ([9136d75](https://github.com/varletjs/release/commit/9136d7529d970e1238ec9516879b841f9ba4329d))

## [0.2.9](https://github.com/varletjs/release/compare/v0.2.8...v0.2.9) (2024-04-21)


### Features

* ensure commit message path is provided for commit linting ([0eca4a1](https://github.com/varletjs/release/commit/0eca4a1cf0a600c96c805976988e9269233860a9))

## [0.2.8](https://github.com/varletjs/release/compare/v0.2.7...v0.2.8) (2024-04-09)


### Code Refactoring

* remove useless characters ([3e0285b](https://github.com/varletjs/release/commit/3e0285b4eb70ddcd6afe201b8f8437c98c297994))

## [0.2.7](https://github.com/varletjs/release/compare/v0.2.6...v0.2.7) (2024-04-01)


### Features

* multiple version confirmation is supported ([#6](https://github.com/varletjs/release/issues/6)) ([ba9ed65](https://github.com/varletjs/release/commit/ba9ed653cae7320dfe2f6c8d9de2f24ca93ef133))

## [0.2.6](https://github.com/varletjs/release/compare/v0.2.5...v0.2.6) (2024-03-22)


### Features

* **commitLint:** add merge and wip type ([#5](https://github.com/varletjs/release/issues/5)) ([026a51e](https://github.com/varletjs/release/commit/026a51e62fafe5391d3c9b1320ae33f76ea0d961))

## [0.2.5](https://github.com/varletjs/release/compare/v0.2.4...v0.2.5) (2024-02-19)


### Bug Fixes

* fix tag order ([661cfcc](https://github.com/varletjs/release/commit/661cfccab9aa771d1b196219b525b78ead110478))

## [0.2.4](https://github.com/varletjs/release/compare/v0.2.3...v0.2.4) (2024-02-19)


### Features

* support npmTag ([74a0c9a](https://github.com/varletjs/release/commit/74a0c9a235e97b8c1ed167faea54184fe7dfda48))

## [0.2.3](https://github.com/varletjs/release/compare/v0.2.2...v0.2.3) (2024-01-30)


### Features

* Check if the npm package has a remote version ([#4](https://github.com/varletjs/release/issues/4)) ([88eab2d](https://github.com/varletjs/release/commit/88eab2d450681e05281a383224a75587520e3a77))
* support --skip-changelog ([3856b4a](https://github.com/varletjs/release/commit/3856b4a41f5152d9ad3eb0c49673416c1228bbbb))

## [0.2.2](https://github.com/varletjs/release/compare/v0.2.1...v0.2.2) (2024-01-25)


### Bug Fixes

* fix skip git tag command error ([892d771](https://github.com/varletjs/release/commit/892d7712e57383eca8e291c02eed48afae564b9f))

## [0.2.1](https://github.com/varletjs/release/compare/v0.2.0...v0.2.1) (2024-01-25)


### Features

* support --skip-git-tag ([6e59690](https://github.com/varletjs/release/commit/6e596905437c4d08a31577690d08a5dbdc0d0007))

# [0.2.0](https://github.com/varletjs/release/compare/v0.1.2...v0.2.0) (2024-01-23)


### Features

* **release:** implement CI pipeline for automated npm package publishing ([#3](https://github.com/varletjs/release/issues/3)) ([b038c0f](https://github.com/varletjs/release/commit/b038c0fd966b8764beacc8c45d2b96dbbceae62b))

## [0.1.2](https://github.com/varletjs/release/compare/v0.1.1...v0.1.2) (2023-12-13)

## [0.1.1](https://github.com/varletjs/release/compare/v0.1.0...v0.1.1) (2023-12-13)


### Code Refactoring

* uniform parameter name ([81c5504](https://github.com/varletjs/release/commit/81c5504af5ac550a24ac351baf50d702fc192927))

# [0.1.0](https://github.com/varletjs/release/compare/v0.0.5...v0.1.0) (2023-12-12)


### Code Refactoring

* optimize command parameters ([76aab5d](https://github.com/varletjs/release/commit/76aab5d185a71d46ce7820b5a50b587ba6c5ae97))


### Features

* add custom regex validation and error message display ([f6dc9c3](https://github.com/varletjs/release/commit/f6dc9c3ebb05af25d3aa01ce2a51c776daeac7c9))

## [0.0.5](https://github.com/varletjs/release/compare/v0.0.4...v0.0.5) (2023-12-07)


### Features

* expose more functions ([7895689](https://github.com/varletjs/release/commit/7895689306a73d5ef3b59e4759e2a603b47a40a7))

## [0.0.4](https://github.com/varletjs/release/compare/v0.0.3...v0.0.4) (2023-12-07)


### Features

* support lint commit message ([e3200b2](https://github.com/varletjs/release/commit/e3200b2795a93213eab75af68674b1a6ea5327cf))

## [0.0.3](https://github.com/varletjs/release/compare/v0.0.2...v0.0.3) (2023-11-17)


### Bug Fixes

* fix logger ([3728d8d](https://github.com/varletjs/release/commit/3728d8d36809c4eb6ef49017c146f5763ec69237))
* fix restore error ([1485b38](https://github.com/varletjs/release/commit/1485b3830056e8e27fb3cedc0100e0db08727056))

## [0.0.2](https://github.com/varletjs/release/compare/v0.0.1...v0.0.2) (2023-11-15)


### Features

* remove feature one-time password ([c92c5a0](https://github.com/varletjs/release/commit/c92c5a07cfab6e7a3c4fde7963b4a7a536b23acc))

## [0.0.1](https://github.com/varletjs/release/compare/15e865524628c2dd7db31de8c3052a6f1e3d2276...v0.0.1) (2023-11-14)


### Code Refactoring

* optimization flow ([6122090](https://github.com/varletjs/release/commit/61220901994191deaf1f790c8a2568362c7d3c3e))


### Features

* command option add one-time password ([b06fc89](https://github.com/varletjs/release/commit/b06fc893e9c05985fd65bc814e2c33851144c497))
* init ([15e8655](https://github.com/varletjs/release/commit/15e865524628c2dd7db31de8c3052a6f1e3d2276))

