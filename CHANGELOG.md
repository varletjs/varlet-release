# [0.4.0](https://github.com/varletjs/release/compare/v0.3.3...v0.4.0) (2025-05-20)

### Features

- **changelog:** add writerOpts to customize commit type transformations (#31) ([](https://github.com/varletjs/release/commit/c682b35b431becc7aa6c06e742ca550cbd88125e)), closes [#31](https://github.com/varletjs/release/issues/31)
- replace custom logger with rslog (#29) ([](https://github.com/varletjs/release/commit/258e786c7a26095dd87e80c532192202e6e68326)), closes [#29](https://github.com/varletjs/release/issues/29)

## [0.3.3](https://github.com/varletjs/release/compare/v0.3.2...v0.3.3) (2025-01-15)

### Features

- support changelog preset (#28) ([](https://github.com/varletjs/release/commit/9daf25cf58bfb55034118344f8c900d3f1e58820)), closes [#28](https://github.com/varletjs/release/issues/28)

### Refactor

- remove unused title function (#24) ([](https://github.com/varletjs/release/commit/ac37481d8257585d73fa14deb2b131a960059007)), closes [#24](https://github.com/varletjs/release/issues/24)

## [0.3.2](https://github.com/varletjs/release/compare/v0.3.1...v0.3.2) (2024-12-24)

### Bug Fixes

- skip confirm registry when skipNpmPublish is true (#23) ([](https://github.com/varletjs/release/commit/ea20a40c191ba62c96b7e9c1522c3adb0ad42ccf)), closes [#23](https://github.com/varletjs/release/issues/23)

### Refactor

- optimize code (#18) ([](https://github.com/varletjs/release/commit/b732aa2f4fd31945bc19fe906dcb1754145ea566)), closes [#18](https://github.com/varletjs/release/issues/18)
- optimize version reading code (#21) ([](https://github.com/varletjs/release/commit/4c3c25d19537246ec6c934f6e9086ea6fb833414)), closes [#21](https://github.com/varletjs/release/issues/21)

## [0.3.1](https://github.com/varletjs/release/compare/v0.3.0...v0.3.1) (2024-11-02)

### Refactor

- optimize release type order (#13) ([](https://github.com/varletjs/release/commit/8b5b0178d93753071349b9ef29641db5da8b1f3a)), closes [#13](https://github.com/varletjs/release/issues/13)

# [0.3.0](https://github.com/varletjs/release/compare/v0.2.11...v0.3.0) (2024-10-26)

### Features

- support viewing current version (#12) ([](https://github.com/varletjs/release/commit/daf30da9c3004074861915f19d4f28594551a672)), closes [#12](https://github.com/varletjs/release/issues/12)

### Refactor

- migrate from inquirer to @inquirer/prompts (#9) ([](https://github.com/varletjs/release/commit/97f7282cdd62cb51d79ad419396b7de7403b1594)), closes [#9](https://github.com/varletjs/release/issues/9)
- release process for error handling ([](https://github.com/varletjs/release/commit/93bd80ab6cc69cc5254b8c64587b18df3e84d643))

## [0.2.11](https://github.com/varletjs/release/compare/v0.2.10...v0.2.11) (2024-07-16)

### Features

- update release task function to accept version parameters ([](https://github.com/varletjs/release/commit/e2b6eadc3b2c9de5aa4341ee48ff21264c2c3a26))

## [0.2.10](https://github.com/varletjs/release/compare/v0.2.9...v0.2.10) (2024-04-26)

### Features

- add remote version check to release ([](https://github.com/varletjs/release/commit/9136d7529d970e1238ec9516879b841f9ba4329d))

## [0.2.9](https://github.com/varletjs/release/compare/v0.2.8...v0.2.9) (2024-04-21)

### Features

- ensure commit message path is provided for commit linting ([](https://github.com/varletjs/release/commit/0eca4a1cf0a600c96c805976988e9269233860a9))

## [0.2.8](https://github.com/varletjs/release/compare/v0.2.7...v0.2.8) (2024-04-09)

### Refactor

- remove useless characters ([](https://github.com/varletjs/release/commit/3e0285b4eb70ddcd6afe201b8f8437c98c297994))

## [0.2.7](https://github.com/varletjs/release/compare/v0.2.6...v0.2.7) (2024-04-01)

### Features

- multiple version confirmation is supported (#6) ([](https://github.com/varletjs/release/commit/ba9ed653cae7320dfe2f6c8d9de2f24ca93ef133)), closes [#6](https://github.com/varletjs/release/issues/6)

## [0.2.6](https://github.com/varletjs/release/compare/v0.2.5...v0.2.6) (2024-03-22)

### Features

- **commitLint:** add merge and wip type (#5) ([](https://github.com/varletjs/release/commit/026a51e62fafe5391d3c9b1320ae33f76ea0d961)), closes [#5](https://github.com/varletjs/release/issues/5)

## [0.2.5](https://github.com/varletjs/release/compare/v0.2.4...v0.2.5) (2024-02-19)

### Bug Fixes

- fix tag order ([](https://github.com/varletjs/release/commit/661cfccab9aa771d1b196219b525b78ead110478))

## [0.2.4](https://github.com/varletjs/release/compare/v0.2.3...v0.2.4) (2024-02-19)

### Features

- support npmTag ([](https://github.com/varletjs/release/commit/74a0c9a235e97b8c1ed167faea54184fe7dfda48))

## [0.2.3](https://github.com/varletjs/release/compare/v0.2.2...v0.2.3) (2024-01-30)

### Features

- Check if the npm package has a remote version (#4) ([](https://github.com/varletjs/release/commit/88eab2d450681e05281a383224a75587520e3a77)), closes [#4](https://github.com/varletjs/release/issues/4)
- support --skip-changelog ([](https://github.com/varletjs/release/commit/3856b4a41f5152d9ad3eb0c49673416c1228bbbb))

## [0.2.2](https://github.com/varletjs/release/compare/v0.2.1...v0.2.2) (2024-01-25)

### Bug Fixes

- fix skip git tag command error ([](https://github.com/varletjs/release/commit/892d7712e57383eca8e291c02eed48afae564b9f))

## [0.2.1](https://github.com/varletjs/release/compare/v0.2.0...v0.2.1) (2024-01-25)

### Features

- support --skip-git-tag ([](https://github.com/varletjs/release/commit/6e596905437c4d08a31577690d08a5dbdc0d0007))

# [0.2.0](https://github.com/varletjs/release/compare/v0.1.2...v0.2.0) (2024-01-23)

### Features

- **release:** implement CI pipeline for automated npm package publishing (#3) ([](https://github.com/varletjs/release/commit/b038c0fd966b8764beacc8c45d2b96dbbceae62b)), closes [#3](https://github.com/varletjs/release/issues/3)

## [0.1.2](https://github.com/varletjs/release/compare/v0.1.1...v0.1.2) (2023-12-13)

## [0.1.1](https://github.com/varletjs/release/compare/v0.1.0...v0.1.1) (2023-12-13)

### Refactor

- uniform parameter name ([](https://github.com/varletjs/release/commit/81c5504af5ac550a24ac351baf50d702fc192927))

# [0.1.0](https://github.com/varletjs/release/compare/v0.0.5...v0.1.0) (2023-12-12)

### Features

- add custom regex validation and error message display ([](https://github.com/varletjs/release/commit/f6dc9c3ebb05af25d3aa01ce2a51c776daeac7c9))

### Refactor

- optimize command parameters ([](https://github.com/varletjs/release/commit/76aab5d185a71d46ce7820b5a50b587ba6c5ae97))

## [0.0.5](https://github.com/varletjs/release/compare/v0.0.4...v0.0.5) (2023-12-07)

### Features

- expose more functions ([](https://github.com/varletjs/release/commit/7895689306a73d5ef3b59e4759e2a603b47a40a7))

## [0.0.4](https://github.com/varletjs/release/compare/v0.0.3...v0.0.4) (2023-12-07)

### Features

- support lint commit message ([](https://github.com/varletjs/release/commit/e3200b2795a93213eab75af68674b1a6ea5327cf))

## [0.0.3](https://github.com/varletjs/release/compare/v0.0.2...v0.0.3) (2023-11-17)

### Bug Fixes

- fix logger ([](https://github.com/varletjs/release/commit/3728d8d36809c4eb6ef49017c146f5763ec69237))
- fix restore error ([](https://github.com/varletjs/release/commit/1485b3830056e8e27fb3cedc0100e0db08727056))

## [0.0.2](https://github.com/varletjs/release/compare/v0.0.1...v0.0.2) (2023-11-15)

### Features

- remove feature one-time password ([](https://github.com/varletjs/release/commit/c92c5a07cfab6e7a3c4fde7963b4a7a536b23acc))

## [0.0.1](https://github.com/varletjs/release/compare/15e865524628c2dd7db31de8c3052a6f1e3d2276...v0.0.1) (2023-11-14)

### Features

- command option add one-time password ([](https://github.com/varletjs/release/commit/b06fc893e9c05985fd65bc814e2c33851144c497))
- init ([](https://github.com/varletjs/release/commit/15e865524628c2dd7db31de8c3052a6f1e3d2276))

### Refactor

- optimization flow ([](https://github.com/varletjs/release/commit/61220901994191deaf1f790c8a2568362c7d3c3e))
