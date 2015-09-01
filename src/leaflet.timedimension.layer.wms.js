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

    setParams: function(params, noRedraw) {
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
            times = this._getTimesFromLayerCapabilities(layer);
            if (!times) {
                times = this._getTimesFromLayerCapabilities(layer.parent());
            }
        }
        return times;
    },

    _getTimesFromLayerCapabilities: function(layer) {
        var times = null;
        var dimension = layer.find("Dimension[name='time']");
        if (dimension && dimension.length && dimension[0].textContent.length) {
            times = dimension[0].textContent.trim();
        } else {
            var extent = layer.find("Extent[name='time']");
            if (extent && extent.length && extent[0].textContent.length) {
                times = extent[0].textContent.trim();
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
            defaultTime = this._getDefaultTimeFromLayerCapabilities(layer);
            if (defaultTime == 0) {
                defaultTime = this._getDefaultTimeFromLayerCapabilities(layer.parent());
            }
        }
        return defaultTime;
    },

    _getDefaultTimeFromLayerCapabilities: function(layer) {
        var defaultTime = 0;
        var dimension = layer.find("Dimension[name='time']");
        if (dimension && dimension.attr("default")) {
            defaultTime = dimension.attr("default");
        } else {
            var extent = layer.find("Extent[name='time']");
            if (extent && extent.attr("default")) {
                defaultTime = extent.attr("default");
            }
        }
        return defaultTime;
    },


    setAvailableTimes: function(times) {
        this._availableTimes = L.TimeDimension.Util.parseTimesExpression(times);
        this._updateTimeDimensionAvailableTimes();
    },

    _updateTimeDimensionAvailableTimes: function() {
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