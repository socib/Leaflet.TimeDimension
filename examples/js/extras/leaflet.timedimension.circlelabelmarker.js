/*
 * L.TimeDimension.CircleLabelMarker: circleMarker + divIcon containing 
 * the numerical value of the baseLayer (from a THREDDS server).
 */

L.TimeDimension.Layer.CircleLabelMarker = L.TimeDimension.Layer.extend({

    initialize: function(layer, options) {
        L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);
        this._serieId = this.options.serieId;
        this._dataLayer = this.options.dataLayer;
        this._labelMarker = null;
        this._position = layer.getLatLng();
        this._proxy = this.options.proxy || null;
        this._data = [];
    },

    addTo: function(map) {
        map.addLayer(this);
        map.addLayer(this._baseLayer);
        var time = this._timeDimension.getCurrentTime();
        if (!this._existsValueForTime(time)){
            this._loadDataForTime(time, (function() {
                this._update();
            }).bind(this));
        }else{
            this._update();            
        }

        return this;
    },

    eachLayer: function(method, context) {
        if (this._labelMarker) {
            method.call(context, this._labelMarker);
        }
        return L.TimeDimension.Layer.prototype.eachLayer.call(this, method, context);
    },

    _onNewTimeLoading: function(ev) {
        if (this._existsValueForTime(ev.time)) {
            this.fire('timeload', {
                time: ev.time
            });
        } else {
            this._loadDataForTime(ev.time, (function() {
                this.fire('timeload', {
                    time: ev.time
                });
            }).bind(this));
        }
        return;
    },

    isReady: function(time) {        
        return this._existsValueForTime(time);
    },

    _update: function() {
        if (!this._map)
            return;
        var time = this._timeDimension.getCurrentTime();
        var value = this._getValueForTime(time);
        if (value && !isNaN(value)) {
            value = value.toFixed(2);
        }else{
            value = '';
        }
        if (this._labelMarker) {
            this._map.removeLayer(this._labelMarker);
            delete this._labelMarker;
        }
        var icon = L.divIcon({
            className: 'marker-label-icon',
            html: value,
            iconSize: [40, 15],
            iconAnchor: [-8, 12],
        });
        this._labelMarker = L.marker(this._position, {
            icon: icon
        });
        this._labelMarker.addTo(this._map);
        return true;
    },

    _getValueForTime: function(time) {
        if (this._dataLayer && this._dataLayer.chart && this._serieId) {
            var data = this._dataLayer.chart.get(this._serieId).options.data;
            for (var i = 0, l = data.length; i < l; i++) {
                if (data[i][0] == time) {
                    return data[i][1];
                } else if (data[i][0] < time) {
                    break;
                }
            }
        }
        for (var i = 0, l = this._data.length; i < l; i++) {
            if (this._data[i][0] == time) {
                return this._data[i][1];
            }
        }
        return null;
    },

    _existsValueForTime: function(time) {
        if (this._dataLayer && this._dataLayer.chart && this._serieId) {
            var data = this._dataLayer.chart.get(this._serieId).options.data;
            for (var i = 0, l = data.length; i < l; i++) {
                if (data[i][0] == time) {
                    return true;
                } else if (data[i][0] < time) {
                    break;
                }
            }
        }
        for (var i = 0, l = this._data.length; i < l; i++) {
            if (this._data[i][0] == time) {
                return true;
            }
        }
        return false;
    },

    _loadDataForTime: function(time, callback) {
        if (!this._dataLayer || !this._map || !this._map.getBounds().contains(this._position)){
            if (callback !== undefined) {
                callback(null);
            }            
            return;
        }
        var point = this._map.latLngToContainerPoint(this._position);
        var url = this._dataLayer.getURL() + '?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&SRS=EPSG:4326';
        url = url + '&LAYER=' + this._dataLayer.wmsParams.layers;
        url = url + '&QUERY_LAYERS=' + this._dataLayer.wmsParams.layers;
        url = url + '&X=' + point.x + '&Y=' + point.y + '&I=' + point.x + '&J=' + point.y;
        var size = this._map.getSize();
        url = url + '&BBox=' + this._map.getBounds().toBBoxString();
        url = url + '&WIDTH=' + size.x + '&HEIGHT=' + size.y;
        url = url + '&INFO_FORMAT=text/xml';
        var url_without_time = url;
        url = url + '&TIME=' + new Date(time).toISOString();

        if (this._proxy) url = this._proxy + '?url=' + encodeURIComponent(url);

        $.get(url, (function(data) {
            var result = null;
            $(data).find('FeatureInfo').each(function() {
                var this_data = $(this).find('value').text();
                try {
                    this_data = parseFloat(this_data);
                } catch (e) {
                    this_data = null;
                }
                result = this_data;
            });
            this._data.push([time, result]);
            if (callback !== undefined) {
                callback(result);
            }
        }).bind(this));
    }
});

L.timeDimension.layer.circleLabelMarker = function(layer, options) {
    return new L.TimeDimension.Layer.CircleLabelMarker(layer, options);
};