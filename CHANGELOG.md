# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-12

### Added
- GeoJSON layer option `updateCurrentTime`: moves the current time to the first
  available time of the layer. It defaults to `updateTimeDimension`, so layers that
  update the available times now also jump to their first time.

### Fixed
- Available times are sorted numerically, so times before 1970 or on both sides of
  2001-09-09 no longer come out of order (#228).
- The player no longer skips the first frame when it starts over after reaching
  the end (#184).
- GeoJSON layer: the whole layer was shown when the last feature time was equal to
  the start of the visible period (#209).
- WMS layer: requests for 1970-01-01T00:00:00Z were sent without the `time`
  parameter (#214).
- WMS layer: available and default times are now read from layers without
  `queryable="1"`, an attribute that only signals GetFeatureInfo support
  (#139, #218). Until now this fix existed only as a hand edit in `dist/`.
- The error raised when iso8601-js-period is missing now links to its npm
  package (#224).

### Changed
- README: the basic example uses the current SOCIB HF radar dataset, and notes
  that the SOCIB proxy used by the examples is no longer available.
- Examples: example 1 now shows the SOCIB WMOP ocean model; new examples 17
  (basic GeoJSON usage) and 18 (integration with leaflet-velocity). Examples
  whose data services changed or disappeared (2–8, 11–14 and 18) are hidden from
  the index until they are fixed.

Releases up to 1.1.1 are listed in the [GitHub tags](https://github.com/socib/Leaflet.TimeDimension/tags).

[1.2.0]: https://github.com/socib/Leaflet.TimeDimension/compare/v1.1.1...v1.2.0
