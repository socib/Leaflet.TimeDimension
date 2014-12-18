/*
 * L.NonTiledLayer.WMS is used for putting WMS tile layers on the map.
 */
L.NonTiledLayer.WMS = L.NonTiledLayer.extend({

    defaultWmsParams: {
        service: 'WMS',
        request: 'GetMap',
        version: '1.1.1',
        layers: '',
        styles: '',
        format: 'image/jpeg',
        transparent: false
    },

    initialize: function (url, options) { // (String, Object)
        this._wmsUrl = url;

        var wmsParams = L.extend({}, this.defaultWmsParams);

        for (var i in options) {
            // all keys that are not TileLayer options go to WMS params
            if (!this.options.hasOwnProperty(i)) {
                wmsParams[i] = options[i];
            }
        }

        this.wmsParams = wmsParams;

        L.setOptions(this, options);
    },

    onAdd: function (map) {
        var projectionKey = parseFloat(this.wmsParams.version) >= 1.3 ? 'crs' : 'srs';
        this.wmsParams[projectionKey] = map.options.crs.code;

        L.NonTiledLayer.prototype.onAdd.call(this, map);
    },

    getImageUrl: function (world1, world2, width, height) {
        var wmsParams = this.wmsParams;
        wmsParams.width = width;
        wmsParams.height = height;

        var crs = this._map.options.crs;
			
        var p1 = crs.project(world1);
        var p2 = crs.project(world2);

        var url = this._wmsUrl + L.Util.getParamString(wmsParams, this._wmsUrl) + '&bbox=' + p1.x + ',' + p2.y + ',' + p2.x + ',' + p1.y;
        return url;
    },

    setParams: function (params, noRedraw) {

        L.extend(this.wmsParams, params);

        if (!noRedraw) {
            this.redraw();
        }

        return this;
    }
});

L.nonTiledLayer.wms = function (url, options) {
    return new L.NonTiledLayer.WMS(url, options);
};