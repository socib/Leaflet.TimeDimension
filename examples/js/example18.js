// Set 1 hour earlier
var endDate = new Date();
endDate.setUTCHours(endDate.getUTCHours() - 1);
endDate.setUTCMinutes(0, 0, 0);

L.TimeDimension.Layer.VelocityLayer.Radar = L.TimeDimension.Layer.VelocityLayer.extend({

    initialize: function(options) {
        L.TimeDimension.Layer.VelocityLayer.prototype.initialize.call(this, options);
        this._socibDataSource = this.options.socibDataSource || null;
        this._apiKey = this.options.apiKey || null;
        this._proxy = this.options.proxy || null;

        // Update availableTimes from datasource metadata
        this._updateTimeDimension = this.options.updateTimeDimension || false;
        this._updateTimeDimensionMode = this.options.updateTimeDimensionMode || 'intersect'; // 'union' or 'replace'
        this._period = this.options.period || 'PT1H';
        this._setDefaultTime = this.options.setDefaultTime || false;
        this._endTime = this.options.endTime || null;
        this._metadataRequested = false;
        if (this._updateTimeDimension) {
            this._requestDataSourceMetadata();
        }
    },    

    onAdd: function(map) {
        L.TimeDimension.Layer.VelocityLayer.prototype.onAdd.call(this, map);
        if (this._updateTimeDimension) {
            if (this._endTime === null) {
                this._requestDataSourceMetadata();
            } else {
                this._updateTimeDimensionAvailableTimes();
            }
        }
    },

    _constructQuery: function(time) {
        var startDate = new Date(time);
        var endDate = new Date(startDate.getTime());
        L.TimeDimension.Util.addTimeDuration(endDate, "PT30M", false);
        var timeParams =
            "&initial_datetime=" +
            startDate.toISOString().substring(0, 19) +
            "&end_datetime=" +
            endDate.toISOString().substring(0, 19);
        var url = this._baseURL + this._socibDataSource +
                    "/data/?max_qc_value=3&standard_name=northward_sea_water_velocity&standard_name=eastward_sea_water_velocity&processing_level=L1&format=json" + 
                    timeParams;
        if (this._apiKey) {
            url = url + "&api_key=" + this._apiKey;
        }
        if (this._proxy) {
            url = this._proxy + "?url=" + encodeURIComponent(url);
        }
        return url;
    },

    _processLoadedData: function(data) {
        if (data.length === 0) {
            return [];
        }
        findVariable = function(standard_name, variable) {
            return variable.standard_name === standard_name;
        };
        var u = data[0].variables.find(findVariable.bind(this, "eastward_sea_water_velocity"));
        var v = data[0].variables.find(findVariable.bind(this, "northward_sea_water_velocity"));
        var lat = data[0].coordinates.latitude;
        var lon = data[0].coordinates.longitude;
        var time = data[0].coordinates.time.data;

        var u_header = {
            parameterUnit: u.units,
            parameterNumberName: u.standard_name,
            parameterNumber: 2,
            parameterCategory: 2,
            la1: lat.data[0],
            la2: lat.data[lat.data.length - 1],
            lo1: lon.data[0],
            lo2: lon.data[lon.data.length - 1],
            nx: lon.data.length,
            ny: lat.data.length,
            refTime: time
        };
        u_header["dx"] = (u_header["lo2"] - u_header["lo1"]) / u_header["nx"];
        u_header["dy"] = (u_header["la1"] - u_header["la2"]) / u_header["ny"];

        var v_header = {
            parameterUnit: v.units,
            parameterNumberName: v.standard_name,
            parameterNumber: 3, // northward-v
            parameterCategory: 2,
            la1: lat.data[0],
            la2: lat.data[lat.data.length - 1],
            lo1: lon.data[0],
            lo2: lon.data[lon.data.length - 1],
            nx: lon.data.length,
            ny: lat.data.length,
            refTime: time
        };
        v_header["dx"] = (v_header["lo2"] - v_header["lo1"]) / v_header["nx"];
        v_header["dy"] = (v_header["la1"] - v_header["la2"]) / v_header["ny"];

        return [
            {
                header: u_header,
                data: _.flatten(u.data[0])
            },
            {
                header: v_header,
                data: _.flatten(v.data[0])
            }
        ];
    },

    _setEndTime: function(endTime) {
        this._endTime = endTime;        
    },

    _getDefaultTime: function() {
        return this._endTime;
    },

    _updateTimeDimensionAvailableTimes: function() {
        if (this._timeDimension && this._updateTimeDimension) {
            var startTime = new Date(this._timeDimension.getAvailableTimes()[0]);
            var times = L.TimeDimension.Util.explodeTimeRange(startTime, this._endTime, this._period);
            this._timeDimension.setAvailableTimes(times, this._updateTimeDimensionMode);
            if (this._setDefaultTime) {
                var defaultTime = this._getDefaultTime();
                if (defaultTime !== this._timeDimension.getCurrentTime()){
                    this._timeDimension.setCurrentTime(this._getDefaultTime());
                }
            }
        }
    },

    _requestDataSourceMetadata: function() {
        if (this._metadataRequested) {
            return;
        }
        this._metadataRequested = true;
        var url = this._baseURL + this._socibDataSource + "/?";
        if (this._apiKey) {
            url = url + "&api_key=" + this._apiKey;
        }
        if (this._proxy) {
            url = this._proxy + "?url=" + encodeURIComponent(url);
        }
        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", (function(xhr) {
            var data = null;
            try {
                var response = xhr.currentTarget.response;
                data = JSON.parse(response);
            } catch(e) {
                console.log("Error parsing API response", e);
            }
            if (data !== null){
                var end_datetime = new Date(Date.parse(data['end_datetime']));
                this._setEndTime(end_datetime);
                this._updateTimeDimensionAvailableTimes();
            }
        }).bind(this));        
        oReq.open("GET", url);
        oReq.send();
    },     

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
    baseURL: "https://api.socib.es/data-sources/",
    socibDataSource: "f8e2429729",    
    updateTimeDimension: true,
    updateTimeDimensionMode: 'intersect',
    setDefaultTime: true,
    proxy: "server/proxy-api.php",    
    velocityLayerOptions: {
        particleAge: 30
    }
});
testVelocityRadarLayer.addTo(map);
