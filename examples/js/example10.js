L.TimeDimension.Layer.ImageOverlay = L.TimeDimension.Layer.extend({

    initialize: function(layer, options) {
        L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);
        this._layers = {};
        this._defaultTime = 0;
        this._timeCacheBackward = this.options.cacheBackward || this.options.cache || 0;
        this._timeCacheForward = this.options.cacheForward || this.options.cache || 0;
        this._getUrlFunction = this.options.getUrlFunction;

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
        var layer = this._getLayerForTime(ev.time);
        if (!this._map.hasLayer(layer)) {
            this._map.addLayer(layer);
        }
    },

    isReady: function(time) {
        var layer = this._getLayerForTime(time);
        return layer.isLoaded();
    },

    _update: function() {
        if (!this._map)
            return;
        var time = map.timeDimension.getCurrentTime();
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

    _showLayer: function(layer, time) {
        if (this._currentLayer && this._currentLayer !== layer) {
            this._currentLayer.hide();
            this._map.removeLayer(this._currentLayer);
        }
        layer.show();
        if (this._currentLayer && this._currentLayer === layer) {
            return;
        }
        this._currentLayer = layer;
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
        var url = this._getUrlFunction(this._baseLayer.getURL(), time);
        imageBounds = this._baseLayer._bounds;

        var newLayer = L.imageOverlay(url, imageBounds, this._baseLayer.options);
        this._layers[time] = newLayer;
        newLayer.on('load', (function(layer, time) {
            layer.setLoaded(true);
            if (map.timeDimension && time == map.timeDimension.getCurrentTime() && !map.timeDimension.isLoading()) {
                this._showLayer(layer, time);
            }
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
        return result.sort();
    },

    _removeLayers: function(times) {
        for (var i = 0, l = times.length; i < l; i++) {
            this._map.removeLayer(this._layers[times[i]]);
            delete this._layers[times[i]];
        }
    },

});

L.timeDimension.layer.imageOverlay = function(layer, options) {
    return new L.TimeDimension.Layer.ImageOverlay(layer, options);
};

L.ImageOverlay.include({
    _visible: true,
    _loaded: false,

    _originalUpdate: L.imageOverlay.prototype._update,

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
        if (this._image && this._image.style)
            this._image.style.display = 'none';
    },

    show: function() {
        this._visible = true;
        if (this._image && this._image.style)
            this._image.style.display = 'block';
    },

    getURL: function() {
        return this._url;
    },

});



var map = L.map('map', {
    zoom: 15,
    timeDimension: true,
    timeDimensionOptions: {
        timeInterval: "2014-01-01/2014-12-31",
        period: "PT1H",
        validTimeRange: "06:00/15:00",
        currentTime: Date.parse("2014-08-01T12:00:00Z")
    },
    timeDimensionControl: false,
    timeDimensionControlOptions: {
        autoPlay: false,
        playerOptions: {
            buffer: 10,
            transitionTime: 500,
            loop: true,
        }
    },
    center: [38.70, 1.15],
});

// Add image layer
var imageUrl = 'http://www.socib.es/users/mobims/imageArchive/clm/sirena/clm/c04/2014/01/11/clm_s_04_2014-01-01-12-00.png',
    imageBounds = [
        [38.69, 1.1675],
        [38.71, 1.1325]
    ];

var imageLayer = L.imageOverlay(imageUrl, imageBounds, {
    opacity: 0.5
});

var getSirenaImageUrl = function(baseUrl, time) {
    var beginUrl = baseUrl.substring(0, baseUrl.lastIndexOf("/") - 10);
    beginUrl = beginUrl + new Date(time).format('yyyy/mm/dd');
    var strTime = new Date(time).format('yyyy-mm-dd-HH-MM');
    var initFileUrl = baseUrl.substring(baseUrl.lastIndexOf("/"), baseUrl.length - 20);
    url = beginUrl + initFileUrl + strTime + '.png';
    return url;
};

var testImageTimeLayer = L.timeDimension.layer.imageOverlay(imageLayer, {
    getUrlFunction: getSirenaImageUrl
});
testImageTimeLayer.addTo(map);

// Create wind chart
$.getJSON('js/example10-data.json', function(data) {
    // Create the chart
    $('#chart').highcharts('StockChart', {
        rangeSelector: {
            selected: 2
        },
        title: {
            text: 'Wind average at Cala Millor'
        },

        tooltip: {
            formatter: function() {
                var s = '<b>' + Highcharts.dateFormat('%A %b %e, %Y', this.x) + '</b>';
                $.each(this.points, function(i, point) {
                    s += '<br/><strong>Wind</strong>: ' + point.y.toFixed(2) + ' m/s';
                });
                return s;
            },
            shared: true
        },
        series: [{
            name: 'WIND',
            data: data,
        }],
        plotOptions: {
            series: {
                cursor: 'pointer',
                point: {
                    events: {
                        click: function(event) {
                            var day = new Date(event.point.x);
                            day.setUTCHours(12, 0, 0);
                            map.timeDimension.setCurrentTime(day.getTime());
                        }
                    }
                }
            }
        }
    });
});



// basic custom control
var controlContainer = $("#mapcontrol");
map.timeDimension.on('timeload', function(data) {
    var date = new Date(map.timeDimension.getCurrentTime());
    controlContainer.find('span.date').html(date.format("dd/mm/yyyy", true));
    controlContainer.find('span.time').html(date.format("HH:MM", true));
    if (data.time == map.timeDimension.getCurrentTime()) {
        $('#map').removeClass('map-loading');
    }
});
map.timeDimension.on('timeloading', function(data) {
    if (data.time == map.timeDimension.getCurrentTime()) {
        $('#map').addClass('map-loading');
    }
});
controlContainer.find('.btn-prev').click(function() {
    map.timeDimension.previousTime();
});
controlContainer.find('.btn-next').click(function() {
    map.timeDimension.nextTime();
});
var player = new L.TimeDimension.Player({}, map.timeDimension);
controlContainer.find('.btn-play').click(function() {
    var btn = $(this);
    if (player.isPlaying()) {
        btn.removeClass("btn-pause");
        btn.addClass("btn-play");
        btn.html("Play");
        player.stop();
    } else {
        btn.removeClass("btn-play");
        btn.addClass("btn-pause");
        btn.html("Pause");
        player.start();
    }
});

map.timeDimension.setCurrentTime(new Date(2014, 0, 1, 13, 00).getTime());