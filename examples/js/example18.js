// Set 6 hours earlier
var endDate = new Date();
endDate.setUTCHours(endDate.getUTCHours() - 6);
endDate.setUTCMinutes(0, 0, 0);

L.TimeDimension.Layer.VelocityLayer.Radar = L.TimeDimension.Layer.VelocityLayer.extend({

    _constructQuery: function(time) {
        var startDate = new Date(time);
        var endDate = new Date(startDate.getTime());
        L.TimeDimension.Util.addTimeDuration(endDate, "PT30M", false);
        var timeParams =
            "&initial_datetime=" +
            startDate.format("yyyy-mm-dd'T'HH:MM:ss") +
            "&end_datetime=" +
            endDate.format("yyyy-mm-dd'T'HH:MM:ss");
        var url = this._baseURL + timeParams;
        this._proxy = "server/proxy-api.php";
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
            transitionTime: 2000,
            loop: true
        }
    }
});

var Esri_WorldImagery = L.tileLayer(
    "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        attribution:
            "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, " +
            "AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
    }
);

var Esri_DarkGreyCanvas = L.tileLayer(
    "https://{s}.sm.mapstack.stamen.com/" +
        "(toner-lite,$fff[difference],$fff[@23],$fff[hsl-saturation@20])/" +
        "{z}/{x}/{y}.png",
    {
        attribution:
            "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, " +
            "NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community"
    }
);

var baseLayers = {
    Satellite: Esri_WorldImagery,
    "Grey Canvas": Esri_DarkGreyCanvas
};

L.control.layers(baseLayers, {}).addTo(map);
Esri_WorldImagery.addTo(map);

var testVelocityRadarLayer = L.timeDimension.layer.velocityLayer.radar({
    baseURL:
        "http://api.socib.es/data-sources/f8e2429729/data/?max_qc_value=3&standard_variable=northward_sea_water_velocity&standard_variable=eastward_sea_water_velocity&processing_level=L1&format=json",
    velocityLayerOptions: {
        particleAge: 30
    }
});
testVelocityRadarLayer.addTo(map);
