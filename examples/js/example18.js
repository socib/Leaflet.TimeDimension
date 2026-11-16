// Set 1 hour earlier
var endDate = new Date();
endDate.setUTCHours(endDate.getUTCHours() - 1);
endDate.setUTCMinutes(0, 0, 0);

/*
 * HF radar surface currents read from a THREDDS dataset through OPeNDAP:
 * one small ASCII subset of U and V per time step.
 */
L.TimeDimension.Layer.VelocityLayer.Radar = L.TimeDimension.Layer.VelocityLayer.extend({

    initialize: function(options) {
        L.TimeDimension.Layer.VelocityLayer.prototype.initialize.call(this, options);
        this._uVariable = this.options.uVariable || 'U';
        this._vVariable = this.options.vVariable || 'V';
        this._maxTimes = this.options.maxTimes || 744; // last 31 days of hourly data
        this._updateTimeDimension = this.options.updateTimeDimension || false;
        this._updateTimeDimensionMode = this.options.updateTimeDimensionMode || 'intersect'; // 'union' or 'replace'
        this._setDefaultTime = this.options.setDefaultTime || false;
        this._grid = null; // {lat: [], lon: [], times: [ms], firstIndex: int}
        this._pendingTime = null;
        this._requestGrid();
    },

    _getDataForTime: function(time) {
        if (!this._map) {
            return;
        }
        if (!this._grid) {
            this._pendingTime = time;
            return;
        }
        var index = this._grid.times.indexOf(time);
        if (index === -1) {
            this._setDataForTime(time, []);
            return;
        }
        index = index + this._grid.firstIndex;
        var subset = '[' + index + '][0:1:' + (this._grid.lat.length - 1) + '][0:1:' + (this._grid.lon.length - 1) + ']';
        var url = this._baseURL + '.ascii?' + this._encodeConstraint(this._uVariable + subset + ',' + this._vVariable + subset);
        this._request(url, (function(text) {
            var data = this._parseOpendapAscii(text);
            this._setDataForTime(time, this._buildVelocityData(data[this._uVariable], data[this._vVariable], time));
        }).bind(this));
    },

    _setDataForTime: function(time, data) {
        this._currentTimeData = data;
        this._currentLoadedTime = time;
        if (this._timeDimension && time == this._timeDimension.getCurrentTime() && !this._timeDimension.isLoading()) {
            this._update();
        }
        this.fire('timeload', {
            time: time
        });
    },

    // Grid: the size of the time axis (DDS), its units (DAS), then LAT, LON and the last times (ASCII)
    _requestGrid: function() {
        this._request(this._baseURL + '.dds', (function(dds) {
            var size = parseInt(dds.match(/time\[time = (\d+)\]/)[1], 10);
            this._request(this._baseURL + '.das', (function(das) {
                var units = das.match(/time \{[^}]*units "hours since ([^"]+)"/)[1]; // e.g. 2012-06-01 00:00:00.000 UTC
                var origin = Date.parse(units.replace(' ', 'T').replace(' UTC', 'Z'));
                var first = Math.max(0, size - this._maxTimes);
                var url = this._baseURL + '.ascii?' + this._encodeConstraint('LAT,LON,time[' + first + ':1:' + (size - 1) + ']');
                this._request(url, (function(text) {
                    var data = this._parseOpendapAscii(text);
                    var times = [];
                    for (var i = 0, l = data.time.length; i < l; i++) {
                        times.push(origin + data.time[i] * 3600000);
                    }
                    this._grid = {
                        lat: data.LAT,
                        lon: data.LON,
                        times: times,
                        firstIndex: first
                    };
                    this._updateTimeDimensionAvailableTimes();
                    if (this._pendingTime !== null) {
                        this._getDataForTime(this._pendingTime);
                        this._pendingTime = null;
                    }
                }).bind(this));
            }).bind(this));
        }).bind(this));
    },

    _updateTimeDimensionAvailableTimes: function() {
        if (this._timeDimension && this._updateTimeDimension) {
            this._timeDimension.setAvailableTimes(this._grid.times, this._updateTimeDimensionMode);
            if (this._setDefaultTime) {
                var times = this._timeDimension.getAvailableTimes();
                this._timeDimension.setCurrentTime(times[times.length - 1]);
            }
        }
    },

    // Tomcat rejects raw brackets in the query string
    _encodeConstraint: function(constraint) {
        return constraint.replace(/\[/g, '%5B').replace(/\]/g, '%5D');
    },

    _request: function(url, callback) {
        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", function(xhr) {
            callback(xhr.currentTarget.response);
        });
        oReq.open("GET", url);
        oReq.send();
    },

    // OPeNDAP ASCII response to {variable: [values]}; NaN becomes null, rows are flattened in order
    _parseOpendapAscii: function(text) {
        var result = {};
        var lines = text.split('\n');
        var i = 0;
        while (i < lines.length && lines[i].indexOf('-----') !== 0) {
            i++;
        }
        var current = null;
        for (i = i + 1; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line === '') {
                current = null;
                continue;
            }
            var header = line.match(/^(\w+)\[/);
            if (header && line.indexOf(',') === -1) {
                current = header[1];
                result[current] = [];
                continue;
            }
            if (!current) {
                continue;
            }
            var values = line.split(',');
            if (values[0].charAt(0) === '[') {
                values.shift(); // row index, e.g. [0][12]
            }
            for (var j = 0, l = values.length; j < l; j++) {
                var value = parseFloat(values[j]);
                result[current].push(isNaN(value) ? null : value);
            }
        }
        return result;
    },

    // leaflet-velocity expects the rows ordered from north to south
    _buildVelocityData: function(u, v, time) {
        var lat = this._grid.lat;
        var lon = this._grid.lon;
        var ny = lat.length;
        var nx = lon.length;
        if (lat[0] < lat[ny - 1]) {
            u = this._flipRows(u, nx, ny);
            v = this._flipRows(v, nx, ny);
        }
        var header = {
            parameterCategory: 2,
            parameterUnit: 'm s-1',
            la1: Math.max(lat[0], lat[ny - 1]),
            la2: Math.min(lat[0], lat[ny - 1]),
            lo1: lon[0],
            lo2: lon[nx - 1],
            nx: nx,
            ny: ny,
            dx: Math.abs(lon[1] - lon[0]),
            dy: Math.abs(lat[1] - lat[0]),
            refTime: new Date(time).toISOString()
        };
        return [{
            header: L.extend({
                parameterNumber: 2,
                parameterNumberName: 'eastward_sea_water_velocity'
            }, header),
            data: u
        }, {
            header: L.extend({
                parameterNumber: 3,
                parameterNumberName: 'northward_sea_water_velocity'
            }, header),
            data: v
        }];
    },

    _flipRows: function(values, nx, ny) {
        var flipped = [];
        for (var row = ny - 1; row >= 0; row--) {
            flipped = flipped.concat(values.slice(row * nx, (row + 1) * nx));
        }
        return flipped;
    }

});

L.timeDimension.layer.velocityLayer.radar = function(options) {
    return new L.TimeDimension.Layer.VelocityLayer.Radar(options);
};

var map = L.map("map", {
    zoom: 10,
    center: [38.65, 1.15],
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    timeDimensionOptions: {
        timeInterval: "P1M/" + endDate.toISOString(),
        period: "PT1H",
        currentTime: endDate.getTime()
    },
    timeDimensionControlOptions: {
        autoPlay: false,
        playerOptions: {
            minBufferReady: -1,
            transitionTime: 2000,
            loop: true
        }
    }
});


var GSHHS_h_L1 = L.tileLayer.wms(
    "https://gis.socib.es/geoserver/gwc/service/wms?", {
        layers: 'gshhs%3AGSHHS_h_L1',
        transparent: true,
        format: 'image/png'
    }
);

var baseLayers = {
    "Shoreline from GSHHG": GSHHS_h_L1
};

L.control.layers(baseLayers, {}).addTo(map);
GSHHS_h_L1.addTo(map);

var testVelocityRadarLayer = L.timeDimension.layer.velocityLayer.radar({
    baseURL: "https://thredds.socib.es/thredds/dodsC/observational/hf_radar/hf_radar_ibiza-scb_codarssproc001_L1_agg/hf_radar_ibiza-scb_codarssproc001_L1_agg_best.ncd",
    updateTimeDimension: true,
    updateTimeDimensionMode: 'intersect',
    setDefaultTime: true,
    velocityLayerOptions: {
        particleAge: 30
    }
});
testVelocityRadarLayer.addTo(map);
