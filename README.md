# Medienreaktor.NeosStudio.IconSelectEditor

[![Packagist Version](https://img.shields.io/packagist/v/medienreaktor/neos-studio-icon-select-editor)](https://packagist.org/packages/medienreaktor/neos-studio-icon-select-editor)
[![PHP Version Support](https://img.shields.io/packagist/dependency-v/medienreaktor/neos-studio-icon-select-editor/php)](https://www.php.net/)
[![Test Status](https://github.com/medienreaktor/Medienreaktor.NeosStudio.IconSelectEditor/actions/workflows/ci.yml/badge.svg)](https://github.com/medienreaktor/Medienreaktor.NeosStudio.IconSelectEditor/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)

The icon select editor for **Neos Studio** (`Medienreaktor.NeosStudio`): pick
an SVG icon from one or more configured icon folders.

It is a **drop-in replacement** for the classic-UI
[Medienreaktor.IconSelectEditor](https://github.com/beromir/Neos-IconSelectEditor)
(`beromir/neos-icon-select-editor`): it registers under the same editor id,
reads the same `editorOptions.iconSources`, talks to the same data source and
stores the same value. One node type configuration serves both interfaces, and
both packages can be installed side by side - the original serves the classic
UI, this one serves Studio.

## Installation

```bash
composer require --no-update medienreaktor/neos-studio-icon-select-editor
```

Then run `composer update` in your project root and flush the Flow caches.

The classic-UI package is a dependency: it provides the
`medienreaktor-iconselecteditor-icon-sources` data source this editor reads,
which stays untouched.

## Configuration

Unchanged from the classic-UI editor:

```yaml
properties:
  icon:
    type: array
    ui:
      label: 'Icon'
      reloadIfChanged: true
      inspector:
        group: 'general'
        editor: 'Medienreaktor.IconSelectEditor/Editor'
        editorOptions:
          iconSources:
            - name: 'Font Awesome'
              path: 'Vendor.Site/Private/Icons/FontAwesome/regular'
            - name: 'Brands'
              path: 'Vendor.Site/Private/Icons/FontAwesome/brands'
```

The stored value is the same object the classic editor writes:

- `resourceUri` (e.g. `resource://Vendor.Site/Private/Icons/FontAwesome/regular/squirrel.svg`)
- `sourceName` (e.g. `Font Awesome`)
- `label` (e.g. `Squirrel`)

Clearing the field commits `[]`, exactly as before.

## What is different

Everything that changed is on the client; the PHP side and the stored data are
untouched.

- **The field previews its icon.** The classic editor showed the label only;
  here the icon itself sits in the field, with its source as a badge.
- **The picker is a dialog, not a dropdown.** It uses the full window width, so
  a Font Awesome folder shows eight to twelve icons per row instead of five in
  a sidebar-width column. Labels are printed under the icons.
- **Full keyboard path.** The search field takes focus on open; arrow keys,
  Home/End and PageUp/PageDown move a cursor through the grid,
  <kbd>Enter</kbd> picks, <kbd>Esc</kbd> closes. The dialog traps Tab and
  returns focus to the field on close.
- **Better search.** Every whitespace-separated term has to match, so "right
  arrow" finds "Arrow Right"; prefix matches sort first.
- **Recently used.** The last twelve picks, across all sources and node types,
  as a strip above the grid.
- **It opens where you left off** - on the stored icon's source, scrolled to
  the stored icon.

### Icons are loaded per source, on demand

Worth knowing, because it is the one behavioural difference:

The data source inlines the SVG markup of every file it finds. The classic
editor requested **all** configured sources at once, when the inspector
mounted. For a property offering a site's own icon set plus three Font Awesome
folders that is around 10.000 SVGs and tens of megabytes - fetched and parsed before
the inspector could paint, on every node selection.

This editor asks for one source at a time, and only for the source actually
being looked at - the same identifier, the same `dataSourceAdditionalData`
shape, the same response, just a smaller slice of it. Results are cached per
source for the lifetime of the page.

Two consequences:

- The inspector issues **no** data source request while it is merely showing a
  value. The preview comes from a small `localStorage` cache of icons the user
  has picked (also what backs the recents list). An icon that is neither
  cached nor in an already-loaded source shows a placeholder next to its label
  until the picker has been opened once.
- Opening the picker on a Font Awesome folder loads that folder - roughly 18 MB
  and a second or two on a local machine - once per page load.

## Building

The bundle is prebuilt into `Resources/Public/Plugin/`. To rebuild:

```bash
cd Resources/Private/Plugin
npm install
npm run build        # emits Resources/Public/Plugin/{plugin.js,plugin.css}
```

Then flush the Flow caches and reload `/neos/studio`. `npm run dev` rebuilds on
change.

Run `npm run format` before committing. CI checks the formatting, type-checks
and builds the plugin against the Neos Studio release `composer.json` requires,
and fails when the result differs from the committed bundle.

Note: `@medienreaktor/neos-studio` (the type declarations of the Studio plugin
API) is a `file:` dependency. It is resolved **relative to this package's place
inside a Neos distribution**, and the committed path assumes the working copy
sits at `DistributionPackages/Medienreaktor.NeosStudio.IconSelectEditor/` next
to an installed `Packages/Application/Medienreaktor.NeosStudio/`:

```
"@medienreaktor/neos-studio": "file:../../../../../Packages/Application/Medienreaktor.NeosStudio/Resources/Private/StudioApi"
```

Cloned anywhere else - standalone, or installed by Composer under
`Packages/Plugins/` - that path does not resolve and `npm install` fails.
Adjust it in `Resources/Private/Plugin/package.json` to wherever your Studio
package is; it is needed for types only, so a build is the only thing affected.

React, ReactDOM and the plugin API are external at runtime and resolve to the
globals the Studio shell publishes on `window`, so the plugin renders with the
shell's single React instance.

## Limitations

- `ClientEval` expressions in editor options are not evaluated (the classic
  editor does not use any either).
- The editor needs `Medienreaktor.NeosStudio` ≥ 1.19.1 for its semantic design
  tokens, which the editor's CSS uses for colours and radii and which follow
  the light/dark theme (1.13 brought the `editors` registry and `apiFetch`).

## License

This package is free software, released under the
[GNU General Public License, version 3 or later](LICENSE).
