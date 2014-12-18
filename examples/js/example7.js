var startDate = new Date();
startDate.setUTCHours(0, 0, 0, 0);

var map = L.map('map', {
    zoom: 6,
    fullscreenControl: true,
    timeDimensionControl: true,
    timeDimension: true,
    center: [39.3, 4]
});

// Add OSM and emodnet bathymetry to map
var osmLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
});
var bathymetryLayer = L.tileLayer.wms("http://admin.n4m5.eu/geoserver/wms", {
    layers: 'emodnet:mean_singlecolour',
    format: 'image/png',
    transparent: true,
    attribution: "Emodnet bathymetry",
    opacity: 0.3
});
var bathymetryLayer2 = L.tileLayer.wms("http://admin.n4m5.eu/geoserver/wms", {
    layers: 'emodnet:mean_singlecolour',
    format: 'image/png',
    transparent: true,
    attribution: "Emodnet bathymetry",
    opacity: 0.3
});

var osmBathymetry = L.layerGroup([osmLayer, bathymetryLayer2]);
osmBathymetry.addTo(map);
var baseMaps = {
    "Emodnet bathymetry": bathymetryLayer,
    "Emodnet bathymetry + OSM": osmBathymetry
};

var wmopWMS = "http://thredds.socib.es/thredds/wms/operational_models/oceanographical/hydrodynamics/model_run_aggregation/wmop/wmop_best.ncd";
var wmopTemperatureLayer = L.tileLayer.wms(wmopWMS, {
    layers: 'temp',
    format: 'image/png',
    transparent: true,
    colorscalerange: '15,30',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 40,
    styles: 'boxfill/sst_36'
});

var wmopSalinityLayer = L.tileLayer.wms(wmopWMS, {
    layers: 'salt',
    format: 'image/png',
    transparent: true,
    colorscalerange: '35,39',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 40,
    styles: 'boxfill/mpl_rdbu_r'
});

var wmopVelocityLayer = L.nonTiledLayer.wms(wmopWMS, {
    layers: 'sea_surface_velocity',
    format: 'image/png',
    transparent: true,
    colorscalerange: '0,3',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    markerscale: 15,
    markerspacing: 20,
    styles: 'prettyvec/rainbow'    
});

var proxy = 'server/proxy.php';
var wmopTemperatureTimeLayer = L.timeDimension.layer.wms(wmopTemperatureLayer, {proxy: proxy, updateTimeDimension: true});
var wmopSalinityTimeLayer = L.timeDimension.layer.wms(wmopSalinityLayer, {proxy: proxy});
var wmopVelocityTimeLayer = L.timeDimension.layer.wms(wmopVelocityLayer, {proxy: proxy});

var overlayMaps = {
    "WMOP - SST": wmopTemperatureTimeLayer,
    "WMOP - SSS": wmopSalinityTimeLayer,
    "WMOP - Velocity": wmopVelocityTimeLayer
};

map.on('overlayadd', function(eventLayer) {
    console.log('TODO: add legend');
});

map.on('overlayremove', function(eventLayer) {
    console.log('TODO: remove legend');
});


L.control.layers(baseMaps, overlayMaps).addTo(map);
L.control.coordinates({
    position: "bottomright",
    decimals: 3,
    labelTemplateLat: "Latitude: {y}",
    labelTemplateLng: "Longitude: {x}",
    useDMS: true,
    enableUserInput: false
}).addTo(map);

wmopTemperatureTimeLayer.addTo(map);
