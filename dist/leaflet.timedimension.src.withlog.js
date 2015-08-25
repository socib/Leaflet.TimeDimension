/* 
 * Leaflet TimeDimension v0.1.3 - 2015-08-25 
 * 
 * Copyright 2015 Biel Frontera (ICTS SOCIB) 
 * datacenter@socib.es 
 * http://www.socib.es/ 
 * 
 * Licensed under the MIT license. 
 * 
 * Demos: 
 * http://apps.socib.es/Leaflet.TimeDimension/ 
 * 
 * Source: 
 * git@github.com:socib/Leaflet.TimeDimension.git 
 * 
 */
/*
 * L.TimeDimension: TimeDimension object manages the time component of a layer.
 * It can be shared among different layers and it can be added to a map, and become
 * the default timedimension component for any layer added to the map.
 */

L.TimeDimension = L.Class.extend({

    includes: L.Mixin.Events,

    initialize: function(options) {
        L.setOptions(this, options);
        // _availableTimes is an array with all the available times in ms.
        this._availableTimes = this._generateAvailableTimes();
        this._currentTimeIndex = -1;
        this._loadingTimeIndex = -1;
        this._loadingTimeout = this.options.loadingTimeout || 3000;
        this._syncedLayers = [];
        if (this._availableTimes.length > 0) {
            this.setCurrentTime(this.options.currentTime || this._getDefaultCurrentTime());
        }
    },

    getAvailableTimes: function() {
        return this._availableTimes;
    },

    getCurrentTimeIndex: function() {
        if (this._currentTimeIndex == -1) {
            return this._availableTimes.length - 1;
        }
        return this._currentTimeIndex;
    },

    getCurrentTime: function() {
        var index = -1;
        if (this._loadingTimeIndex != -1) {
            index = this._loadingTimeIndex;
        } else {
            index = this.getCurrentTimeIndex();
        }
        if (index >= 0) {
            return this._availableTimes[index];
        } else {
            return 0;
        }
    },

    isLoading: function() {
        return (this._loadingTimeIndex != -1);
    },

    setCurrentTimeIndex: function(newIndex) {
        if (newIndex >= this._availableTimes.length) {
            newIndex = this._availableTimes.length - 1;
        }
        if (newIndex < 0) {
            return;
        }
        this._loadingTimeIndex = newIndex;
        var newTime = this._availableTimes[newIndex];
        console.log('INIT -- Current time: ' + new Date(newTime).toISOString());
        if (this._checkSyncedLayersReady(this._availableTimes[this._loadingTimeIndex])) {
            this._newTimeIndexLoaded();
        } else {
            this.fire('timeloading', {
                time: newTime
            });
            // add timeout of 3 seconds if layers doesn't response
            setTimeout((function(index) {
                if (index == this._loadingTimeIndex) {
                    console.log('Change time for timeout');
                    this._newTimeIndexLoaded();
                }
            }).bind(this, newIndex), this._loadingTimeout);
        }

    },

    _newTimeIndexLoaded: function() {
        if (this._loadingTimeIndex == -1) {
            return;
        }
        var time = this._availableTimes[this._loadingTimeIndex];
        console.log('END -- Current time: ' + new Date(time).toISOString());
        this._currentTimeIndex = this._loadingTimeIndex;
        this.fire('timeload', {
            time: time
        });
        this._loadingTimeIndex = -1;
    },

    _checkSyncedLayersReady: function(time) {
        for (var i = 0, len = this._syncedLayers.length; i < len; i++) {
            if (this._syncedLayers[i].isReady) {
                if (!this._syncedLayers[i].isReady(time)) {
                    return false;
                }
            }
        }
        return true;
    },

    setCurrentTime: function(time) {
        var newIndex = this._seekNearestTimeIndex(time);
        this.setCurrentTimeIndex(newIndex);
    },

    seekNearestTime: function(time) {
        var index = this._seekNearestTimeIndex(time);
        return this._availableTimes[index];
    },    

    nextTime: function(numSteps, loop) {
        if (numSteps === undefined) {
            numSteps = 1;
        }
        if (loop === undefined) {
            loop = false;
        }

        var newIndex = this._currentTimeIndex;
        if (this._loadingTimeIndex > -1)
            newIndex = this._loadingTimeIndex;
        newIndex = newIndex + numSteps;
        if (newIndex >= this._availableTimes.length) {            
            if (loop){
                newIndex = 0;
            }else{
                // nextTime out of range
                return;                
            }
        }
        this.setCurrentTimeIndex(newIndex);
    },

    prepareNextTimes: function(numSteps, howmany) {
        if (numSteps === undefined) {
            numSteps = 1;
        }

        var newIndex = this._currentTimeIndex;
        if (this._loadingTimeIndex > -1)
            newIndex = this._loadingTimeIndex;
        // assure synced layers have a buffer/cache of at least howmany elements
        for (var i = 0, len = this._syncedLayers.length; i < len; i++) {
            if (this._syncedLayers[i].setMinimumForwardCache) {
                this._syncedLayers[i].setMinimumForwardCache(howmany);
            }
        }
        var count = howmany;
        while (count > 0) {
            newIndex = newIndex + numSteps;
            if (newIndex >= this._availableTimes.length) {
                break;
            }
            this.fire('timeloading', {
                time: this._availableTimes[newIndex]
            });
            count--;
        }
    },

    getNumberNextTimesReady: function(numSteps, howmany) {
        if (numSteps === undefined) {
            numSteps = 1;
        }

        var newIndex = this._currentTimeIndex;
        if (this._loadingTimeIndex > -1)
            newIndex = this._loadingTimeIndex;
        var count = howmany;
        var ready = 0;
        while (count > 0) {
            newIndex = newIndex + numSteps;
            if (newIndex >= this._availableTimes.length) {
                count = 0;
                ready = howmany;
                break;
            }            
            var time = this._availableTimes[newIndex];
            if (this._checkSyncedLayersReady(time)){
                ready++;
            }
            count--;
        }
        return ready;
    },

    previousTime: function(numSteps) {
        if (numSteps === undefined) {
            numSteps = 1;
        }
        var newIndex = this._currentTimeIndex;
        if (this._loadingTimeIndex > -1)
            newIndex = this._loadingTimeIndex;
        newIndex = newIndex - numSteps;
        if (newIndex < 0) {
            newIndex = 0;
        }
        this.setCurrentTimeIndex(newIndex);
    },

    registerSyncedLayer: function(layer) {
        this._syncedLayers.push(layer);
        layer.on("timeload", this._onSyncedLayerLoaded, this);
    },

    unregisterSyncedLayer: function(layer) {
        var index = this._syncedLayers.indexOf(layer);
        if (index != -1) {
            this._syncedLayers.splice(index, 1);
        }
        layer.off("timeload", this._onSyncedLayerLoaded, this);
    },

    _onSyncedLayerLoaded: function(e) {
        if (e.time == this._availableTimes[this._loadingTimeIndex] && this._checkSyncedLayersReady(e.time)) {
            this._newTimeIndexLoaded();
        }
    },

    _generateAvailableTimes: function() {
        if (this.options.times) {
            return L.TimeDimension.Util.parseTimesExpression(this.options.times);
        } else if (this.options.timeInterval) {
            var tiArray = L.TimeDimension.Util.parseTimeInterval(this.options.timeInterval);
            var period = this.options.period || "P1D";
            var validTimeRange = this.options.validTimeRange || undefined; 
            return L.TimeDimension.Util.explodeTimeRange(tiArray[0], tiArray[1], period, validTimeRange);
        } else {
            return [];
        }
    },

    _getDefaultCurrentTime: function() {
        var index = this._seekNearestTimeIndex(new Date().getTime());
        return this._availableTimes[index];
    },

    _seekNearestTimeIndex: function(time) {
        var newIndex = 0;
        var len = this._availableTimes.length;
        for (; newIndex < len; newIndex++) {
            if (time < this._availableTimes[newIndex]) {
                break;
            }
        }
        // We've found the first index greater than the time. Return the previous
        if (newIndex > 0) {
            newIndex--;
        }
        return newIndex;
    },

    setAvailableTimes: function(times, mode) {
        var currentTime = this.getCurrentTime();
        if (mode == 'extremes') {
            var period = this.options.period || "P1D";
            this._availableTimes = L.TimeDimension.Util.explodeTimeRange(new Date(times[0]), new Date(times[times.length - 1]), period);
        } else {
            var parsedTimes = L.TimeDimension.Util.parseTimesExpression(times);
            if (this._availableTimes.length == 0) {
                this._availableTimes = parsedTimes;
            } else if (mode == 'intersect') {
                this._availableTimes = L.TimeDimension.Util.intersect_arrays(parsedTimes, this._availableTimes);
            } else if (mode == 'union') {
                this._availableTimes = L.TimeDimension.Util.union_arrays(parsedTimes, this._availableTimes);
            } else if (mode == 'replace') {
                this._availableTimes = parsedTimes;
            } else {
                throw "Merge available times mode not implemented: " + mode;
            }
        }
        this.setCurrentTime(currentTime);
        this.fire('availabletimeschanged', {});
        console.log('available times changed');
    }
});

L.Map.addInitHook(function() {
    if (this.options.timeDimension) {
        this.timeDimension = L.timeDimension(this.options.timeDimensionOptions || {});
    }
});

L.timeDimension = function(options) {
    return new L.TimeDimension(options);
};
/*
 * L.TimeDimension.Util
 */

L.TimeDimension.Util = {
    getTimeDuration: function(ISODuration) {
        if (nezasa === undefined) {
            throw "iso8601-js-period library is required for Leatlet.TimeDimension: https://github.com/nezasa/iso8601-js-period";
        }
        return nezasa.iso8601.Period.parse(ISODuration, true);
    },

    addTimeDuration: function(date, duration, utc) {
        if (utc === undefined) {
            utc = true;
        }
        if (typeof duration == 'string' || duration instanceof String) {
            duration = this.getTimeDuration(duration);
        }
        var l = duration.length;
        var get = utc ? "getUTC" : "get";
        var set = utc ? "setUTC" : "set";

        if (l > 0 && duration[0] != 0) {
            date[set + "FullYear"](date[get + "FullYear"]() + duration[0]);
        }
        if (l > 1 && duration[1] != 0) {
            date[set + "Month"](date[get + "Month"]() + duration[1]);
        }
        if (l > 2 && duration[2] != 0) {
            // weeks
            date[set + "Date"](date[get + "Date"]() + (duration[2] * 7));
        }
        if (l > 3 && duration[3] != 0) {
            date[set + "Date"](date[get + "Date"]() + duration[3]);
        }
        if (l > 4 && duration[4] != 0) {
            date[set + "Hours"](date[get + "Hours"]() + duration[4]);
        }
        if (l > 5 && duration[5] != 0) {
            date[set + "Minutes"](date[get + "Minutes"]() + duration[5]);
        }
        if (l > 6 && duration[6] != 0) {
            date[set + "Seconds"](date[get + "Seconds"]() + duration[6]);
        }
    },

    subtractTimeDuration: function(date, duration, utc) {
        if (typeof duration == 'string' || duration instanceof String) {
            duration = this.getTimeDuration(duration);
        }
        var subDuration = [];
        for (var i = 0, l = duration.length; i < l; i++) {
            subDuration.push(-duration[i]);
        }
        this.addTimeDuration(date, subDuration, utc);
    },

    parseAndExplodeTimeRange: function(timeRange) {
        var tr = timeRange.split('/');
        var startTime = new Date(Date.parse(tr[0]));
        var endTime = new Date(Date.parse(tr[1]));
        var duration = tr.length > 2 ? tr[2] : "P1D";

        return this.explodeTimeRange(startTime, endTime, duration);
    },

    explodeTimeRange: function(startTime, endTime, ISODuration, validTimeRange) {
        var duration = this.getTimeDuration(ISODuration);
        var result = [];
        var currentTime = new Date(startTime.getTime());
        var minHour = null,
            minMinutes = null,
            maxHour = null,
            maxMinutes = null;
        if (validTimeRange !== undefined) {
            var validTimeRangeArray = validTimeRange.split('/');
            minHour = validTimeRangeArray[0].split(':')[0];
            minMinutes = validTimeRangeArray[0].split(':')[1];
            maxHour = validTimeRangeArray[1].split(':')[0];
            maxMinutes = validTimeRangeArray[1].split(':')[1];
        }
        while (currentTime <= endTime) {
            if (validTimeRange === undefined ||
                (currentTime.getUTCHours() >= minHour && currentTime.getUTCHours() <= maxHour)
            ) {
                if ((currentTime.getUTCHours() != minHour || currentTime.getUTCMinutes() >= minMinutes) &&
                    (currentTime.getUTCHours() != maxHour || currentTime.getUTCMinutes() <= maxMinutes)) {
                    result.push(currentTime.getTime());
                }
            }
            this.addTimeDuration(currentTime, duration);
        }
        if (currentTime > endTime){
            result.push(endTime.getTime());
        }
        return result;
    },

    parseTimeInterval: function(timeInterval) {
        var parts = timeInterval.split("/");
        if (parts.length != 2) {
            throw "Incorrect ISO9601 TimeInterval: " + timeInterval;
        }
        var startTime = Date.parse(parts[0]);
        var endTime = null;
        var duration = null;
        if (isNaN(startTime)) {
            // -> format duration/endTime
            duration = this.getTimeDuration(parts[0]);
            endTime = Date.parse(parts[1]);
            startTime = new Date(endTime);
            this.subtractTimeDuration(startTime, duration, true);
            endTime = new Date(endTime);
        } else {
            endTime = Date.parse(parts[1]);
            if (isNaN(endTime)) {
                // -> format startTime/duration                
                duration = this.getTimeDuration(parts[1]);
                endTime = new Date(startTime);
                this.addTimeDuration(endTime, duration, true);
            } else {
                // -> format startTime/endTime
                endTime = new Date(endTime);
            }
            startTime = new Date(startTime);
        }
        return [startTime, endTime];
    },

    parseTimesExpression: function(times) {
        var result = [];
        if (!times) {
            return result;
        }
        if (typeof times == 'string' || times instanceof String) {
            var testTimeRange = times.split("/");
            if (testTimeRange.length == 3) {
                result = this.parseAndExplodeTimeRange(times);
            } else {
                var dates = times.split(",");
                var time;
                for (var i = 0, l = dates.length; i < l; i++) {
                    time = Date.parse(dates[i]);
                    if (!isNaN(time)) {
                        result.push(time);
                    }
                }
            }
        } else {
            result = times;
        }
        return result.sort(function(a, b) {
            return a - b;
        });
    },

    intersect_arrays: function(arrayA, arrayB) {
        var a = arrayA.slice(0);
        var b = arrayB.slice(0);
        var result = [];
        while (a.length > 0 && b.length > 0) {
            if (a[0] < b[0]) {
                a.shift();
            } else if (a[0] > b[0]) {
                b.shift();
            } else /* they're equal */ {
                result.push(a.shift());
                b.shift();
            }
        }
        return result;
    },

    union_arrays: function(arrayA, arrayB) {
        var a = arrayA.slice(0);
        var b = arrayB.slice(0);
        var result = [];
        while (a.length > 0 && b.length > 0) {
            if (a[0] < b[0]) {
                result.push(a.shift());
            } else if (a[0] > b[0]) {
                result.push(b.shift());
            } else /* they're equal */ {
                result.push(a.shift());
                b.shift();
            }
        }
        if (a.length > 0) {
            result = result.concat(a);
        } else if (b.length > 0) {
            result = result.concat(b);
        }
        return result;
    }

};
/*
 * L.TimeDimension.Layer:  an abstract Layer that can be managed/synchronized with a TimeDimension. 
 * The constructor recieves a layer (of any kind) and options.
 * Any children class should implement `_onNewTimeLoading`, `isReady` and `_update` functions 
 * to react to time changes.
 */

L.TimeDimension.Layer = L.Class.extend({

    includes: L.Mixin.Events,

    initialize: function(layer, options) {
        L.setOptions(this, options || {});
        this._map = null;
        this._baseLayer = layer;
        this._currentLayer = null;
        this._timeDimension = this.options.timeDimension || null;
    },

    addTo: function(map) {
        map.addLayer(this);
        return this;
    },

    onAdd: function(map) {
        this._map = map;
        if (!this._timeDimension && map.timeDimension) {
            this._timeDimension = map.timeDimension;
        }
        this._timeDimension.on("timeloading", this._onNewTimeLoading, this);
        this._timeDimension.on("timeload", this._update, this);
        this._timeDimension.registerSyncedLayer(this);
        this._update();
    },

    onRemove: function(map) {
        this._timeDimension.unregisterSyncedLayer(this);
        this._timeDimension.off("timeloading", this._onNewTimeLoading, this);
        this._timeDimension.off("timeload", this._update, this);
        this.eachLayer(map.removeLayer, map);
        this._map = null;
    },

    eachLayer: function(method, context) {
        method.call(context, this._baseLayer);
        return this;
    },

    setZIndex: function(zIndex) {
        if (this._baseLayer.setZIndex) {
            this._baseLayer.setZIndex(zIndex);
        }
        if (this._currentLayer && this._currentLayer.setZIndex) {
            this._currentLayer.setZIndex(zIndex);
        }
    },

    bringToBack: function() {
        if (!this._currentLayer) {
            return;
        }
        this._currentLayer.bringToBack();
    },

    bringToFront: function() {
        if (!this._currentLayer) {
            return;
        }
        this._currentLayer.bringToFront();
    },

    _onNewTimeLoading: function(ev) {
        // to be implemented for each type of layer
        this.fire('timeload', {
            time: ev.time
        });
        return;
    },

    isReady: function(time) {
        // to be implemented for each type of layer
        return true;
    },

    _update: function() {
        // to be implemented for each type of layer
        return true;
    },

    getBaseLayer: function(){
        return this._baseLayer;
    }

});

L.timeDimension.layer = function(layer, options) {
    return new L.TimeDimension.Layer(layer, options);
};
/*
 * L.TimeDimension.Layer.WMS: wms Layer associated to a TimeDimension
 */

L.TimeDimension.Layer.WMS = L.TimeDimension.Layer.extend({

    initialize: function(layer, options) {
        L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);
        this._timeCacheBackward = this.options.cacheBackward || this.options.cache || 0;
        this._timeCacheForward = this.options.cacheForward || this.options.cache || 0;
        this._wmsVersion = this.options.wmsVersion || "1.1.1";
        this._proxy = this.options.proxy || null;
        this._updateTimeDimension = this.options.updateTimeDimension || false;
        this._setDefaultTime = this.options.setDefaultTime || false;
        this._updateTimeDimensionMode = this.options.updateTimeDimensionMode || 'intersect'; // 'union' or 'replace'
        this._layers = {};
        this._defaultTime = 0;
        this._availableTimes = [];
        this._capabilitiesRequested = false;
        if (this._updateTimeDimension || this.options.requestTimeFromCapabilities) {
            this._requestTimeDimensionFromCapabilities();
        }

        this._baseLayer.on('load', (function() {
            this._baseLayer.setLoaded(true);
            this.fire('timeload', {
                time: this._defaultTime
            });
        }).bind(this));
    },

    eachLayer: function(method, context) {
        for (var prop in this._layers) {
            if (this._layers.hasOwnProperty(prop)) {
                method.call(context, this._layers[prop]);
            }
        }
        return L.TimeDimension.Layer.prototype.eachLayer.call(this, method, context);
    },

    _onNewTimeLoading: function(ev) {
        // console.log('Layer._onNewTimeLoading: ' + this._baseLayer.wmsParams.layers + ' with time: ' + new Date(ev.time).toISOString());
        var layer = this._getLayerForTime(ev.time);
        if (!this._map.hasLayer(layer)) {
            this._map.addLayer(layer);
            // console.log('Layer._onNewTimeLoading: layer added to map');
        }
    },

    isReady: function(time) {
        var layer = this._getLayerForTime(time);
        return layer.isLoaded();
    },

    onAdd: function(map) {
        L.TimeDimension.Layer.prototype.onAdd.call(this, map);
        if (this._availableTimes.length == 0) {
            this._requestTimeDimensionFromCapabilities();
        } else {
            this._updateTimeDimensionAvailableTimes();
        }
    },

    _update: function() {
        if (!this._map)
            return;
        var time = this._timeDimension.getCurrentTime();
        // It will get the layer for this time (create or get)
        // Then, the layer will be loaded if necessary, adding it to the map (and show it after loading).
        // If it already on the map (but probably hidden), it will be shown
        var layer = this._getLayerForTime(time);
        if (this._currentLayer == null) {
            this._currentLayer = layer;
        }
        if (!this._map.hasLayer(layer)) {
            this._map.addLayer(layer);
        } else {
            this._showLayer(layer, time);
        }
    },

    setParams: function (params, noRedraw) {
        L.extend(this._baseLayer.options, params);
        this._baseLayer.setParams(params, noRedraw);
        if (this._currentLayer) {
            this._currentLayer.setParams(params, noRedraw);
        }
        return this;
    },

    _showLayer: function(layer, time) {
        if (this._currentLayer && this._currentLayer !== layer) {
            this._currentLayer.hide();
        }
        layer.show();
        if (this._currentLayer && this._currentLayer === layer) {
            return;
        }
        this._currentLayer = layer;
        console.log('Show layer ' + layer.wmsParams.layers + ' with time: ' + new Date(time).toISOString());
        // Cache management        
        var times = this._getLoadedTimes();
        var strTime = String(time);
        var index = times.indexOf(strTime);
        var remove = [];
        // remove times before current time
        if (this._timeCacheBackward > -1) {
            var objectsToRemove = index - this._timeCacheBackward;
            if (objectsToRemove > 0) {
                remove = times.splice(0, objectsToRemove);
                this._removeLayers(remove);
            }
        }
        if (this._timeCacheForward > -1) {
            index = times.indexOf(strTime);
            var objectsToRemove = times.length - index - this._timeCacheForward - 1;
            if (objectsToRemove > 0) {
                remove = times.splice(index + this._timeCacheForward + 1, objectsToRemove);
                this._removeLayers(remove);
            }
        }
    },

    _getLayerForTime: function(time) {
        if (time == 0 || time == this._defaultTime) {
            return this._baseLayer;
        }
        if (this._layers.hasOwnProperty(time)) {
            return this._layers[time];
        }
        var nearestTime = this._getNearestTime(time);
        if (this._layers.hasOwnProperty(nearestTime)) {
            return this._layers[nearestTime];
        }

        var wmsParams = this._baseLayer.options;
        wmsParams.time = new Date(nearestTime).toISOString();

        var newLayer = null;
        if (this._baseLayer instanceof L.TileLayer) {
            newLayer = L.tileLayer.wms(this._baseLayer.getURL(), wmsParams);
        } else {
            newLayer = L.nonTiledLayer.wms(this._baseLayer.getURL(), wmsParams);
        }
        this._layers[time] = newLayer;

        newLayer.on('load', (function(layer, time) {
            layer.setLoaded(true);
            if (this._timeDimension && time == this._timeDimension.getCurrentTime() && !this._timeDimension.isLoading()) {
                this._showLayer(layer, time);
            }
            // console.log('Loaded layer ' + layer.wmsParams.layers + ' with time: ' + new Date(time).toISOString());
            this.fire('timeload', {
                time: time
            });
        }).bind(this, newLayer, time));

        // Hack to hide the layer when added to the map.
        // It will be shown when timeload event is fired from the map (after all layers are loaded)
        newLayer.onAdd = (function(map) {
            Object.getPrototypeOf(this).onAdd.call(this, map);
            this.hide();
        }).bind(newLayer);
        return newLayer;
    },

    _getLoadedTimes: function() {
        var result = [];
        for (var prop in this._layers) {
            if (this._layers.hasOwnProperty(prop)) {
                result.push(prop);
            }
        }
        return result.sort(function(a, b) {
            return a - b;
        });
    },

    _removeLayers: function(times) {
        for (var i = 0, l = times.length; i < l; i++) {
            this._map.removeLayer(this._layers[times[i]]);
            delete this._layers[times[i]];
        }
    },

    setMinimumForwardCache: function(value) {
        if (value > this._timeCacheForward) {
            this._timeCacheForward = value;
        }
    },

    _requestTimeDimensionFromCapabilities: function() {
        if (this._capabilitiesRequested) {
            return;
        }
        this._capabilitiesRequested = true;
        var wms = this._baseLayer.getURL();
        var url = wms + "?service=WMS&version=" +
            this._wmsVersion + "&request=GetCapabilities";
        if (this._proxy) {
            url = this._proxy + '?url=' + encodeURIComponent(url);
        }
        $.get(url, (function(data) {
            this._defaultTime = Date.parse(this._getDefaultTimeFromCapabilities(data));
            this._setDefaultTime = this._setDefaultTime || (this._timeDimension && this._timeDimension.getAvailableTimes().length == 0);
            this.setAvailableTimes(this._parseTimeDimensionFromCapabilities(data));
            if (this._setDefaultTime && this._timeDimension) {
                this._timeDimension.setCurrentTime(this._defaultTime);                
            }
        }).bind(this));
    },

    _parseTimeDimensionFromCapabilities: function(xml) {
        var layers = $(xml).find('Layer[queryable="1"]');
        var layerName = this._baseLayer.wmsParams.layers;
        var layerNameElement = layers.find("Name").filter(function(index) {
            return $(this).text() === layerName;
        });
        var times = null;
        if (layerNameElement) {
            var layer = layerNameElement.parent();
            var dimension = layer.find("Dimension[name='time']");
            if (dimension && dimension.text().length) {
                times = dimension.text().trim();
            } else {
                var extent = layer.find("Extent[name='time']");
                if (extent && extent.text().length) {
                    times = extent.text().trim();
                }
            }
        }
        return times;
    },

    _getDefaultTimeFromCapabilities: function(xml) {
        var layers = $(xml).find('Layer[queryable="1"]');
        var layerName = this._baseLayer.wmsParams.layers;
        var layerNameElement = layers.find("Name").filter(function(index) {
            return $(this).text() === layerName;
        });
        var defaultTime = 0;
        if (layerNameElement) {
            var layer = layerNameElement.parent();
            var dimension = layer.find("Dimension[name='time']");
            if (dimension && dimension.attr("default")) {
                defaultTime = dimension.attr("default");
            } else {
                var extent = layer.find("Extent[name='time']");
                if (extent && extent.attr("default")) {
                    defaultTime = extent.attr("default");
                }
            }
        }
        return defaultTime;
    },

    setAvailableTimes: function(times) {
        this._availableTimes = L.TimeDimension.Util.parseTimesExpression(times);
        this._updateTimeDimensionAvailableTimes();
    },

    _updateTimeDimensionAvailableTimes: function(){
        if ((this._timeDimension && this._updateTimeDimension) ||
            (this._timeDimension && this._timeDimension.getAvailableTimes().length == 0)) {
            this._timeDimension.setAvailableTimes(this._availableTimes, this._updateTimeDimensionMode);
            if (this._defaultTime > 0) {
                this._timeDimension.setCurrentTime(this._defaultTime);
            }
        }
    },

    _getNearestTime: function(time) {
        if (this._layers.hasOwnProperty(time)) {
            return time;
        }
        if (this._availableTimes.length == 0) {
            return time;
        }
        var index = 0;
        var len = this._availableTimes.length;
        for (; index < len; index++) {
            if (time < this._availableTimes[index]) {
                break;
            }
        }
        // We've found the first index greater than the time. Get the previous
        if (index > 0) {
            index--;
        }
        if (time != this._availableTimes[index]) {
            console.log('Search layer time: ' + new Date(time).toISOString());
            console.log('Return layer time: ' + new Date(this._availableTimes[index]).toISOString());
        }
        return this._availableTimes[index];
    },

});

if (!L.NonTiledLayer) {
    L.NonTiledLayer = L.Class.extend({});
}

L.NonTiledLayer.include({
    _visible: true,
    _loaded: false,

    _originalUpdate: L.NonTiledLayer.prototype._update,

    _update: function() {
        if (!this._visible && this._loaded) {
            return;
        }
        this._originalUpdate();
    },

    setLoaded: function(loaded) {
        this._loaded = loaded;
    },

    isLoaded: function() {
        return this._loaded;
    },

    hide: function() {
        this._visible = false;
        this._div.style.display = 'none';
    },

    show: function() {
        this._visible = true;
        this._div.style.display = 'block';
    },

    getURL: function() {
        return this._wmsUrl;
    }

});

L.TileLayer.include({
    _visible: true,
    _loaded: false,

    _originalUpdate: L.TileLayer.prototype._update,

    _update: function() {
        if (!this._visible && this._loaded) {
            return;
        }
        this._originalUpdate();
    },

    setLoaded: function(loaded) {
        this._loaded = loaded;
    },

    isLoaded: function() {
        return this._loaded;
    },

    hide: function() {
        this._visible = false;
        if (this._container) {
            this._container.style.display = 'none';
        }
    },

    show: function() {
        this._visible = true;
        if (this._container) {
            this._container.style.display = 'block';
        }
    },

    getURL: function() {
        return this._url;
    }

});

L.timeDimension.layer.wms = function(layer, options) {
    return new L.TimeDimension.Layer.WMS(layer, options);
};
/*
 * L.TimeDimension.Layer.GeoJson:
 */

L.TimeDimension.Layer.GeoJson = L.TimeDimension.Layer.extend({

    initialize: function(layer, options) {
        L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);
        this._updateTimeDimension = this.options.updateTimeDimension || false;
        this._updateTimeDimensionMode = this.options.updateTimeDimensionMode || 'extremes'; // 'union', 'replace' or extremes
        this._duration = this.options.duration || null;
        this._addlastPoint = this.options.addlastPoint || false;
        this._defaultTime = 0;
        this._availableTimes = [];
        this._loaded = false;
        if (this._baseLayer.getLayers().length == 0) {
            this._baseLayer.on("ready", this._onReadyBaseLayer, this);
        } else {
            this._loaded = true;
            this._setAvailableTimes();
        }
    },

    onAdd: function(map) {
        L.TimeDimension.Layer.prototype.onAdd.call(this, map);
        if (this._loaded) {
            this._setAvailableTimes();
        }
    },

    eachLayer: function(method, context) {
        if (this._currentLayer) {
            method.call(context, this._currentLayer);
        }
        return L.TimeDimension.Layer.prototype.eachLayer.call(this, method, context);
    },      

    isReady: function(time) {
        return this._loaded;
    },

    _update: function() {
        if (!this._map)
            return;
        if (!this._loaded) {
            return;
        }

        var time = this._timeDimension.getCurrentTime();

        var maxTime = this._timeDimension.getCurrentTime(),
            minTime = 0;
        if (this._duration) {
            var date = new Date(maxTime);
            L.TimeDimension.Util.subtractTimeDuration(date, this._duration, true);
            minTime = date.getTime();
        }

        // new coordinates:
        var layer = L.geoJson(null, this._baseLayer.options);
        var layers = this._baseLayer.getLayers();
        for (var i = 0, l = layers.length; i < l; i++) {
            var feature = this._getFeatureBetweenDates(layers[i].feature, minTime, maxTime);
            if (feature) {
                layer.addData(feature);
                if (this._addlastPoint && feature.geometry.type == "LineString") {
                    if (feature.geometry.coordinates.length > 0) {
                        var properties = feature.properties;                        
                        properties.last = true;
                        layer.addData({
                            type: 'Feature',
                            properties: properties,
                            geometry: {
                                type: 'Point',
                                coordinates: feature.geometry.coordinates[feature.geometry.coordinates.length - 1]
                            }
                        });
                    }
                }
            }
        }

        if (this._currentLayer) {
            this._map.removeLayer(this._currentLayer);
        }
        if (layer.getLayers().length) {
            layer.addTo(this._map);
            this._currentLayer = layer;
        }
    },

    _setAvailableTimes: function() {
        var times = [];
        this._availableTimes = [];
        var layers = this._baseLayer.getLayers();
        for (var i = 0, l = layers.length; i < l; i++) {
            if (layers[i].feature) {
                times = L.TimeDimension.Util.union_arrays(
                    times,
                    this._getFeatureTimes(layers[i].feature)
                );
            }
        }
        // String dates to ms
        for (var i = 0, l = times.length; i < l; i++) {
            var time = times[i]
            if (typeof time == 'string' || time instanceof String) {
                time = Date.parse(time.trim());
            }
            this._availableTimes.push(time);
        }
        if (this._timeDimension && (this._updateTimeDimension || this._timeDimension.getAvailableTimes().length == 0)) {
            this._timeDimension.setAvailableTimes(this._availableTimes, this._updateTimeDimensionMode);
            this._timeDimension.setCurrentTime(this._availableTimes[0]);
        }
    },

    _getFeatureTimes: function(feature) {
        if (!feature.properties) {
            return [];
        }
        if (feature.properties.hasOwnProperty('coordTimes')) {
            return feature.properties.coordTimes;
        }
        if (feature.properties.hasOwnProperty('times')) {
            return feature.properties.times;
        }
        if (feature.properties.hasOwnProperty('linestringTimestamps')) {
            return feature.properties.linestringTimestamps;
        }
        if (feature.properties.hasOwnProperty('time')) {
            return [feature.properties.time];
        }
        return [];
    },

    _getFeatureBetweenDates: function(feature, minTime, maxTime) {
        var featureStringTimes = this._getFeatureTimes(feature);
        if (featureStringTimes.length == 0) {
            return feature;
        }
        var featureTimes = [];
        for (var i = 0, l = featureStringTimes.length; i < l; i++) {
            var time = featureStringTimes[i]
            if (typeof time == 'string' || time instanceof String) {
                time = Date.parse(time.trim());
            }
            featureTimes.push(time);
        }

        if (featureTimes[0] > maxTime || featureTimes[l - 1] < minTime) {
            return null;
        }
        var index_min = null,
            index_max = null,
            l = featureTimes.length;
        if (featureTimes[l - 1] > minTime) {
            for (var i = 0; i < l; i++) {
                if (index_min === null && featureTimes[i] > minTime) {
                    // set index_min the first time that current time is greater the minTime
                    index_min = i;
                }
                if (featureTimes[i] > maxTime) {
                    index_max = i;
                    break;
                }
            }
        }
        if (index_min === null) {
            index_min = 0;
        }
        if (index_max === null) {
            index_max = l;
        }
        var new_coordinates = [];
        if (feature.geometry.coordinates[0].length) {
            new_coordinates = feature.geometry.coordinates.slice(index_min, index_max);
        } else {
            new_coordinates = feature.geometry.coordinates;
        }
        return {
            type: 'Feature',
            properties: feature.properties,
            geometry: {
                type: feature.geometry.type,
                coordinates: new_coordinates
            }
        };
    },

    _onReadyBaseLayer: function() {
        this._loaded = true;
        this._setAvailableTimes();
        this._update();
    },

});

L.timeDimension.layer.geoJson = function(layer, options) {
    return new L.TimeDimension.Layer.GeoJson(layer, options);
};
/*
 * L.TimeDimension.Player 
 */

L.TimeDimension.Player = L.Class.extend({

    initialize: function(options, timeDimension) {
        L.setOptions(this, options);
        this._timeDimension = timeDimension;
        this._paused = false;
        this._transitionTime = this.options.transitionTime || 1000;
        this._buffer = this.options.buffer || 5;
        this._minBufferReady = this.options.minBufferReady || 1;
        this._waitingForBuffer = false;
        this._loop = this.options.loop || false;
        this._steps = 1;
        this._timeDimension.on('timeload', (function(data){            
            this.continue();  // free clock
        }).bind(this));        
    },


    _tick: function(self) {
        if (self._timeDimension.getCurrentTimeIndex() >= self._timeDimension.getAvailableTimes().length - 1) {
            if (!self._loop){
                clearInterval(self._intervalID);
                self._timeDimension.fire('timeanimationfinished');                
                return;
            }
        }
        if (self._paused) {
            return;
        }
        var numberNextTimesReady = 0;
        if (self._minBufferReady > 0){
            numberNextTimesReady = self._timeDimension.getNumberNextTimesReady(self._steps, self._buffer);            
            // If the player was waiting, check if all times are loaded
            if (self._waitingForBuffer){
                if (numberNextTimesReady < self._buffer){
                    console.log('Waiting until buffer is loaded. ' + numberNextTimesReady + ' of ' + self._buffer + ' loaded');
                    self._timeDimension.fire('timeanimationwaiting', {percent: numberNextTimesReady/self._buffer});
                    return;
                }else{
                    // all times loaded
                    console.log('Buffer is fully loaded!');
                    self._timeDimension.fire('timeanimationrunning');
                    self._waitingForBuffer = false;
                }
            } else{
                // check if player has to stop to wait and force to full all the buffer
                if (numberNextTimesReady < self._minBufferReady){
                    console.log('Force wait for load buffer. ' + numberNextTimesReady + ' of ' + self._buffer + ' loaded');
                    self._waitingForBuffer = true;
                    self._timeDimension.fire('timeanimationwaiting', {percent: numberNextTimesReady/self._buffer});
                    self._timeDimension.prepareNextTimes(self._steps, self._buffer);
                    return;
                }
            }
        }
        self.pause();
        self._timeDimension.nextTime(self._steps, self._loop);
        if (self._buffer > 0){
            self._timeDimension.prepareNextTimes(self._steps, self._buffer);
        }
    },

    start: function(numSteps) {
        if (this._intervalID) return;
        this._steps = numSteps || 1;
        this._waitingForBuffer = false;
        this._intervalID = window.setInterval(
            this._tick,
            this._transitionTime,
            this);
        this._tick(this);
    },

    stop: function() {
        if (!this._intervalID) return;
        clearInterval(this._intervalID);
        this._intervalID = null;        
    },

    pause: function() {
        this._paused = true;
    },

    continue: function() {
        this._paused = false;
    },

    getTransitionTime: function() {
        return this._transitionTime;
    },

    isPlaying: function() {
        return this._intervalID ? true : false;
    },

    isWaiting: function() {
        return this._waitingForBuffer;
    },

    setTransitionTime: function(transitionTime) {
        this._transitionTime = transitionTime;
        if (this._intervalID) {
            this.stop();
            this.start();
        }
    }    
});
/*
 * L.Control.TimeDimension: Leaflet control to manage a timeDimension
 */

L.Control.TimeDimension = L.Control.extend({
	options: {
		position: 'bottomleft',
		title: 'Time Control',
		backwardButton: true,
		forwardButton: true,
		playButton: true,
		displayDate: true,
		timeSlider: true,
		speedSlider: true,
		timeSteps: 1,
		autoPlay: false,
		playerOptions:{
			transitionTime: 1000			
		}
	},

	initialize: function (options) {
		L.Control.prototype.initialize.call(this, options);
		this._dateUTC = true;
		this._timeDimension = this.options.timeDimension || null;				
	},	

	onAdd: function(map) {
        if (!this._timeDimension && map.timeDimension){
            this._timeDimension = map.timeDimension;
        }
		var className = 'leaflet-control-timecontrol',
			container;

		container = L.DomUtil.create('div', 'leaflet-bar leaflet-bar-horizontal leaflet-bar-timecontrol');

		if (this.options.backwardButton)
			this._buttonBackward = this._createBackwardButton(className + " timecontrol-backward", container);
		if (this.options.playButton)
			this._buttonPlayPause = this._createPlayPauseButton(className + " timecontrol-play", container);
		if (this.options.forwardButton)
			this._buttonForward = this._createForwardButton(className + " timecontrol-forward", container);
		if (this.options.displayDate)
			this._displayDate = this._createDisplayDate(className + " timecontrol-date", container);
		if (this.options.timeSlider)
			this._slider = this._createSlider(className + " timecontrol-slider", container);
		if (this.options.speedSlider)
			this._sliderSpeed = this._createSliderSpeed(className + " timecontrol-slider timecontrol-speed", container);

		this._steps = this.options.timeSteps || 1;

		this._timeDimension.on('timeload', (function(data){						
        	this._update();
    	}).bind(this));

		this._timeDimension.on('timeloading', (function(data){
			if(data.time == this._timeDimension.getCurrentTime()){
				if (this._displayDate && this._displayDate.className.indexOf(' timecontrol-loading') == -1){
					this._displayDate.className += " timecontrol-loading";				
				}				
			}
    	}).bind(this));

    	this._timeDimension.on('timeanimationwaiting', (function(data){
			if (this._buttonPlayPause){
        		this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-play-loading';
        		this._buttonPlayPause.innerHTML = '<span>' + Math.floor(data.percent*100) + '%</span>';
			}

    	}).bind(this));

    	this._timeDimension.on('timeanimationrunning', (function(data){
			if (this._buttonPlayPause){
				this._buttonPlayPause.innerHTML = '';
				if (this._player.isPlaying()){			
					this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-pause';
				} else {
					this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-play';
				}
			}
    	}).bind(this));

		this._timeDimension.on('timeanimationfinished', (function(data){
			if (this._buttonPlayPause)
        		this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-play';
    	}).bind(this));

		this._timeDimension.on('availabletimeschanged', (function(data){
			if (this._slider)
        		this._slider.slider("option", "max", this._timeDimension.getAvailableTimes().length - 1);
    	}).bind(this));

		// Disable dragging and zoom when user's cursor enters the element
		container.addEventListener('mouseover', function() {
			map.dragging.disable();
			map.doubleClickZoom.disable();
			// map.off('mousemove'); 
		});

		// Re-enable dragging and zoom when user's cursor leaves the element
		container.addEventListener('mouseout', function() {
			map.dragging.enable();
			map.doubleClickZoom.enable();			
		});
		this._update();
		if (this.options.autoPlay && this._buttonPlayPause){
			this._buttonPlayPauseClicked();
		}
		return container;
	},

	_update: function () {
		if (!this._timeDimension){
			return;
		}
		var time = this._timeDimension.getCurrentTime();
		if (time > 0){
			var date = new Date(time);
			if (this._displayDate){
				this._displayDate.className = this._displayDate.className.replace(' timecontrol-loading', '');
				this._displayDate.innerHTML = this._getDisplayDateFormat(date);
			}
			if (this._slider){
	        	this._slider.slider( "value", this._timeDimension.getCurrentTimeIndex());			
			}
		}else{
			if (this._displayDate){
				this._displayDate.innerHTML = "Time not available";
			}
			if (this._slider){
	        	this._slider.slider( "value", 0);
	        }
		}
	},

	_createBackwardButton: function(className, container) {
		var link = L.DomUtil.create('a', className, container);
		link.href = '#';
		link.title = 'Backward';
		// link.innerHTML = '<span class="glyphicon glyphicon-backward"></span>';

		L.DomEvent
			.addListener(link, 'click', L.DomEvent.stopPropagation)
			.addListener(link, 'click', L.DomEvent.preventDefault)
			.addListener(link, 'click', this._buttonBackwardClicked, this);

		return link;
	},

	_createForwardButton: function(className, container) {
		var link = L.DomUtil.create('a', className, container);
		link.href = '#';
		link.title = 'Forward';
		// link.innerHTML = '<span class="glyphicon glyphicon-forward"></span>';

		L.DomEvent
			.addListener(link, 'click', L.DomEvent.stopPropagation)
			.addListener(link, 'click', L.DomEvent.preventDefault)
			.addListener(link, 'click', this._buttonForwardClicked, this);

		return link;
	},

	_createPlayPauseButton: function(className, container) {
		var link = L.DomUtil.create('a', className, container);
		link.href = '#';
		link.title = 'Play';
		// link.innerHTML = '<span class="glyphicon glyphicon-play"></span>';

		L.DomEvent
			.addListener(link, 'click', L.DomEvent.stopPropagation)
			.addListener(link, 'click', L.DomEvent.preventDefault)
			.addListener(link, 'click', this._buttonPlayPauseClicked, this);

		return link;
	},

	_createDisplayDate: function(className, container) {
		var link = L.DomUtil.create('a', className, container);		
		link.href = '#';
		link.title = 'UTC Time';
		L.DomEvent
			.addListener(link, 'click', L.DomEvent.stopPropagation)
			.addListener(link, 'click', L.DomEvent.preventDefault)
			.addListener(link, 'click', this._toggleDateUTC, this);

		return link;
	},

	_createSlider: function(className, container) {
		var _slider = L.DomUtil.create('a', className, container);
		_slider.href = '#';
		L.DomEvent
			.addListener(_slider, 'click', L.DomEvent.stopPropagation)
			.addListener(_slider, 'click', L.DomEvent.preventDefault);

		_slider.innerHTML = '<div class="slider"></div>';
		var slider = $(_slider).find('.slider');
		var max = this._timeDimension.getAvailableTimes().length - 1;
		slider.slider({
      		min: 0,
      		max: max,
      		range: "min",
      		stop: (function( event, ui ) {
        		this._sliderValueChanged(ui.value);
        	}).bind(this),
        	slide: (function( event, ui ) {        		
				var date = new Date(this._timeDimension.getAvailableTimes()[ui.value]);
				this._displayDate.innerHTML = this._getDisplayDateFormat(date);
        	}).bind(this),

      	});
		return slider;
	},

	_createSliderSpeed: function(className, container) {
		var _slider = L.DomUtil.create('a', className, container);
		_slider.href = '#';
		L.DomEvent
			.addListener(_slider, 'click', L.DomEvent.stopPropagation)
			.addListener(_slider, 'click', L.DomEvent.preventDefault);

		var currentSpeed = 1;
		if (this._player){
			currentSpeed = 1000/this._playerOptions.getTransitionTime();
		}else{
			currentSpeed = Math.round(10000/(this.options.playerOptions.transitionTime||1000))/10;
		}
		_slider.innerHTML = '<span class="speed">' +  currentSpeed  + 'fps</span><div class="slider"></div>';
		var slider = $(_slider).find('.slider');		
		slider.slider({
      		min: 0.1,
      		max: 10,
      		value: currentSpeed,
      		step: 0.1,
      		range: "min",
      		stop: (function(sliderContainer, event, ui ) {
        		var speed = $(sliderContainer).find('.speed')[0];
				speed.innerHTML = ui.value + "fps";      			
        		this._sliderSpeedValueChanged(ui.value);
        	}).bind(this, _slider),
        	slide: (function(sliderContainer, event, ui ) {        		
        		var speed = $(sliderContainer).find('.speed')[0];
				speed.innerHTML = ui.value + "fps";
        	}).bind(this, _slider),

      	});
		return slider;
	},

	_buttonBackwardClicked: function(event) {
		this._timeDimension.previousTime(this._steps);
	},

	_buttonForwardClicked: function(event) {
		this._timeDimension.nextTime(this._steps);
	},

	_buttonPlayPauseClicked: function(event) {
		if (!this._player){
		    this._player = new L.TimeDimension.Player(this.options.playerOptions, this._timeDimension);
		}
		if (this._player.isPlaying()){
			if (this._player.isWaiting()){
				// force start
				this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-pause';
				this._buttonPlayPause.innerHTML = '';
				this._player.stop();
				this._player.start(this._steps);

			} else {
				this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-play';
				this._player.stop();
				this._buttonPlayPause.innerHTML = '';				
			}
		} else {
			this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-pause';
			this._player.start(this._steps);
		}
	},	

	_sliderValueChanged: function(newValue) {
		this._timeDimension.setCurrentTimeIndex(newValue);
	},

	_sliderSpeedValueChanged: function(newValue){
		if (this._player){			
		    this._player.setTransitionTime(1000/newValue);
		}
	},

	_toggleDateUTC: function(event){
		if (this._dateUTC){
			this._displayDate.title = 'Local Time';
		}else{
			this._displayDate.title = 'UTC Time';
		}
		this._dateUTC = !this._dateUTC;
		this._update();
	},

	_getDisplayDateFormat: function(date){
		return this._dateUTC ? date.toISOString() : date.toLocaleString();
	}

});

L.Map.addInitHook(function() {
	if (this.options.timeDimensionControl) {
		this.timeDimensionControl = L.control.timeDimension(this.options.timeDimensionControlOptions || {});
		this.addControl(this.timeDimensionControl);
	}
});

L.control.timeDimension = function(options) {
	return new L.Control.TimeDimension(options);
};
