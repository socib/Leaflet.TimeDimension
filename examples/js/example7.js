var currentTime = new Date();
currentTime.setUTCHours(0, 0, 0, 0);
var endDate = new Date(currentTime.getTime());
L.TimeDimension.Util.addTimeDuration(endDate, "P3D", true);

var map = L.map('map', {
    zoom: 8,
    center: [39.4, 2.5],
    fullscreenControl: true,
    timeDimensionControl: true,
    timeDimension: true,
    timeDimensionOptions: {
        timeInterval: "P1M/" + endDate.toISOString(),
        period: "PT6H",
        currentTime: currentTime.getTime()
    },
    timeDimensionControlOptions: {
        playerOptions: {
            loop: true,
            transitionTime: 1500,
            buffer: 5
        }
    }
});

var wmopWMS = "https://thredds.socib.es/thredds/wms/operational_models/oceanographical/hydrodynamics/model_run_aggregation/wmop_surface/wmop_surface_best.ncd";
var wmopTemperatureLayer = L.nonTiledLayer.wms(wmopWMS, {
    layers: 'temp',
    format: 'image/png',
    transparent: true,
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 40,
    styles: 'default-scalar/div-Spectral-inv',
    zIndex: 1,
});

var wmopTemperatureContourLayer = L.nonTiledLayer.wms(wmopWMS, {
    layers: 'temp',
    format: 'image/png',
    transparent: true,
    numcontours: 11,
    styles: 'contours',
    zIndex: 10,
});

var wmopSalinityLayer = L.nonTiledLayer.wms(wmopWMS, {
    layers: 'salt',
    format: 'image/png',
    transparent: true,
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 40,
    styles: 'default-scalar/mpl_rdbu_r',
    zIndex: 1
});

var wmopSalinityContourLayer = L.nonTiledLayer.wms(wmopWMS, {
    layers: 'salt',
    format: 'image/png',
    transparent: true,
    numcontours: 11,
    styles: 'contours',
    zIndex: 10
});

var wmopVelocityLayer = L.nonTiledLayer.wms(wmopWMS, {
    layers: 'u:v-group',
    format: 'image/png',
    transparent: true,
    colorscalerange: '0,1',
    styles: 'sized_arrows',
    zIndex: 20
});

var wmopVelocityTimeLayer = L.timeDimension.layer.wms(wmopVelocityLayer, {updateTimeDimension: true});
var overlayMaps = {
    "WMOP - Velocity": wmopVelocityTimeLayer
};

var baseLayers = getCommonBaseLayers(map); // see baselayers.js
var layersControl = L.control.layers(baseLayers, overlayMaps, {autoZIndex: false});
layersControl.addTo(map);

wmopVelocityTimeLayer.addTo(map);

var getLayerMinMax = function(layer, callback) {
    // Query the min/max at the first time of the period and at the server's
    // default (latest) time, so the colour scale covers the whole animation.
    var times = map.timeDimension.getAvailableTimes();
    var queryTimes = [new Date(times[0]).toISOString(), null];
    var min = Infinity;
    var max = -Infinity;
    var pending = queryTimes.length;
    queryTimes.forEach(function(time) {
        var url = wmopWMS + '?service=WMS&version=1.1.1&request=GetMetadata&item=minmax';
        url = url + '&layers=' + layer.options.layers;
        url = url + '&srs=EPSG:4326';
        var size = map.getSize();
        url = url + '&BBox=' + map.getBounds().toBBoxString();
        url = url + '&height=' + size.y;
        url = url + '&width=' + size.x;
        if (time) {
            url = url + '&time=' + time;
        }

        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", (function(xhr) {
            var response = xhr.currentTarget.response;
            var data = JSON.parse(response);
            min = Math.min(min, data.min);
            max = Math.max(max, data.max);
            pending--;
            if (pending > 0) {
                return;
            }
            min = Math.floor(min) - 1;
            max = Math.floor(max + 2);
            layer.options.colorscalerange = min + "," + max;
            layer.wmsParams.colorscalerange = min + "," + max;
            if (callback !== undefined) {
                callback();
            }
        }));
        oReq.open("GET", url);
        oReq.send();
    });
};

// Temperature and salinity are mutually exclusive: switching on a layer of
// one group (fill or contours) switches off both layers of the other group.
var exclusiveGroups = {
    temperature: [],
    salinity: []
};
map.on('overlayadd', function(ev) {
    var other = null;
    if (exclusiveGroups.temperature.indexOf(ev.layer) >= 0) {
        other = exclusiveGroups.salinity;
    } else if (exclusiveGroups.salinity.indexOf(ev.layer) >= 0) {
        other = exclusiveGroups.temperature;
    }
    if (!other) {
        return;
    }
    // Deferred: the layers control only refreshes its checkboxes for changes
    // made outside its own click handler.
    setTimeout(function() {
        other.forEach(function(layer) {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
    }, 0);
});

var addTimeDimensionLayer = function(layer, name, group, addToMap){
    var timeDimensionLayer = L.timeDimension.layer.wms(layer);
    exclusiveGroups[group].push(timeDimensionLayer);
    layersControl.addOverlay(timeDimensionLayer, name);
    if (addToMap)
        timeDimensionLayer.addTo(map);
}

getLayerMinMax(wmopTemperatureLayer, function(){
    addTimeDimensionLayer(wmopTemperatureLayer, 'WMOP - Temperature', 'temperature', true);
    wmopTemperatureContourLayer.wmsParams.colorscalerange = wmopTemperatureLayer.wmsParams.colorscalerange;
    wmopTemperatureContourLayer.options.colorscalerange = wmopTemperatureLayer.wmsParams.colorscalerange;
    addTimeDimensionLayer(wmopTemperatureContourLayer, 'WMOP - Temperature (Contour)', 'temperature', true);
});
getLayerMinMax(wmopSalinityLayer, function(){
    addTimeDimensionLayer(wmopSalinityLayer, 'WMOP - Salinity', 'salinity', false);
    wmopSalinityContourLayer.wmsParams.colorscalerange = wmopSalinityLayer.wmsParams.colorscalerange;
    wmopSalinityContourLayer.options.colorscalerange = wmopSalinityLayer.wmsParams.colorscalerange;
    addTimeDimensionLayer(wmopSalinityContourLayer, 'WMOP - Salinity (Contour)', 'salinity', false);
});
