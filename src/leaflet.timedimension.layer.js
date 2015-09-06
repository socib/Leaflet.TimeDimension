/*
 * L.TimeDimension.Layer:  an abstract Layer that can be managed/synchronized with a TimeDimension. 
 * The constructor recieves a layer (of any kind) and options.
 * Any children class should implement `_onNewTimeLoading`, `isReady` and `_update` functions 
 * to react to time changes.
 */

L.TimeDimension.Layer = (L.Layer || L.Class).extend({

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