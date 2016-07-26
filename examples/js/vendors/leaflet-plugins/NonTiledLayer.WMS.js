/*
 * L.NonTiledLayer.WMS is used for putting WMS non tiled layers on the map.
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

    options: {
        crs: null,
        uppercase: false
    },

    initialize: function (url, options) { // (String, Object)
        this._wmsUrl = url;

        var wmsParams = L.extend({}, this.defaultWmsParams);
		
		// all keys that are not NonTiledLayer options go to WMS params
		for (var i in options) {
			if (!L.NonTiledLayer.prototype.options.hasOwnProperty(i) && 
                !L.Layer.prototype.options.hasOwnProperty(i)) {
				wmsParams[i] = options[i];
			}
		}

        this.wmsParams = wmsParams;

        L.setOptions(this, options);
    },

    onAdd: function (map) {

        this._crs = this.options.crs || map.options.crs;
        this._wmsVersion = parseFloat(this.wmsParams.version);

        var projectionKey = this._wmsVersion >= 1.3 ? 'crs' : 'srs';
        this.wmsParams[projectionKey] = this._crs.code;

        L.NonTiledLayer.prototype.onAdd.call(this, map);
    },

    getImageUrl: function (world1, world2, width, height) {
        var wmsParams = this.wmsParams;
        wmsParams.width = width;
        wmsParams.height = height;

        var nw = this._crs.project(world1);
        var se = this._crs.project(world2);

        var url = this._wmsUrl;

        var bbox = bbox = (this._wmsVersion >= 1.3 && this._crs === L.CRS.EPSG4326 ?
        [se.y, nw.x, nw.y, se.x] :
        [nw.x, se.y, se.x, nw.y]).join(',');

        return url +
			L.Util.getParamString(this.wmsParams, url, this.options.uppercase) +
			(this.options.uppercase ? '&BBOX=' : '&bbox=') + bbox;
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