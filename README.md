# Leaflet TimeDimension

Add time dimension capabilities on a Leaflet map. 

## Examples

Checkout the [Leaflet TimeDimension Demos](http://apps.socib.es/Leaflet.TimeDimension/examples/).
Basic example:

```javascript
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

var testWMS = "http://thredds.socib.es/thredds/wms/observational/hf_radar/hf_radar_ibiza-scb_codarssproc001_aggregation/dep0001_hf-radar-ibiza_scb-codarssproc001_L1_agg.nc"
var testLayer = L.nonTiledLayer.wms(testWMS, {
    layers: 'sea_water_velocity',
    format: 'image/png',
    transparent: true,
    styles: 'prettyvec/rainbow',
    markerscale: 15,
    markerspacing: 20,
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    colorscalerange: "0,0.4",
    attribution: 'SOCIB HF RADAR | sea_water_velocity'
});
var testTimeLayer = L.timeDimension.layer.wms(testLayer);
testTimeLayer.addTo(map);
```

## API

### L.Map

This plugin will attach to a Map a TimeDimension object and a TimeDimension Control related if `timeDimension` and `timeDimensionControl` options are included.

Option                        | Description
------------------------------|---------------------------------------------------------
`timeDimension`               | Creates a new TimeDimesion object linked to the map.
`timeDimensionOptions`        | [Options](#timeDimensionOptions) for the TimeDimension object.
`timeDimensionControl`        | Adds a TimeDimension Control to the map.
`timeDimensionControlOptions` | [Options](#timeDimensionControlOptions) for the TimeDimension Control object.


### L.TimeDimension

TimeDimension object manages the time component of a layer. It can be shared among different layers and it can be added to a map, and become the default timedimension component for any layer added to the map. 

In order to include a TimeDimension in the map, add `timeDimension: true` as an option when creating the map.    

#### <a name="timeDimensionOptions"></a> Options

This options can be set up when creating the map with the option `timeDimensionOptions`.

Option                | Default       | Description
----------------------|---------------|---------------------------------------------------------
`times`               | `null`        | It can be: a) An array of times (in milliseconds). b) String of dates separated by commas. c) String formed by `start date`/`end date`/`period`. If null, it will be constructed according to `timeInterval` and `period`
`timeInterval`        | `"P1M/" + today` | String to construct the first available time and the last available time. Format: [ISO8601 Time inverval](http://en.wikipedia.org/wiki/ISO_8601#Time_intervals)
`period`              | `"P1D"`       | Used to construct the array of available times starting from the first available time. Format: [ISO8601 Duration](http://en.wikipedia.org/wiki/ISO_8601#Durations)
`currentTime`         | Closest available time | Current time to be loaded. Time in ms.
`loadingTimeout`      | `3000`        | Maximum time in milliseconds that the component will wait to apply a new time if synced layers are not ready

#### Events

Event         | Data   | Description
--------------|--------|---------------------------------------------------------------
`timeloading` | time   | Fired when a new time is required to load
`timeload`    | time   | Fired when a all synced layers have been loaded/prepared for a new time (or timeout)
`availabletimeschanged`    | -   | Fired when the list of available times have been updated

#### Methods

Method                 | Returns          | Description
-----------------------|------------------|-----------------------------------------------------------------
`getAvailableTimes()`  | `Array of times` | Array of all the available times of the TimeDimension
`getCurrentTime()`     | `time`           | Current time of the Time Dimension
`setCurrentTime(time)` | -                | Modify the current time. If the time argument is not among the available times, the previous closest time will be selected
`nextTime(numSteps)`   | -                | Move the current time n steps forward in the available times array
`previousTime(numSteps)` | -              | Move the current time n steps backward in the available times array
`prepareNextTimes(numSteps, howmany)` | - | Fire 'timeloading' for severals times (in order to pre-load layers)
`registerSyncedLayer(L.TimeDimension.Layer layer)` | - | TimeDimension will check if all layers are ready before firing timeload. It will listen to "timeload" event of these layers.
`unregisterSyncedLayer(L.TimeDimension.Layer layer)`| -                | 
`setAvailableTimes(times, mode)`| -       | Update available times of the TimeDimension with a new array of times (in ms). Mode can be one of these values: `intersect`, `union`, `replace`, `extremes` (this will take the first time and the last time given and it will create available times according to the TimeDimension period). 


### L.TimeDimension.Layer

TimeDimension.Layer is an abstract Layer that can be managed/synchronized with a TimeDimension. The constructor recieves a layer (of any kind) and options.

Any children class should implement `_onNewTimeLoading`, `isReady` and `_update` functions to react to time changes.


#### <a name="timeDimensionLayerOptions"></a> Options

Option                | Default       | Description
----------------------|---------------|---------------------------------------------------------
`timeDimension`       | `null`        | TimeDimension object which will manage this layer. If it is not defined, the map TimeDimension will be attached when adding this layer to the map.

#### Events

Event         | Data   | Description
--------------|--------|---------------------------------------------------------------
`timeload`    | time   | Fires when a the layer has been loaded/prepared for a new time


### L.TimeDimension.Layer.WMS

Implements a TimeDimension Layer for a given WMS layer, which can be a [L.TileLayer.WMS](http://leafletjs.com/reference.html#tilelayer-wms) or a [L.NonTiledLayer.WMS](https://github.com/ptv-logistics/Leaflet.NonTiledLayer).

This component synchronizes the WMS with a TimeDimension, modifying the `time` parameter in the WMS requests.

#### <a name="timeDimensionLayerWMSOptions"></a> Options

Option                | Default       | Description
----------------------|---------------|---------------------------------------------------------
`timeDimension`       | `null`        | 
`cache`               | `0`           | 
`cacheBackward`       | `cache || 0`  | Number of layers that can be kept hidden on the map for previous times
`cacheForward`        | `cache || 0`  | Number of layers that can be kept hidden on the map for future times
`updateTimeDimension` | `false`       | Update the list of available times of the attached TimeDimension with the available times obtained by getCapabilities
`updateTimeDimensionMode` | `intersect` | Operation to merge the available times of the TimeDimension and the layer (intersect, union, replace or extremes)
`requestTimeFromCapabilities` | `false || updateTimeDimension` | Get list of available times for this layer from getCapabilities 
`proxy`               | `null`        | URL of the proxy used to obtain getCapabilities responses from the WMS server avoiding cross site origin problems
`setDefaultTime`      | `false`       | If true, it will change the current time to the default time of the layer (according to getCapabilities)
`wmsVersion`          | `"1.1.1"`     | WMS version of the layer. Used to construct the getCapabilities request


### L.TimeDimension.Layer.GeoJSON

Manages a GeoJSON layer with a TimeDimension. According to GeoJSON specification, geometry coordinates can have only three dimensions: latitude, longitude and elevation. There isn't an standard way to add time dimension information. This plugin will search for some attributes inside properties: 
- times or linestringTimestamps: array of times that can be associated with a geometry (datestrings or ms). In the case of a LineString, it must have as many items as coordinates in the LineString.
- time: time of the feature

This component will modify the GeoJSON layer in order to show only that features (or part of them) that are active for the time of the TimeDimension (according to a duration option).


#### <a name="timeDimensionLayerGeoJSONOptions"></a> Options

Option                | Default       | Description
----------------------|---------------|---------------------------------------------------------
`timeDimension`       | `null`        | 
`duration`            | `null`        | Period of time which the features will be shown on the map after their time has passed. If null, all previous times will be shown. Format: [ISO8601 Duration](http://en.wikipedia.org/wiki/ISO_8601#Durations)
`addlastPoint`        | `false`       | Add a Point at the last valid coordinate of a LineString.
`updateTimeDimension` | `false`       | Update the list of available times of the attached TimeDimension with the available times of this GeoJSON
`updateTimeDimensionMode` | `extremes` | Operation to merge the available times of the TimeDimension and the layer (intersect, union, replace or extremes)



### L.Control.TimeDimension

Leaflet control to manage a timeDimension. With play|pause, next, back, current time, time slider and speed slider controls.

#### <a name="timeDimensionControlOptions"></a> Options

Option                | Default       | Description
----------------------|---------------|---------------------------------------------------------
`timeDimension`       | `null`        | 
`backwardButton`      | `true`        | Show backward button
`forwardButton`       | `true`        | Show forward button
`playButton`          | `true`        | Show play|pause button
`displayDate`         | `true`        | Show display date control
`timeSlider`          | `true`        | Show time slider control
`speedSlider`         | `true`        | Show speed slider control
`timeSteps`           | `1`           | Number of time steps applied to the TimeDimension (forwards or backwards) in a time change
`autoPlay`            | `false`       | Animate the map automatically
`playerOptions`       | -             | [Options](#timeDimensionPlayerOptions) for the TimeDimension Player object attached.




### L.TimeDimension.Player

Component to animate a map with a TimeDimension, changing the time periodically.  

#### <a name="timeDimensionPlayerOptions"></a> Options

Option                | Default       | Description
----------------------|---------------|---------------------------------------------------------
`timeDimension`       | `null`        | 
`transitionTime`      | `1000`        | Milliseconds that the player will wait to check and launch the next time in the TimeDimension
`buffer`              | `10`          | Number of times forward that will be requested in each iteration
`loop`                | `false`       | Loop the animation when arrives to the last available time


## Requisites

- [iso8601-js-period](https://github.com/nezasa/iso8601-js-period)
- For the TimeDimension Control:
    - jquery
    - jquery UI
    - glyphicons


## Bugs, issues and contributions

Contributions and criticism are welcome.

If you have any doubt or problem, please fill an [issue](https://github.com/socib/Leaflet.TimeDimension/issues)!

If you fix something or want to add some contribution, many thanks in advance!