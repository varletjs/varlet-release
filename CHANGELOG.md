## [2.0.1](https://github.com/varletjs/release/compare/v2.0.0...v2.0.1) (2026-04-12)


### BREAKING CHANGES

* **cli:** migrate CLI tool from commander to cleye ([008e304](undefined/undefined/release/commit/008e304172991e3b40cef9f3f2e9b68ad4d08f8c))

  - release: remove `-sc`, remove `-sgt`, rename `-nt` to `-t`
  - publish: rename `-nt` to `-t`
  - changelog: rename `-rc` to `-c`, remove `--preset` option
* **changelog:** simplify breaking changes handling logic ([2f6771f](undefined/undefined/release/commit/2f6771fbbbc9a4f944cd38dce41e57709c524d17))

  - Only show breaking change records for messages following the `feat!: xxx` or `feat()!: xxx` format
* **changelog:** refactor changelog generation and upgrade dependencies ([7c4469f](undefined/undefined/release/commit/7c4469fc208cc582b1336674562aacf7a8648e13))

  - Remove `writeOpts` parameter from changelog function, replace with `mainTemplate` and `transformCommit`
  - Remove `preset` parameter, always use angular preset
  - Change the 'Code Refactoring' title to 'Refactoring' in the generated changelog document
  - Add `cwd` parameter support
  - Upgrade conventional-changelog from ^5.1.0 to ^7.2.0
* transform to pure ESM package and requires Node 20+ ([#41](undefined/undefined/release/issues/41)) ([38726d6](undefined/undefined/release/commit/38726d6254487a302f49107823c9dac96eabf6cc))

  * feat!: transform to pure ESM package and requires Node 20+

  - pnpm >= 10.0
  - node ^20.19.0 || >=22.12.0
  - Migrate to tsdown
  - Update core dependencies to the latest versions

  * chore: oxfmt ignore changelog

  * chore: restore changelog

  * chore: unless oxlint & oxfmt

  * chore: reference to necessary dependencies


### Bug Fixes

* fix logger ([3728d8d](https://github.com/varletjs/release/commit/3728d8d36809c4eb6ef49017c146f5763ec69237))
* fix restore error ([1485b38](https://github.com/varletjs/release/commit/1485b3830056e8e27fb3cedc0100e0db08727056))
* fix skip git tag command error ([892d771](https://github.com/varletjs/release/commit/892d7712e57383eca8e291c02eed48afae564b9f))
* fix tag order ([661cfcc](https://github.com/varletjs/release/commit/661cfccab9aa771d1b196219b525b78ead110478))
* fix the npm release error handling ([#37](undefined/undefined/release/issues/37)) ([fb831c4](https://github.com/varletjs/release/commit/fb831c4ccc5a3c8b88e10e394a7f0a790c400db5))
* **release.ts:** handle publish errors and improve error logging ([8369475](https://github.com/varletjs/release/commit/83694758910d2ca06fd9cd8f52bb152647aa3e5b))
* **release.ts:** log all errors in release function ([6ef4365](https://github.com/varletjs/release/commit/6ef436577d3075625baf13019467e9a94f6deb47))
* skip confirm registry when skipNpmPublish is true ([#23](undefined/undefined/release/issues/23)) ([ea20a40](https://github.com/varletjs/release/commit/ea20a40c191ba62c96b7e9c1522c3adb0ad42ccf))
* **tests:** update mockCwd to handle cross-platform compatibility ([b3eae79](https://github.com/varletjs/release/commit/b3eae79d92659f0b09f0ea63d7970075d409d38a))


### Features

* add custom regex validation and error message display ([f6dc9c3](https://github.com/varletjs/release/commit/f6dc9c3ebb05af25d3aa01ce2a51c776daeac7c9))
* add remote version check to release ([9136d75](https://github.com/varletjs/release/commit/9136d7529d970e1238ec9516879b841f9ba4329d))
* **changelog:** add option to output unreleased version ([354536b](https://github.com/varletjs/release/commit/354536b1f863b2affc83f855b850f0f3370f78f0))
* **changelog:** add support for breaking change body ([d7eb060](https://github.com/varletjs/release/commit/d7eb0602cd32b6909e3fde5a11be07b27a64b085))
* **changelog:** add support for breaking changes in changelog generation ([8945cf9](https://github.com/varletjs/release/commit/8945cf9e2766c3faaee2788f4a1d36d74fae3f56))
* **changelog:** add writerOpts to customize commit type transformations ([#31](undefined/undefined/release/issues/31)) ([c682b35](https://github.com/varletjs/release/commit/c682b35b431becc7aa6c06e742ca550cbd88125e))
* **changelog:** enable refactor for display in the CHANGELOG.md ([#33](undefined/undefined/release/issues/33)) ([2381b66](https://github.com/varletjs/release/commit/2381b66a42d0504b16b74fe5a2b73dd18b6195bc))
* Check if the npm package has a remote version ([#4](undefined/undefined/release/issues/4)) ([88eab2d](https://github.com/varletjs/release/commit/88eab2d450681e05281a383224a75587520e3a77))
* command option add one-time password ([b06fc89](https://github.com/varletjs/release/commit/b06fc893e9c05985fd65bc814e2c33851144c497))
* **commitLint:** add merge and wip type ([#5](undefined/undefined/release/issues/5)) ([026a51e](https://github.com/varletjs/release/commit/026a51e62fafe5391d3c9b1320ae33f76ea0d961))
* ensure commit message path is provided for commit linting ([0eca4a1](https://github.com/varletjs/release/commit/0eca4a1cf0a600c96c805976988e9269233860a9))
* expose more functions ([7895689](https://github.com/varletjs/release/commit/7895689306a73d5ef3b59e4759e2a603b47a40a7))
* Highlight current branch name in confirmation message ([6fa9ade](https://github.com/varletjs/release/commit/6fa9adec770c8de53345a18cf483ac7e4d782bfb))
* init ([15e8655](https://github.com/varletjs/release/commit/15e865524628c2dd7db31de8c3052a6f1e3d2276))
* **lockfile:** add lockfile sync check functionality ([3d099fe](https://github.com/varletjs/release/commit/3d099fe9dab6b7e65e60c97190ddb548580002fe))
* multiple version confirmation is supported ([#6](undefined/undefined/release/issues/6)) ([ba9ed65](https://github.com/varletjs/release/commit/ba9ed653cae7320dfe2f6c8d9de2f24ca93ef133))
* **release:** implement CI pipeline for automated npm package publishing ([#3](undefined/undefined/release/issues/3)) ([b038c0f](https://github.com/varletjs/release/commit/b038c0fd966b8764beacc8c45d2b96dbbceae62b))
* **release:** use release script ([487758c](https://github.com/varletjs/release/commit/487758cb834e09ca8fc9e5df7d393bb7f365a340))
* remove feature one-time password ([c92c5a0](https://github.com/varletjs/release/commit/c92c5a07cfab6e7a3c4fde7963b4a7a536b23acc))
* replace `@inquirer/prompts `nanospinner`  with @clack/prompts ([065c180](https://github.com/varletjs/release/commit/065c180ba1bfb4e68de60445de1d80dd3290d3f0))
* replace custom logger with rslog ([#29](undefined/undefined/release/issues/29)) ([258e786](https://github.com/varletjs/release/commit/258e786c7a26095dd87e80c532192202e6e68326))
* support --skip-changelog ([3856b4a](https://github.com/varletjs/release/commit/3856b4a41f5152d9ad3eb0c49673416c1228bbbb))
* support --skip-git-tag ([6e59690](https://github.com/varletjs/release/commit/6e596905437c4d08a31577690d08a5dbdc0d0007))
* support changelog preset ([#28](undefined/undefined/release/issues/28)) ([9daf25c](https://github.com/varletjs/release/commit/9daf25cf58bfb55034118344f8c900d3f1e58820))
* support lint commit message ([e3200b2](https://github.com/varletjs/release/commit/e3200b2795a93213eab75af68674b1a6ea5327cf))
* support npmTag ([74a0c9a](https://github.com/varletjs/release/commit/74a0c9a235e97b8c1ed167faea54184fe7dfda48))
* support viewing current version ([#12](undefined/undefined/release/issues/12)) ([daf30da](https://github.com/varletjs/release/commit/daf30da9c3004074861915f19d4f28594551a672))
* **tests:** add unit tests for commitLint and release modules ([5ec5c77](https://github.com/varletjs/release/commit/5ec5c7724d6acf79ee721df6e5e7520b1f542a4b))
* transform to pure ESM package and requires Node 20+ ([#41](undefined/undefined/release/issues/41)) ([38726d6](https://github.com/varletjs/release/commit/38726d6254487a302f49107823c9dac96eabf6cc))
* update release task function to accept version parameters ([e2b6ead](https://github.com/varletjs/release/commit/e2b6eadc3b2c9de5aa4341ee48ff21264c2c3a26))
* upgrade typescript@6 and some deps ([ed3d970](https://github.com/varletjs/release/commit/ed3d97027ad96c889a9cab440fdd41daac57780b))


### Refactoring

* **changelog:** refactor changelog generation and upgrade dependencies ([7c4469f](https://github.com/varletjs/release/commit/7c4469fc208cc582b1336674562aacf7a8648e13))
* **changelog:** refactor changelog generation logic to enhance functionality and maintainability ([c3fbdd4](https://github.com/varletjs/release/commit/c3fbdd43b8a6fb02ddd48dda6d645d61d24c877a))
* **changelog:** simplify breaking changes handling logic ([2f6771f](https://github.com/varletjs/release/commit/2f6771fbbbc9a4f944cd38dce41e57709c524d17))
* **cli:** bin/index.js -> src/cli.ts ([2b8b9a8](https://github.com/varletjs/release/commit/2b8b9a85afb21edc0ff1bf4dbbef4874e51f8564))
* **cli:** Change package version to import-based approach ([9aadda9](https://github.com/varletjs/release/commit/9aadda9cf749653bfa2250a0fe78fc8b9de436db))
* **cli:** migrate CLI tool from commander to cleye ([008e304](https://github.com/varletjs/release/commit/008e304172991e3b40cef9f3f2e9b68ad4d08f8c))
* migrate from inquirer to @inquirer/prompts ([#9](undefined/undefined/release/issues/9)) ([97f7282](https://github.com/varletjs/release/commit/97f7282cdd62cb51d79ad419396b7de7403b1594))
* move from build, lint, fmt to the all-in-one package of vite-plus ([#45](undefined/undefined/release/issues/45)) ([2448309](https://github.com/varletjs/release/commit/2448309497e678618cc91515964c0f8202490e34))
* optimization flow ([6122090](https://github.com/varletjs/release/commit/61220901994191deaf1f790c8a2568362c7d3c3e))
* optimize code ([#18](undefined/undefined/release/issues/18)) ([b732aa2](https://github.com/varletjs/release/commit/b732aa2f4fd31945bc19fe906dcb1754145ea566))
* optimize command parameters ([76aab5d](https://github.com/varletjs/release/commit/76aab5d185a71d46ce7820b5a50b587ba6c5ae97))
* optimize release type order ([#13](undefined/undefined/release/issues/13)) ([8b5b017](https://github.com/varletjs/release/commit/8b5b0178d93753071349b9ef29641db5da8b1f3a))
* optimize version reading code ([#21](undefined/undefined/release/issues/21)) ([4c3c25d](https://github.com/varletjs/release/commit/4c3c25d19537246ec6c934f6e9086ea6fb833414))
* release process for  error handling ([93bd80a](https://github.com/varletjs/release/commit/93bd80ab6cc69cc5254b8c64587b18df3e84d643))
* **release:** Better display of log information ([4054a7e](https://github.com/varletjs/release/commit/4054a7e2388ec863c61ee9a4136d50bb78398704))
* **release:** improve code organization and type safety ([421d9e5](https://github.com/varletjs/release/commit/421d9e5ad7fade2824b9e9374826d8e913db1fcb))
* **release:** make execGit function async ([1792cd9](https://github.com/varletjs/release/commit/1792cd9646e0de20ae2ce5366316deebf2637b21))
* remove unused `glob` dependency ([7a508c8](https://github.com/varletjs/release/commit/7a508c8e7c9abf33f6d72165cddde5fb3630b2b0))
* remove unused title function ([#24](undefined/undefined/release/issues/24)) ([ac37481](https://github.com/varletjs/release/commit/ac37481d8257585d73fa14deb2b131a960059007))
* remove useless characters ([3e0285b](https://github.com/varletjs/release/commit/3e0285b4eb70ddcd6afe201b8f8437c98c297994))
* replace fs-extra with native fs methods ([5d3816e](https://github.com/varletjs/release/commit/5d3816e31e4e8aa0057862688a8b31b2835dc098))
* **test/release:** closer to the real environment ([16e481e](https://github.com/varletjs/release/commit/16e481eecbf452037ce4d740f21756a488a0c577))
* uniform parameter name ([81c5504](https://github.com/varletjs/release/commit/81c5504af5ac550a24ac351baf50d702fc192927))


### Reverts

* "chore: initial commit" ([21a8bac](https://github.com/varletjs/release/commit/21a8bac5d7950214f23c551a2a9474e7f8ed5666))
