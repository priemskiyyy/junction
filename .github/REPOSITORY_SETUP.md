# Repository setup

The repository is [priemskiyyy/junction](https://github.com/priemskiyyy/junction). These settings complement the files checked into the project. Adding the files enables none of them.

## Documentation

1. Select **GitHub Actions** as the Pages source in the repository settings.
2. Run the `docs-deploy` workflow once the documentation is on `main`.
3. Check the deployed site, its canonical URLs, its sitemap, its mobile navigation and the Intent Lab at `/demo/`.
4. Add the live documentation URL to the repository's About section.

The deployment workflow takes the site URL and base path from its environment. For another host, set `DOCS_SITE_URL` and `DOCS_BASE_PATH` when building. Set `DOCS_REPOSITORY_URL` if the repository moves.

## Still missing: a logo and a social image

The project has a favicon and nothing else, so the documentation emits no `og:image`. When an image exists, add a 1200 by 630 PNG under `docs/public/`, emit `og:image` and `og:image:alt` from `docs/.vitepress/config.ts`, assert them in `scripts/verify-docs.mjs`, and upload the same image as the repository's social preview.

## Discovery

Suggested topics: `deep-linking`, `universal-links`, `app-links`, `deferred-deep-linking`, `react-native`, `expo`, `typescript`, `react`, `notifications`, `branch`, `appsflyer`, `adjust`.

## Contributions and releases

- Issue forms and the pull request template are in `.github`.
- Enable private vulnerability reporting in the Security settings if a maintainer can monitor it. A library that parses links from outside the app will receive security reports, and they should not arrive as public issues.
- Configure branch protection or a ruleset after the required checks have run once: `packages-test`, `packages-verify`, `common-format` and `docs-test`.
- Create the `npm` environment with a required reviewer. The publish job waits for that approval.
- Follow [RELEASING.md](../RELEASING.md) for publication, including the manual first publication that trusted publishing needs.
