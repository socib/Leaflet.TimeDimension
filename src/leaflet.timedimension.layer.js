/*
 * L.TimeDimension.Layer:  an abstract Layer that can be managed/synchronized with a TimeDimension.
 * The constructor recieves a layer (of any kind) and options.
 * Any children class should implement `_onNewTimeLoading`, `isReady` and `_update` functions
 * to react to time changes.
 */

L.TimeDimension.Layer = (L.Layer || L.Class).extend({

    includes: L.Mixin.Events,
    options: {
        opacity: 1,
        zIndex: 1
    },

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
        this.options.zIndex = zIndex;
        if (this._baseLayer.setZIndex) {
            this._baseLayer.setZIndex(zIndex);
        }
        if (this._currentLayer && this._currentLayer.setZIndex) {
            this._currentLayer.setZIndex(zIndex);
        }
        return this;
    },

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

    bringToBack: function() {
        if (!this._currentLayer) {
            return;
        }
        this._currentLayer.bringToBack();
        return this;
    },

    bringToFront: function() {
        if (!this._currentLayer) {
            return;
        }
        this._currentLayer.bringToFront();
        return this;
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

    getBaseLayer: function() {
        return this._baseLayer;
    },

    getBounds: function() {
        var bounds = new L.LatLngBounds();
        if (this._currentLayer) {
            bounds.extend(this._currentLayer.getBounds ? this._currentLayer.getBounds() : this._currentLayer.getLatLng());
        }
        return bounds;
    }

});

L.timeDimension.layer = function(layer, options) {
    return new L.TimeDimension.Layer(layer, options);
};