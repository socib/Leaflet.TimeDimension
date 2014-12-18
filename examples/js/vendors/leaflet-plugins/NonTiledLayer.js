/*
 * L.NonTiledLayer is an addon for leaflet which renders dynamic image overlays
 */
L.NonTiledLayer = L.Class.extend({
 	includes: L.Mixin.Events,
	options: {
        attribution: '',
		opacity: 1,
		pane: null
	},

    // override this method in the inherited class
    getImageUrl: function (world1, world2, width, height) {},

    initialize: function (options) {
        this._currentImage = null;
		this._bufferImage = null;
        L.setOptions(this, options);
    },

    onAdd: function (map) {
        this._map = map;

        if(!this._div)
            this._div = L.DomUtil.create('div', 'leaflet-image-layer');

		if(this.options.pane)
			this._pane = this.options.pane;
		else
			this._pane = this._map.getPanes().overlayPane;

        this._update();

		if (map.options.zoomAnimation && L.Browser.any3d) {
			map.on('zoomanim', this._animateZoom, this);
		}

		this._map.on('moveend', this._update, this);

        this._pane.appendChild(this._div);
	},

    onRemove: function (map) {
 		this._pane.removeChild(this._div);

 		this._map.off('moveend', this._update, this);

		if (map.options.zoomAnimation) {
			map.off('zoomanim', this._animateZoom, this);
		}
    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		this._updateOpacity();
		return this;
	},

	// TODO remove bringToFront/bringToBack duplication from TileLayer/Path
	bringToFront: function () {
	    if (this._div) {
			this._pane.appendChild(this._div);
		}
		return this;
	},

	bringToBack: function () {
		if (this._div) {
		    this._pane.insertBefore(this._div, this._pane.firstChild);
		}
		return this;
	},


    getAttribution: function () {
        return this.options.attribution;
    },


	_initImage: function () {
		var _image = L.DomUtil.create('img', 'leaflet-image-layer');
		this._div.appendChild(_image);

		if (this._map.options.zoomAnimation && L.Browser.any3d) {
			L.DomUtil.addClass(_image, 'leaflet-zoom-animated');
		} else {
			L.DomUtil.addClass(_image, 'leaflet-zoom-hide');
		}

		this._updateOpacity();

		//TODO createImage util method to remove duplication
		L.extend(_image, {
			galleryimg: 'no',
			onselectstart: L.Util.falseFn,
			onmousemove: L.Util.falseFn,
			onload: L.bind(this._onImageLoad, this)
		});

		return _image;
    },

    _animateZoom: function (e) {
		if(this._currentImage)
			this._animateImage(this._currentImage, e);
		if(this._bufferImage)
			this._animateImage(this._bufferImage, e);
	},

    _animateImage: function (image, e) {
        var map = this._map,
		    scale = map.getZoomScale(e.zoom),
		    nw = image._bounds.getNorthWest(),
		    se = image._bounds.getSouthEast(),

		    topLeft = map._latLngToNewLayerPoint(nw, e.zoom, e.center),
		    size = map._latLngToNewLayerPoint(se, e.zoom, e.center)._subtract(topLeft),
		    origin = topLeft._add(size._multiplyBy((1 / 2) * (1 - 1 / scale)));

        image.style[L.DomUtil.TRANSFORM] =
		        L.DomUtil.getTranslateString(origin) + ' scale(' + scale + ') ';
    },

    _resetImage: function (image) {
        var bounds = new L.Bounds(
		        this._map.latLngToLayerPoint(image._bounds.getNorthWest()),
		        this._map.latLngToLayerPoint(image._bounds.getSouthEast())),
		    size = bounds.getSize();

        L.DomUtil.setPosition(image, bounds.min);

        image.style.width = size.x + 'px';
        image.style.height = size.y + 'px';
    },

    _getClippedBounds: function() {
        var wgsBounds = this._map.getBounds();

        // truncate bounds to valid wgs bounds
        var lon1 = wgsBounds.getNorthWest().lng;
        var lat1 = wgsBounds.getNorthWest().lat;
        var lon2 = wgsBounds.getSouthEast().lng;
        var lat2 = wgsBounds.getSouthEast().lat;
        lon1 = (lon1 + 180) % 360 - 180;
        if (lat1 > 85.05) lat1 = 85.05;
        if (lat2 < -85.05) lat2 = -85.05;
        if (lon1 < -180) lon1 = -180;
        if (lon2 > 180) lon2 = 180;
        var world1 = new L.LatLng(lat1, lon1);
        var world2 = new L.LatLng(lat2, lon2);

        return new L.LatLngBounds(world1, world2);
    },

    _update: function () {
		if(this._bufferImage)
			this._resetImage(this._bufferImage);

        var bounds = this._getClippedBounds();

        // re-project to corresponding pixel bounds
        var pix1 = this._map.latLngToContainerPoint(bounds.getNorthWest());
        var pix2 = this._map.latLngToContainerPoint(bounds.getSouthEast());

        // get pixel size
        var width = pix2.x - pix1.x;
        var height = pix2.y - pix1.y;

        // resulting image is too small
        if (width < 32 || height < 32)
            return;

        var url = this.getImageUrl(bounds.getNorthWest(), bounds.getSouthEast(), width, height);

        this._currentImage = this._initImage();

        this._currentImage._bounds = bounds;

        this._resetImage(this._currentImage);

        this._currentImage.src = url;

		L.DomUtil.setOpacity(this._currentImage, 0);
    },

    _onImageLoad: function (e) {
		if(e.target != this._currentImage) { // obsolete image
            this._div.removeChild(e.target);
			return;
		}

        if(this._bufferImage)
            this._div.removeChild(this._bufferImage);

		this._bufferImage = this._currentImage;

		L.DomUtil.setOpacity(this._currentImage, 1);

	    this.fire('load');
    },

    setOpacity: function (opacity) {
        this.options.opacity = opacity;
        this._updateOpacity();
        return this;
    },

	_updateOpacity: function () {
		L.DomUtil.setOpacity(this._div, this.options.opacity);
	}
});

L.nonTiledLayer = function () {
    return new L.NonTiledLayer();
};
