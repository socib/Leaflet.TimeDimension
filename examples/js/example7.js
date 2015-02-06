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
            buffer: 10
        }
    }
});

var wmopWMS = "http://thredds.socib.es/thredds/wms/operational_models/oceanographical/hydrodynamics/model_run_aggregation/wmop/wmop_best.ncd";
var wmopTemperatureLayer = L.tileLayer.wms(wmopWMS, {
    layers: 'temp',
    format: 'image/png',
    transparent: true,    
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 40,
    styles: 'boxfill/sst_36',
    zIndex: 1,
});

var wmopTemperatureContourLayer = L.tileLayer.wms(wmopWMS, {
    layers: 'temp',
    format: 'image/png',
    transparent: true,    
    numcontours: 11,
    styles: 'contour/sst_36',
    zIndex: 10,
});

var wmopSalinityLayer = L.tileLayer.wms(wmopWMS, {
    layers: 'salt',
    format: 'image/png',
    transparent: true,    
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 40,
    styles: 'boxfill/mpl_rdbu_r'
});

var wmopSalinityContourLayer = L.tileLayer.wms(wmopWMS, {
    layers: 'salt',
    format: 'image/png',
    transparent: true,    
    numcontours: 11,
    styles: 'contour/sst_36'
});

var wmopVelocityLayer = L.nonTiledLayer.wms(wmopWMS, {
    layers: 'sea_surface_velocity',
    format: 'image/png',
    transparent: true,
    colorscalerange: '0,3',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    markerscale: 10,
    markerspacing: 8,
    styles: 'prettyvec/greyscale'    
});

var proxy = 'server/proxy.php';
var wmopVelocityTimeLayer = L.timeDimension.layer.wms(wmopVelocityLayer, {proxy: proxy, updateTimeDimension: true});
var overlayMaps = {
    "WMOP - Velocity": wmopVelocityTimeLayer
};

var baseLayers = getCommonBaseLayers(map); // see baselayers.js
var layersControl = L.control.layers(baseLayers, overlayMaps);
layersControl.addTo(map);
L.control.coordinates({
    position: "bottomright",
    decimals: 3,
    labelTemplateLat: "Latitude: {y}",
    labelTemplateLng: "Longitude: {x}",
    useDMS: true,
    enableUserInput: false
}).addTo(map);

wmopVelocityTimeLayer.addTo(map);

var getLayerMinMax = function(layer, callback) {
    var url = wmopWMS + '?service=WMS&version=1.1.1&request=GetMetadata&item=minmax';
    url = url + '&layers=' + layer.options.layers;    
    url = url + '&srs=EPSG:4326';    
    var size = map.getSize();
    url = url + '&BBox=' + map.getBounds().toBBoxString();
    url = url + '&height=' + size.y;
    url = url + '&width=' + size.x;
    url = proxy + '?url=' + encodeURIComponent(url);

    $.getJSON(url, (function(layer, data) {
        var range = data.max - data.min;
        var min = Math.floor(data.min) - 1;
        var max = Math.floor(data.max + 2);
        layer.options.colorscalerange = min + "," + max;
        layer.wmsParams.colorscalerange = min + "," + max;
        if (callback !== undefined) {
            callback();
        }
    }).bind(this, layer));
};

var addTimeDimensionLayer = function(layer, name, addToMap){
    var timeDimensionLayer = L.timeDimension.layer.wms(layer, {proxy: proxy});
    layersControl.addOverlay(timeDimensionLayer, name);
    if (addToMap)
        timeDimensionLayer.addTo(map);
}

getLayerMinMax(wmopTemperatureLayer, function(){
    addTimeDimensionLayer(wmopTemperatureLayer, 'WMOP - Temperature', true);
    wmopTemperatureContourLayer.wmsParams.colorscalerange = wmopTemperatureLayer.wmsParams.colorscalerange;
    wmopTemperatureContourLayer.options.colorscalerange = wmopTemperatureLayer.wmsParams.colorscalerange;
    addTimeDimensionLayer(wmopTemperatureContourLayer, 'WMOP - Temperature (Contour)', true);    
});
getLayerMinMax(wmopSalinityLayer, function(){
    addTimeDimensionLayer(wmopSalinityLayer, 'WMOP - Salinity', false);
    wmopSalinityContourLayer.wmsParams.colorscalerange = wmopSalinityLayer.wmsParams.colorscalerange;
    wmopSalinityContourLayer.options.colorscalerange = wmopSalinityLayer.wmsParams.colorscalerange;    
    addTimeDimensionLayer(wmopSalinityContourLayer, 'WMOP - Salinity (Contour)', false);
});