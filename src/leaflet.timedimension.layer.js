/*
 * L.TimeDimension.Layer:  an abstract Layer that can be managed/synchronized with a TimeDimension.
 * The constructor recieves a layer (of any kind) and options.
 * Any children class should implement `_onNewTimeLoading`, `isReady` and `_update` functions
 * to react to time changes.
 */

L.TimeDimension.Layer = (L.Layer || L.Class).extend({

    includes: (L.Evented || L.Mixin.Events),
    options: {
        opacity: 1,
        zIndex: 1
    },

    /**
     * Timedimension "Layer" initializer
     * @param {Layer} layer default leaflet layer
     * @param {object} options layer options 
     * @returns timedimension layer
     */
    initialize: function(layer, options) {
        L.setOptions(this, options || {});
        this._map = null;
        this._baseLayer = layer;
        this._currentLayer = null;
        this._timeDimension = this.options.timeDimension || null;
    },

    /**
     * Observable like method called when adding this layer to a map
     * @param {L.Map} map Leaflet map
     */
    addTo: function(map) {
        map.addLayer(this);
        return this;
    },

    /**
     * Method called when adding this layer to a map
     * @param {L.Map} map Leaflet map
     */
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

    /**
     * Method called when removing this layer to a map
     * @param {L.Map} map Leaflet map
     */
    onRemove: function(map) {
        this._timeDimension.unregisterSyncedLayer(this);
        this._timeDimension.off("timeloading", this._onNewTimeLoading, this);
        this._timeDimension.off("timeload", this._update, this);
        this.eachLayer(map.removeLayer, map);
        this._map = null;
    },

    /**
     * Method called when searching each layer
     * @param {function} method 
     * @param {object} context 
     * @returns self return
     */
    eachLayer: function(method, context) {
        method.call(context, this._baseLayer);
        return this;
    },

    /**
     * Sez a new Z index
     * @param {number} zIndex new z index 
     * @returns self return
     */
    setZIndex: function(zIndex) {
        this.options.zIndex = zIndex;
        if (this._baseLayer.setZIndex) {
            this._baseLayer.setZIndex(zIndex);
        }
        if (this._currentLayer && this._currentLayer.setZIndex) {
            this._currentLayer.setZIndex(zIndex);
        }
        return this;
    },

    /**
     * Set a new opacity
     * @param {number} opacity new opacity
     * @returns self return
     */
    setOpacity: function(opacity) {
        this.options.opacity = opacity;
        if (this._baseLayer.setOpacity) {
            this._baseLayer.setOpacity(opacity);
        }
        if (this._currentLayer && this._currentLayer.setOpacity) {
            this._currentLayer.setOpacity(opacity);
        }
        return this;
    },

    /**
     * Method called to bring the layer to the back
     */
    bringToBack: function() {
        if (!this._currentLayer) {
            return;
        }
        this._currentLayer.bringToBack();
        return this;
    },

    /**
     * Method called to bring the layer to the front
     */
    bringToFront: function() {
        if (!this._currentLayer) {
            return;
        }
        this._currentLayer.bringToFront();
        return this;
    },

    /**
     * Method called when loading a new time
     * @param {object} ev 
     * @returns Empty return
     */
    _onNewTimeLoading: function(ev) {
        // to be implemented for each type of layer
        this.fire('timeload', {
            time: ev.time
        });
        return;
    },

    /**
     * Method called to check if the layer is ready
     * @param {number} time 
     * @returns Always true
     */
    isReady: function(time) {
        // to be implemented for each type of layer
        return true;
    },

    /**
     * Method called when updating the layer
     * @returns Always true
     */
    _update: function() {
        // to be implemented for each type of layer
        return true;
    },

    /**
     * Get base layer
     * @returns Leaflet base layer
     */
    getBaseLayer: function() {
        return this._baseLayer;
    },

    /**
     * Get layer bounds
     * @returns layer bounds
     */
    getBounds: function() {
        var bounds = new L.LatLngBounds();
        if (this._currentLayer) {
            bounds.extend(this._currentLayer.getBounds ? this._currentLayer.getBounds() : this._currentLayer.getLatLng());
        }
        return bounds;
    }

});

/**
 * Timedimension "Layer" initializer
 * @param {Layer} layer default leaflet layer
 * @param {object} options layer options 
 * @returns new instance of timedimension layer
 */
L.timeDimension.layer = function(layer, options) {
    return new L.TimeDimension.Layer(layer, options);
};
