# Leaflet TimeDimension

Add time dimension capabilities on a [Leaflet](http://leafletjs.com/) map.

![screenshot](https://raw.githubusercontent.com/socib/Leaflet.TimeDimension/master/examples/img/screenshot/screenshot-leaflet-timedimension.png "Screenshot of Leaflet.TimeDimension")

- [Examples and basic usage](#examples-and-basic-usage)
- [API](#api)
    - [L.Map](#lmap)
    - [L.TimeDimension](#ltimedimension)
    - [L.TimeDimension.Layer](#ltimedimensionlayer)
    - [L.TimeDimension.Layer.WMS](#ltimedimensionlayerwms)
    - [L.TimeDimension.Layer.GeoJSON](#ltimedimensionlayergeojson)
    - [L.Control.TimeDimension](#lcontroltimedimension)
    - [L.TimeDimension.Player](#ltimedimensionplayer)
    - [TimeDimension update modes](#timedimension-update-modes)
- [Requisites](#requisites)
- [Talks](#talks)
- [Bugs, issues and contributions](#bugs-issues-and-contributions)

## Examples and basic usage

Checkout the [Leaflet TimeDimension Demos](https://apps.socib.es/Leaflet.TimeDimension/examples/).

Basic usage:

```html
<html>
    <head>
        <title>Leaflet TimeDimension Demo</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.5.1/dist/leaflet.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet-timedimension@1.1.1/dist/leaflet.timedimension.control.min.css" />
    </head>
    <body>
        <div id="map" style="height: 100%; width: 100%"></div>
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/leaflet@1.5.1/dist/leaflet.js"></script>
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/iso8601-js-period@0.2.1/iso8601.min.js"></script>
        <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/leaflet-timedimension@1.1.1/dist/leaflet.timedimension.min.js"></script>
        <script type="text/javascript" src="example.js"></script>
    </body>
</html>
```

```javascript
// example.js
var map = L.map('map', {
    zoom: 10,
    center: [38.705, 1.15],
    timeDimension: true,
    timeDimensionOptions: {
        timeInterval: "2014-09-30/2014-10-30",
        period: "PT1H"
    },
    timeDimensionControl: true,
});

var wmsUrl = "https://thredds.socib.es/thredds/wms/observational/hf_radar/hf_radar_ibiza-scb_codarssproc001_aggregation/dep0001_hf-radar-ibiza_scb-codarssproc001_L1_agg.nc"
var wmsLayer = L.tileLayer.wms(wmsUrl, {
    layers: 'sea_water_velocity',
    format: 'image/png',
    transparent: true,
    attribution: 'SOCIB HF RADAR | sea_water_velocity'
});

// Create and add a TimeDimension Layer to the map
var tdWmsLayer = L.timeDimension.layer.wms(wmsLayer);
tdWmsLayer.addTo(map);
```

For more control over each object creation, you can create timeDimension objects manually, see [Example 9](examples/js/example9.js#L11)

## API

### L.Map

This plugin will attach to a Map a TimeDimension object and a related TimeDimension Control if `timeDimension` and `timeDimensionControl` options are included.

Option                        | Type      | Default | Description
------------------------------|-----------|---------|------------
`timeDimension`               | `Boolean` | `false` | Automatically creates a new TimeDimension object linked to the map if set to `true`.
`timeDimensionOptions`        | `Object`  | `{}`    | [Options](#timeDimensionOptions) for the TimeDimension object.
`timeDimensionControl`        | `Boolean` | `false` | Automatically adds a TimeDimension Control to the map if set to `true`.
`timeDimensionControlOptions` | `Object`  | `{}`    | [Options](#timeDimensionControlOptions) for the TimeDimension Control object.


### L.TimeDimension

TimeDimension object manages the time component of a layer. It can be shared among different layers and it can be added to a map, and become the default timedimension component for any layer added to the map.

In order to include a TimeDimension in the map, add `timeDimension: true` as an option when creating the map.

#### Usage example

```javascript
L.timeDimension().addTo(map);
```

#### Creation

Factory                              | Description
-------------------------------------|------------
`L.timeDimension(<Object> options?)` |

#### <a name="timeDimensionOptions"></a>Options

This options can be set up when creating the map with the option `timeDimensionOptions`.

Option           | Type     | Default                | Description
-----------------|----------|------------------------|------------
`times`          | `Number` | `null`                 | It can be: a) An array of times (in milliseconds). b) String of dates separated by commas. c) String formed by `start date`/`end date`/`period`. If null, it will be constructed according to `timeInterval` and `period`
`timeInterval`   | `String` | `"P1M/" + today`       | String to construct the first available time and the last available time. Format: [ISO8601 Time inverval](https://en.wikipedia.org/wiki/ISO_8601#Time_intervals)
`period`         | `String` | `"P1D"`                | Used to construct the array of available times starting from the first available time. Format: [ISO8601 Duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
`validTimeRange` | `String` | `undefined`            | Filter the array of available times by start hour and end hour (for any date). Format `"HH:MM/HH:MM"`.
`currentTime`    | `Number` | Closest available time | Current time to be loaded. Time in ms.
`loadingTimeout` | `Number` | `3000`                 | Maximum time in milliseconds that the component will wait to apply a new time if synced layers are not ready
`lowerLimitTime` | `Number` | `undefined`            |
`upperLimitTime` | `Number` | `undefined`            |

#### Events

Event                   | Data                          | Description
------------------------|-------------------------------|------------
`timeloading`           | `time`                        | Fired when a new time is required to load
`timeload`              | `time`                        | Fired when a all synced layers have been loaded/prepared for a new time (or timeout)
`availabletimeschanged` | `availableTimes, currentTime` | Fired when the list of available times have been updated
`limitschanged`         | `lowerLimit, upperLimit`      | Fired when range limits changed. Limits are expressed in index value

#### Methods

Method                                                                  | Returns          | Description
------------------------------------------------------------------------|------------------|------------
`getAvailableTimes()`                                                   | `Array of times` | Array of all the available times of the TimeDimension
`getCurrentTime()`                                                      | `time`           | Current time of the Time Dimension
`setCurrentTime(<Number> time)`                                         | -                | Modify the current time. If the time argument is not among the available times, the previous closest time will be selected
`nextTime(<Number> numSteps, <Boolean> loop)`                           | -                | Move the current time n steps forward in the available times array
`previousTime(<Number> numSteps, <Boolean> loop)`                       | -                | Move the current time n steps backward in the available times array
`prepareNextTimes(<Number> numSteps, <Number> howmany, <Boolean> loop)` | -                | Fire 'timeloading' for severals times (in order to pre-load layers)
`registerSyncedLayer(<L.TimeDimension.Layer> layer)`                    | -                | TimeDimension will check if all layers are ready before firing timeload. It will listen to "timeload" event of these layers.
`unregisterSyncedLayer(<L.TimeDimension.Layer> layer)`                  | -                |
`setAvailableTimes(<Array> times, <String> mode)`                       | -                | Update available times of the TimeDimension with a new array of times (in ms). Mode : [Update modes](#timedimension-update-modes)


### L.TimeDimension.Layer

TimeDimension.Layer is an abstract Layer that can be managed/synchronized with a TimeDimension. The constructor recieves a layer (of any kind) and options.

Any children class should implement `_onNewTimeLoading`, `isReady` and `_update` functions to react to time changes.

#### <a name="timeDimensionLayerOptions"></a>Options

Option          | Type                | Default | Description
----------------|---------------------|---------|------------
`timeDimension` | `<L.TimeDimension>` | `null`  | TimeDimension object which will manage this layer. If it is not defined, the map TimeDimension will be attached when adding this layer to the map.
`opacity`       | `Number`            | `1`     |
`zIndex`        | `Number`            | `1`     |

#### Events

Event      | Data   | Description
-----------|--------|------------
`timeload` | `time` | Fires when a the layer has been loaded/prepared for a new time


### L.TimeDimension.Layer.WMS

Implements a TimeDimension Layer for a given WMS layer, which can be a [L.TileLayer.WMS](http://leafletjs.com/reference.html#tilelayer-wms) or a [L.NonTiledLayer.WMS](https://github.com/ptv-logistics/Leaflet.NonTiledLayer).

This component synchronizes the WMS with a TimeDimension, modifying the `time` parameter in the WMS requests.

#### Usage example

```javascript
L.timeDimension.layer.wms(layer).addTo(map);
```

#### Creation

Factory                                                         | Description
----------------------------------------------------------------|------------
`L.timeDimension.layer.wms(<L.Layer> layer, <Object> options?)` |

#### <a name="timeDimensionLayerWMSOptions"></a>Options

Option                        | Type      | Default                              | Description
------------------------------|-----------|--------------------------------------|------------
`cache`                       | `Number`  | `0`                                  |
`cacheBackward`               | `Number`  | `cache` or `0`                       | Number of layers that can be kept hidden on the map for previous times
`cacheForward`                | `Number`  | `cache` or `0`                       | Number of layers that can be kept hidden on the map for future times
`updateTimeDimension`         | `Boolean` | `false`                              | Update the list of available times of the attached TimeDimension with the available times obtained by getCapabilities
`updateTimeDimensionMode`     | `String`  | `"intersect"`                        | Operation to merge the available times of the TimeDimension and the layer (intersect, union, replace or extremes). See [Update modes](#timedimension-update-modes)
`requestTimeFromCapabilities` | `Boolean` | `false`                              | Get list of available times for this layer from getCapabilities
`proxy`                       | `String`  | `null`                               | URL of the proxy used to obtain getCapabilities responses from the WMS server avoiding cross site origin problems
`getCapabilitiesParams`       | `Object`  | `{}`                                 | Extra parameters needed to create getCapabilities request
`getCapabilitiesUrl`          | `String`  | `null`                               | Alternative URL for the GetCapabilities request (useful if using a cache service like GeoWebCache)
`getCapabilitiesLayerName`    | `String`  | `null`                               | Alternative layer name for the GetCapabilities request (useful if using a cache service like GeoWebCache)
`setDefaultTime`              | `Boolean` | `false`                              | If true, it will change the current time to the default time of the layer (according to getCapabilities)
`period`                      | `String`  | `null`                               | Duration between times that will be used to generate the available times of the layer from a time interval. It overwrites the value received in getCapabilities (if not null). Format: [ISO8601 Duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
`wmsVersion`                  | `String`  | `layer.options.version` or `"1.1.1"` | WMS version of the layer. Used to construct the getCapabilities request


### L.TimeDimension.Layer.GeoJSON

Manages a GeoJSON layer with a TimeDimension. According to GeoJSON specification, geometry coordinates can have only three dimensions: latitude, longitude and elevation. There isn't a standard way to add time dimension information. This plugin will search for some attributes inside properties:
- `coordTimes`, `times` or `linestringTimestamps`: array of times that can be associated with a geometry (datestrings or ms). In the case of a LineString, it must have as many items as coordinates in the LineString. (Note: `coordTimes` is the name of the property [recently](https://github.com/mapbox/togeojson/blob/master/CHANGELOG.md#0100) included at [Mapbox toGeoJSON library](http://mapbox.github.io/togeojson/))
- `time`: time of the feature

This component will create and show new GeoJSON layers which include only those features (or part of them) that are active for the time of the TimeDimension (according to a duration option). These new layers will inherit the baseLayer options. In the case of LineStrings, if `addlastPoint` option is enabled, a Point feature will be added with the property `last` (that can be used to customize the marker of this special Point).

#### Usage example

```javascript
L.timeDimension.layer.geoJson(layer).addTo(map);
```

#### Creation

Factory                                                             | Description
--------------------------------------------------------------------|------------
`L.timeDimension.layer.geoJson(<L.Layer> layer, <Object> options?)` |

#### <a name="timeDimensionLayerGeoJSONOptions"></a>Options

Option                    | Type      | Default      | Description
--------------------------|-----------|--------------|------------
`duration`                | `String`  | `null`       | Period of time which the features will be shown on the map after their time has passed. If null, all previous times will be shown. Format: [ISO8601 Duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
`addlastPoint`            | `Boolean` | `false`      | Add a Point at the last valid coordinate of a LineString.
`waitForReady`            | `Boolean` | `false`      | If `true`, it will wait until the baseLayer is loaded to mark itself as ready. You can use it with layers created using [leaflet-omnivore](https://github.com/mapbox/leaflet-omnivore).
`updateTimeDimension`     | `Boolean` | `false`      | Update the list of available times of the attached TimeDimension with the available times of this GeoJSON
`updateTimeDimensionMode` | `String`  | `"extremes"` | Operation to merge the available times of the TimeDimension and the layer (intersect, union, replace or extremes)
`updateCurrentTime`       | `Boolean`  | `updateTimeDimension` | Automatically change the current time of map to the first available time of the GeoJSON layer.


### L.Control.TimeDimension

Leaflet control to manage a timeDimension. With play|pause, next, back, current time, time slider and speed slider controls.

#### Usage example

```javascript
L.control.timeDimension().addTo(map);
```

#### Creation

Factory                                      | Description
---------------------------------------------|------------
`L.control.timeDimension(<Object> options?)` |

#### <a name="timeDimensionControlOptions"></a>Options

Option                 | Type                       | Default                         | Description
-----------------------|----------------------------|---------------------------------|------------
`timeDimension`        | `<L.TimeDimension>`        | `null`                          |
`styleNS`              | `String`                   | `"leaflet-control-timecontrol"` |
`position`             | `String`                   | `"bottomleft"`                  |
`title`                | `String`                   | `"Time Control"`                |
`backwardButton`       | `Boolean`                  | `true`                          | Show backward button
`forwardButton`        | `Boolean`                  | `true`                          | Show forward button
`playButton`           | `Boolean`                  | `true`                          | Show play/pause button
`playReverseButton`    | `Boolean`                  | `false`                         |
`loopButton`           | `Boolean`                  | `false`                         | Show loop button to enable/disable loop animation
`displayDate`          | `Boolean`                  | `true`                          | Show display date control
`timeSlider`           | `Boolean`                  | `true`                          | Show time slider control
`timeSliderDragUpdate` | `Boolean`                  | `false`                         | Update the map when dragging
`limitSliders`         | `Boolean`                  | `false`                         | Show limit knobs on the time slider to restrict animation range
`limitMinimumRange`    | `Number`                   | `5`                             | The minimum number of steps allowed in animation range
`speedSlider`          | `Boolean`                  | `true`                          | Show speed slider control
`minSpeed`             | `Number`                   | `0.1`                           | Minimum selectable value for speed slider in fps (`1000/transitionTime`)
`maxSpeed`             | `Number`                   | `10`                            | Maximum selectable value for speed slider in fps
`speedStep`            | `Number`                   | `0.1`                           | Speed slider step size
`timeSteps`            | `Number`                   | `1`                             | Number of time steps applied to the TimeDimension (forwards or backwards) in a time change
`autoPlay`             | `Boolean`                  | `false`                         | Animate the map automatically
`player`               | `<L.TimeDimension.Player>` | `undefined`                     | Attach an existing player to that control
`playerOptions`        | `Object`                   | `{transitionTime: 1000}`        | [Options](#timeDimensionPlayerOptions) for the TimeDimension Player object attached.(Cannot be used with `player` option)
`timeZones`            | `Array of strings`         | `["UTC", "Local"]`              | Clicking on the date cycles between these


### L.TimeDimension.Player

Component to animate a map with a TimeDimension, changing the time periodically.

#### Usage example

```javascript
var player = new L.TimeDimension.Player({}, timeDimension).addTo(map);
```

#### Creation

Factory                                                                      | Description
-----------------------------------------------------------------------------|------------
`L.TimeDimension.Player(<Object> options?, <L.TimeDimension> timeDimension)` |

#### <a name="timeDimensionPlayerOptions"></a>Options

Option           | Type      | Default | Description
-----------------|-----------|---------|------------
`transitionTime` | `Number`  | `1000`  | Milliseconds that the player will wait to check and launch the next time in the TimeDimension
`buffer`         | `Number`  | `5`     | *(Number or Function)* Number of times forward that will be requested in each iteration. Function callback will be called with 3 parameters (`transitionTime`, `minBufferReady`, `loop`)
`minBufferReady` | `Number`  | `1`     | If this option is greater than 0, the player will full the buffer every time the number of next ready times (next layers ready) is below this number.
`loop`           | `Boolean` | `false` | Loop the animation when it reaches the last available time
`startOver`      | `Boolean` | `false` | When the player is at the last position, it start over to the beginning when the user press play

#### <a name="timeDimensionPlayerEvents"></a>Events
List of events triggered by the player. Register with [`.on()`](http://leafletjs.com/reference.html#events-addeventlistener)

Event               | Data                       | Description
--------------------|----------------------------|------------
`play`              | -                          | When the animation is started/unpaused
`running`           | -                          | When the animation is resuming after a waiting state
`stop`              | -                          | When the animation is stopped/paused
`waiting`           | `buffer, available`        | When the animation is waiting for some layers to be loaded
`animationfinished` | -                          | When the animation has reached the end of the timeline (`loop` is disabled)
`loopchange`        | `loop`                     | When the `loop` setting is changed
`speedchange`       | `transitionTime, buffer`   | When the `transitionTime` setting is changed

#### <a name="timeDimensionPlayerMethod"></a>Methods

Method                                       | Returns     | Description
---------------------------------------------|-------------|------------
`start(<Number> numSteps)`                   | -           | Start animation
`stop()`                                     | -           | Stop active animation
`pause()`                                    | -           | Pause active animation
`release()`                                  | -           | Resume animation paused
`getTransitionTime()`                        | `<Number>`  | Return the time interval between two animation steps (in milliseconds)
`setTransitionTime(<Number> transitionTime)` | -           | Change the time interval between two animation steps
`isLooped()`                                 | `<Boolean>` | Return the loop state
`setLooped(<Boolean> looped)`                | -           | Activate/Desactivate the loop state

### TimeDimension update modes
Update mode can be one of these values: `intersect`, `union`, `replace`, `extremes`.
- `replace` It replaces available times with only the new ones (from layer or `setAvailableTimes`).
- `union` It adds new times and merge them to existing ones.
- `intersect` It keeps only the time shared in both existing and new ones.
- `extremes` It can recompute periodic times according to [`options.period`](#timeDimensionOptions) and extreme values of the set.

## Requisites
- [leaflet](http://leafletjs.com/)
- [iso8601-js-period](https://github.com/nezasa/iso8601-js-period)
- For the TimeDimension Control:
    - Glyphicons Halflings

## Talks
- Leaflet.TimeDimension: ¡esto se anima!(esp)
[10as Jornadas SIG libre. Girona 2016](http://www.sigte.udg.edu/jornadassiglibre2016/) |
[Video](https://vimeo.com/172724621) |
[Slides](https://apps.socib.es/Leaflet.TimeDimension/slides/slides-siglibre10.html)

- Leaflet.TimeDimension webinar (eng)
[Interoperability and Technology/Tech Dive Webinar Series](http://wiki.esipfed.org/index.php/Interoperability_and_Technology/Tech_Dive_Webinar_Series) from [ESIP](http://www.esipfed.org/) |
[Video](https://www.youtube.com/watch?v=US5FUUPqlww) |
[Slides](https://apps.socib.es/Leaflet.TimeDimension/slides/slides-esip.html)


## Bugs, issues and contributions

Contributions and criticisms are welcome.

If you have any doubt or problem, please fill an [issue](https://github.com/socib/Leaflet.TimeDimension/issues)!

If you fix something or want to add some contribution, many thanks in advance!
