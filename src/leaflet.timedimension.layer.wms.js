/*
 * L.TimeDimension.Layer.WMS: wms Layer associated to a TimeDimension
 */

L.TimeDimension.Layer.WMS = L.TimeDimension.Layer.extend({

    /**
     * Timedimension wms Layer initializer
     * @param {Layer} layer default leaflet layer
     * @param {object} options layer options 
     * @returns timedimension wms layer
     */
    initialize: function(layer, options) {
        L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);
        this._timeCacheBackward = this.options.cacheBackward || this.options.cache || 0;
        this._timeCacheForward = this.options.cacheForward || this.options.cache || 0;
        this._wmsVersion = this.options.wmsVersion || this.options.version || layer.options.version || "1.1.1";
        this._getCapabilitiesParams = this.options.getCapabilitiesParams || {};
        this._getCapabilitiesAlternateUrl = this.options.getCapabilitiesUrl || null;
        this._getCapabilitiesAlternateLayerName = this.options.getCapabilitiesLayerName || null;
        this._proxy = this.options.proxy || null;
        this._updateTimeDimension = this.options.updateTimeDimension || false;
        this._setDefaultTime = this.options.setDefaultTime || false;
        this._updateTimeDimensionMode = this.options.updateTimeDimensionMode || 'intersect'; // 'union' or 'replace'
        this._period = this.options.period || null;
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

    /**
     * Get layer events
     * @returns layer events
     */
    getEvents: function() {
        var clearCache = L.bind(this._unvalidateCache, this);
        return {
            moveend: clearCache,
            zoomend: clearCache
        }
    },

    /**
     * Method called when searching each layer
     * @param {function} method 
     * @param {object} context 
     * @returns superclass eachLayer return
     */
    eachLayer: function(method, context) {
        for (var prop in this._layers) {
            if (this._layers.hasOwnProperty(prop)) {
                method.call(context, this._layers[prop]);
            }
        }
        return L.TimeDimension.Layer.prototype.eachLayer.call(this, method, context);
    },

    /**
     * Method called when loading a new time
     * @param {object} ev 
     * @returns Empty return
     */
    _onNewTimeLoading: function(ev) {
        // console.log('Layer._onNewTimeLoading: ' + this._baseLayer.wmsParams.layers + ' with time: ' + new Date(ev.time).toISOString());
        var layer = this._getLayerForTime(ev.time);
        if (!this._map.hasLayer(layer)) {
            this._map.addLayer(layer);
            // console.log('Layer._onNewTimeLoading: layer added to map');
        }
    },

    /**
     * Method called to check if the layer is ready
     * @param {number} time 
     * @returns check if the layer is loaded
     */
    isReady: function(time) {
        var layer = this._getLayerForTime(time);
        if (this.options.bounds && this._map)
            if (!this._map.getBounds().contains(this.options.bounds))
                return true;
        return layer.isLoaded();
    },

    /**
     * Observable like method called when adding this layer to a map
     * @param {L.Map} map Leaflet map
     */
    onAdd: function(map) {
        L.TimeDimension.Layer.prototype.onAdd.call(this, map);
        if (this._availableTimes.length == 0) {
            this._requestTimeDimensionFromCapabilities();
        } else {
            this._updateTimeDimensionAvailableTimes();
        }
    },

    /**
     * Method called when updating the layer
     */
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

    /**
     * Set a new opacity
     * @param {number} opacity new opacity
     */
    setOpacity: function(opacity) {
        L.TimeDimension.Layer.prototype.setOpacity.apply(this, arguments);
        // apply to all preloaded caches
        for (var prop in this._layers) {
            if (this._layers.hasOwnProperty(prop) && this._layers[prop].setOpacity) {
                this._layers[prop].setOpacity(opacity);
            }
        }
    },

    /**
     * Sez a new Z index
     * @param {number} zIndex new z index 
     */
    setZIndex: function(zIndex){
        L.TimeDimension.Layer.prototype.setZIndex.apply(this, arguments);
        // apply to all preloaded caches
        for (var prop in this._layers) {
            if (this._layers.hasOwnProperty(prop) && this._layers[prop].setZIndex) {
                this._layers[prop].setZIndex(zIndex);
            }
        }
    },

    /**
     * Set params to the layer
     * @param {object} params new parameters 
     * @param {*} noRedraw 
     * @returns self return
     */
    setParams: function(params, noRedraw) {
        L.extend(this._baseLayer.options, params);
        if (this._baseLayer.setParams) {
            this._baseLayer.setParams(params, noRedraw);
        }
        for (var prop in this._layers) {
            if (this._layers.hasOwnProperty(prop) && this._layers[prop].setParams) {
                this._layers[prop].setLoaded(false); // mark it as unloaded
                this._layers[prop].setParams(params, noRedraw);
            }
        }
        return this;
    },

    /**
     * Method called to unvalidate the layer cache
     */
    _unvalidateCache: function() {
        var time = this._timeDimension.getCurrentTime();
        for (var prop in this._layers) {
            if (time != prop && this._layers.hasOwnProperty(prop)) {
                this._layers[prop].setLoaded(false); // mark it as unloaded
                this._layers[prop].redraw();
            }
        }
    },

    /**
     * Method called to evict cached times
     * @param {number} keepforward keep the 'n' next times
     * @param {number} keepbackward keep the 'n' previous times
     */
    _evictCachedTimes: function(keepforward, keepbackward) {
        // Cache management
        var times = this._getLoadedTimes();
        var strTime = String(this._currentTime);
        var index = times.indexOf(strTime);
        var remove = [];
        // remove times before current time
        if (keepbackward > -1) {
            var objectsToRemove = index - keepbackward;
            if (objectsToRemove > 0) {
                remove = times.splice(0, objectsToRemove);
                this._removeLayers(remove);
            }
        }
        if (keepforward > -1) {
            index = times.indexOf(strTime);
            var objectsToRemove = times.length - index - keepforward - 1;
            if (objectsToRemove > 0) {
                remove = times.splice(index + keepforward + 1, objectsToRemove);
                this._removeLayers(remove);
            }
        }
    },

    /**
     * Method called to show the layer
     * @param {Timedimension.Layer.WMS} layer timedimension wms layer
     * @param {number} time time of the current layer
     * @returns layer to be shown
     */
    _showLayer: function(layer, time) {
        if (this._currentLayer && this._currentLayer !== layer) {
            this._currentLayer.hide();
        }
        layer.show();
        if (this._currentLayer && this._currentLayer === layer) {
            return;
        }
        this._currentLayer = layer;
        this._currentTime = time;
        console.log('Show layer ' + layer.wmsParams.layers + ' with time: ' + new Date(time).toISOString());

        this._evictCachedTimes(this._timeCacheForward, this._timeCacheBackward);
    },

    /**
     * Get wms layer for specific time
     * @param {number} time time of the layer to be shown 
     * @returns leaflet wms layer
     */
    _getLayerForTime: function(time) {
        if (time == this._defaultTime || time == null) {
            return this._baseLayer;
        }
        if (this._layers.hasOwnProperty(time)) {
            return this._layers[time];
        }
        var nearestTime = this._getNearestTime(time);
        if (this._layers.hasOwnProperty(nearestTime)) {
            return this._layers[nearestTime];
        }

        var newLayer = this._createLayerForTime(nearestTime);

        this._layers[time] = newLayer;

        newLayer.on('load', (function(layer, time) {
            layer.setLoaded(true);
            // this time entry should exists inside _layers
            // but it might be deleted by cache management
            if (!this._layers[time]) {
                this._layers[time] = layer;
            }
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

    /**
     * Create a layer for a specific time
     * @param {number} time time of the layer
     * @returns leaflet wms layer
     */
    _createLayerForTime:function(time){
        var wmsParams = this._baseLayer.options;
        wmsParams.time = new Date(time).toISOString();
        return new this._baseLayer.constructor(this._baseLayer.getURL(), wmsParams);
    },

    /**
     * Get loaded times
     * @returns array of loaded times
     */
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

    /**
     * Remove layers
     * @param {number[]} times array of times to be removed
     */
    _removeLayers: function(times) {
        for (var i = 0, l = times.length; i < l; i++) {
            if (this._map)
                this._map.removeLayer(this._layers[times[i]]);
            delete this._layers[times[i]];
        }
    },

    /**
     * Set minimum foward cache
     * @param {number} value new minimum cache time
     */
    setMinimumForwardCache: function(value) {
        if (value > this._timeCacheForward) {
            this._timeCacheForward = value;
        }
    },

    /**
     * Request timedimensions from capabilities
     * @returns Empty return
     */
    _requestTimeDimensionFromCapabilities: function() {
        if (this._capabilitiesRequested) {
            return;
        }
        this._capabilitiesRequested = true;
        var url = this._getCapabilitiesUrl();
        if (this._proxy) {
            url = this._proxy + '?url=' + encodeURIComponent(url);
        }
        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", (function(xhr) {
            var data = xhr.currentTarget.responseXML;
            if (data !== null){
                this._defaultTime = Date.parse(this._getDefaultTimeFromCapabilities(data));
                this._setDefaultTime = this._setDefaultTime || (this._timeDimension && this._timeDimension.getAvailableTimes().length == 0);
                this.setAvailableTimes(this._parseTimeDimensionFromCapabilities(data));
                if (this._setDefaultTime && this._timeDimension) {
                    this._timeDimension.setCurrentTime(this._defaultTime);
                }
            }
        }).bind(this));
        oReq.overrideMimeType('application/xml');
        oReq.open("GET", url);
        oReq.send();
    },

    /**
     * Get capabilities url
     * @returns capabilities url string
     */
    _getCapabilitiesUrl: function() {
        var url = this._baseLayer.getURL();
        if (this._getCapabilitiesAlternateUrl)
            url = this._getCapabilitiesAlternateUrl;
        var params = L.extend({}, this._getCapabilitiesParams, {
          'request': 'GetCapabilities',
          'service': 'WMS',
          'version': this._wmsVersion
        });
        url = url + L.Util.getParamString(params, url, params.uppercase);
        return url;
    },

    /**
     * Parse time dimensions from capabilities
     * @param {object} xml Xml object
     * @returns available times
     */
    _parseTimeDimensionFromCapabilities: function(xml) {
        var layers = xml.querySelectorAll('Layer[queryable="1"]');
        var layerName = this._baseLayer.wmsParams.layers;
        var layer = null;
        var times = null;

        layers.forEach(function(current) {
            if (current.querySelector("Name").innerHTML === layerName) {
                layer = current;
            }
        })
        if (layer) {
            times = this._getTimesFromLayerCapabilities(layer);
            if (!times) {
                times = this._getTimesFromLayerCapabilities(layer.parentNode);
            }
        }

        return times;
    },

    /**
     * Get times from layer capabilities
     * @param {object} layer Xml for the layer
     * @returns times availables from the current layer
     */
    _getTimesFromLayerCapabilities: function(layer) {
        var times = null;
        var nodes = layer.children;
        for (var i=0, l=nodes.length; i<l; i++){
            if (nodes[i].nodeName !== 'Extent' && nodes[i].nodeName !== 'Dimension') continue;
            if (nodes[i].getAttribute('name') !== 'time') continue;
            if (!nodes[i].textContent.length) continue;
            times = nodes[i].textContent.trim();
            break;
        }
        return times;
    },

    /**
     * Get default time from capabilities
     * @param {object} xml Xml for the layer
     * @returns default time
     */
    _getDefaultTimeFromCapabilities: function(xml) {
        var layers = xml.querySelectorAll('Layer[queryable="1"]');
        var layerName = this._baseLayer.wmsParams.layers;
        var layer = null;

        layers.forEach(function(current) {
            if (current.querySelector("Name").innerHTML === layerName) {
                layer = current;
            }
        })

        var defaultTime = 0;
        if (layer) {
            defaultTime = this._getDefaultTimeFromLayerCapabilities(layer);
            if (defaultTime == 0) {
                defaultTime = this._getDefaultTimeFromLayerCapabilities(layer.parentNode);
            }
        }
        return defaultTime;
    },

    /**
     * Get default time from layer capabilities
     * @param {object} layer Xml for the layer
     * @returns default time
     */
    _getDefaultTimeFromLayerCapabilities: function(layer) {
        var defaultTime = 0;
        var nodes = layer.children;
        for (var i=0, l=nodes.length; i<l; i++) {
            if (nodes[i].nodeName !== 'Extent' && nodes[i].nodeName !== 'Dimension') continue;
            if (nodes[i].getAttribute('name') !== 'time') continue;
            if (!nodes[i].attributes.default) continue;
            if (!nodes[i].attributes.default.textContent.length) continue;
            defaultTime = nodes[i].attributes.default.textContent.trim();
            break;
        }
        return defaultTime;
    },

    /**
     * Set layer available times
     * @param {number[]} times array of times
     */
    setAvailableTimes: function(times) {
        this._availableTimes = L.TimeDimension.Util.parseTimesExpression(times, this._period);
        this._updateTimeDimensionAvailableTimes();
    },

    /**
     * Method called to update available times on timedimension
     */
    _updateTimeDimensionAvailableTimes: function() {
        if ((this._timeDimension && this._updateTimeDimension) ||
            (this._timeDimension && this._timeDimension.getAvailableTimes().length == 0)) {
            this._timeDimension.setAvailableTimes(this._availableTimes, this._updateTimeDimensionMode);
            if (this._setDefaultTime && this._defaultTime > 0) {
                this._timeDimension.setCurrentTime(this._defaultTime);
            }
        }
    },

    /**
     * Get nearest time
     * @param {number[]} time initial search point 
     * @returns nearest time
     */
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
    L.NonTiledLayer = (L.Layer || L.Class).extend({});
}

L.NonTiledLayer.include({
    _visible: true,
    _loaded: false,

    _originalUpdate: L.NonTiledLayer.prototype._update,
    _originalOnRemove: L.NonTiledLayer.prototype.onRemove,

    /**
     * Method called to update this tilelayer
     * @returns Empty return
     */
    _update: function() {
        if (!this._visible && this._loaded) {
            return;
        }
        this._originalUpdate();
    },

    /**
     * Method called when removing this layer to a map
     * @param {L.Map} map Leaflet map
     */
    onRemove: function(map) {
        this._loaded = false;
        this._originalOnRemove(map);
    },

    /**
     * Set flag if tilelayer is loaded
     * @param {boolean} loaded flag to check if the tilelayer is loaded
     */
    setLoaded: function(loaded) {
        this._loaded = loaded;
    },

    /**
     * Check if the tilelayer is loaded
     * @returns flag to check if the tilelayer is loaded
     */
    isLoaded: function() {
        return this._loaded;
    },

    /**
     * Hide tilelayer
     */
    hide: function() {
        this._visible = false;
        this._div.style.display = 'none';
    },

    /**
     * Show tilelayer
     */
    show: function() {
        this._visible = true;
        this._div.style.display = 'block';
    },

    /**
     * Get tilelayer url
     * @returns tilelayer url as string
     */
    getURL: function() {
        return this._wmsUrl;
    }

});

L.TileLayer.include({
    _visible: true,
    _loaded: false,

    _originalUpdate: L.TileLayer.prototype._update,

    /**
     * Method called to update the tilelayer
     * @returns Empty return
     */
    _update: function() {
        if (!this._visible && this._loaded) {
            return;
        }
        this._originalUpdate();
    },

    /**
     * Set if the tilemap is loaded
     * @param {boolean} loaded flag to check if the tilemap is loaded 
     */
    setLoaded: function(loaded) {
        this._loaded = loaded;
    },

    /**
     * Check if the tilemap is loaded
     * @returns flag to check if the tilemap is loaded
     */
    isLoaded: function() {
        return this._loaded;
    },

    /**
     * Hide tilemap
     */
    hide: function() {
        this._visible = false;
        if (this._container) {
            this._container.style.display = 'none';
        }
    },

    /**
     * Show tilemap
     */
    show: function() {
        this._visible = true;
        if (this._container) {
            this._container.style.display = 'block';
        }
    },

    /**
     * Get tilemap url
     * @returns tilemap url as string
     */
    getURL: function() {
        return this._url;
    }

});

/**
 * Timedimension "Wmls Layer" initializer
 * @param {Layer} layer default leaflet layer
 * @param {object} options layer options 
 * @returns new instance of timedimension wms layer
 */
L.timeDimension.layer.wms = function(layer, options) {
    return new L.TimeDimension.Layer.WMS(layer, options);
};
