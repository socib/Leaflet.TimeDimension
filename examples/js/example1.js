var map = L.map('map', {
    zoom: 5,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    center: [38.0, 15.0]
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

var avisoWMS = "http://thredds.socib.es/thredds/wms/observational/satellite/altimetry/aviso/madt/altimetry_aviso_madt_L4_agg/altimetry_aviso_madt_L4_agg_best.ncd";

var heigthLayer = L.tileLayer.wms(avisoWMS, {
    layers: 'adt',
    format: 'image/png',
    transparent: true,
    colorscalerange: '-0.4,0.4',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 100,    
    styles: 'boxfill/rainbow'
});

var velocityLayer = L.nonTiledLayer.wms(avisoWMS, {
    layers: 'surface_geostrophic_sea_water_velocity',
    format: 'image/png',
    transparent: true,
    colorscalerange: '-20,100',
    markerscale: 10,
    markerspacing: 8,
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 100,    
    styles: 'prettyvec/greyscale'
});

var proxy = 'server/proxy.php';
var heightTimeLayer = L.timeDimension.layer.wms(heigthLayer, {
    proxy: proxy,
    updateTimeDimension: true,
});
var velocityTimeLayer = L.timeDimension.layer.wms(velocityLayer, {
    proxy: proxy,
    updateTimeDimension: false,
});

var overlayMaps = {
    "AVISO - Sea surface height above geoid": heightTimeLayer,
    "AVISO - Surface geostrophic sea water velocity": velocityTimeLayer
};

// Legends
var heigthLegend = L.control({
    position: 'bottomright'
});
heigthLegend.onAdd = function(map) {
    var src = avisoWMS + "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=adt&colorscalerange=-0.4,0.4&PALETTE=rainbow&transparent=TRUE";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend">';
    return div;
};

var velocityLegend = L.control({
    position: 'bottomright'
});
velocityLegend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML += '<img src="img/black-arrow.png" /> Surface geostrophic<br/>sea water velocity';
    return div;
};


map.on('overlayadd', function(eventLayer) {
    if (eventLayer.name == 'AVISO - Sea surface height above geoid') {
        heigthLegend.addTo(this);
    } else if (eventLayer.name == 'AVISO - Surface geostrophic sea water velocity') {
        velocityLegend.addTo(this);
    } 
});

map.on('overlayremove', function(eventLayer) {
    if (eventLayer.name == 'AVISO - Sea surface height above geoid') {
        map.removeControl(heigthLegend);
    } else if (eventLayer.name == 'AVISO - Surface geostrophic sea water velocity') {
        map.removeControl(velocityLegend);
    }     
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

heightTimeLayer.addTo(map);
velocityTimeLayer.addTo(map);