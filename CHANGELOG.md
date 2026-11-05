# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.1.0] - 2026-11-05

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

## [v1.0.0] - 2026-09-11

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

[Unreleased]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.IconSelectEditor/compare/v1.1.0...HEAD
[v1.1.0]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.IconSelectEditor/compare/v1.0.0...v1.1.0
[v1.0.0]: https://github.com/medienreaktor/Medienreaktor.NeosStudio.IconSelectEditor/releases/tag/v1.0.0
