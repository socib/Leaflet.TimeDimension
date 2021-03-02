/*
 * L.TimeDimension.Layer.VelocityLayer: TimeDimension for VelocityLayer
 */
Date.prototype.format = function(mask, utc) {
    return dateFormat(this, mask, utc);
};

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this === null) {
      throw new TypeError("Array.prototype.find called on null or undefined");
    }
    if (typeof predicate !== "function") {
      throw new TypeError("predicate must be a function");
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

L.CustomVelocityLayer = L.VelocityLayer.extend({
    options: {
        displayValues: true,
        displayOptions: {
            velocityType: 'GBR Water',
            displayPosition: 'bottomleft',
            displayEmptyString: 'No currents data'
        },
        data: [],
        maxVelocity: 0.3,
        velocityScale: 0.1 // arbitrary default 0.005
    },

    initialize: function(options) {
        L.setOptions(this, options);
        L.VelocityLayer.prototype.initialize.call(this, this.options);
    }
});

L.customVelocityLayer = function(options) {
  return new L.CustomVelocityLayer(options);
};

L.TimeDimension.Layer.VelocityLayer = L.TimeDimension.Layer.extend({

    initialize: function(options) {
        var layer = new L.customVelocityLayer(
          options.velocityLayerOptions || {}
        );
        L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);
        this._currentLoadedTime = 0;
        this._currentTimeData = [];
        this._baseURL = this.options.baseURL || null;
    },

    onAdd: function(map) {
        L.TimeDimension.Layer.prototype.onAdd.call(this, map);
        map.addLayer(this._baseLayer);
        if (this._timeDimension) {
            this._getDataForTime(this._timeDimension.getCurrentTime());
        }
    },

    _onNewTimeLoading: function(ev) {
        this._getDataForTime(ev.time);
        return;
    },

    isReady: function(time) {
        return (this._currentLoadedTime == time);
    },

    _update: function() {
        if (this._currentTimeData && this._currentTimeData.length > 0) {
            map.addLayer(this._baseLayer);
            this._baseLayer.setData(this._currentTimeData);
        } else {
            map.removeLayer(this._baseLayer);
        }

        return true;
    },

    _getDataForTime: function(time) {
        if (!this._baseURL || !this._map) {
            return;
        }
        var url = this._constructQuery(time);
        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", (function(xhr) {
            var response = xhr.currentTarget.response;
            var data = JSON.parse(response);
            delete this._currentTimeData;
            this._currentTimeData = this._processLoadedData(data);
            this._currentLoadedTime = time;
            if (this._timeDimension && time == this._timeDimension.getCurrentTime() && !this._timeDimension.isLoading()) {
                this._update();
            }
            this.fire('timeload', {
                time: time
            });
        }).bind(this));

        oReq.open("GET", url);
        oReq.send();
    },

    _constructQuery: function(time) {
        var time = new Date(time);
        var timeParams = "&time=" +
            time.format('isoDateTime');
        var url = this._baseURL + timeParams;
        return url;
    },

    _processLoadedData: function(data) {
        return data;
    }
});

L.timeDimension.layer.velocityLayer = function(options) {
    return new L.TimeDimension.Layer.VelocityLayer(options);
};
