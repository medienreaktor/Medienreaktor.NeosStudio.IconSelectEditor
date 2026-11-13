# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-11-10

### Added

- **Neos Studio 2.** The editor runs in Neos Studio 2 as well as in 1.19.1 and later
  (`medienreaktor/neos-studio` `^1.19.1 || ^2.0`). It asks the plugin API which
  version it runs in and takes the node address and the API that come with it:
  Neos.Api 2 in Studio 2, Medienreaktor.NeosApi 1.x in Studio 1.

### Changed

- The plugin API types come from npm (`@medienreaktor/neos-studio`) instead of a
  `file:` path into an installed Studio, so the plugin builds anywhere.

## [1.1.0] - 2026-11-05

### Changed

- **The editor takes Neos Studio's design tokens.** The field and the picker
  dialog follow Studio's light and dark theme through its semantic CSS
  variables instead of rules of their own under `html.dark`. The icon tiles
  use Studio's outline button surface, which also makes them visible in dark
  mode, where they matched the grid's background.
- Text sizes come from Studio's `--text-*` variables, so the editor follows
  the reader's default font size, and its sizes sit on Studio's 16px spacing
  scale.
- Requires Neos Studio 1.19.1.
- The Composer package leaves out the CI configuration.

### Fixed

- The icon grid keeps its rows aligned when the reader changes the default
  font size while Studio is open; the row height and cell width were pixels
  computed once.

## [1.0.0] - 2026-09-11

### Added

- **The icon select editor for Neos Studio**, a drop-in replacement for the
  classic UI's `Medienreaktor.IconSelectEditor/Editor`: the same
  `editorOptions.iconSources`, data source and stored value
  (`{resourceUri, sourceName, label}`, `[]` when cleared). Both packages can
  be installed side by side, one node type configuration serving both editing
  UIs.
- A wide picker dialog with search across the source, keyboard navigation and
  a strip of recently used icons; the field previews the icon it holds.
- Icons are fetched one source at a time, only for the source being looked
  at, instead of every configured source when the inspector opens.

[Unreleased]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.IconSelectEditor/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.IconSelectEditor/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.IconSelectEditor/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.IconSelectEditor/releases/tag/v1.0.0
