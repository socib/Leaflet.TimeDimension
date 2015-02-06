var map = L.map('map', {
    zoom: 5,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    center: [38.0, 15.0]
});

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
var heigthContourLayer = L.tileLayer.wms(avisoWMS, {
    layers: 'adt',
    format: 'image/png',
    transparent: true,
    colorscalerange: '-0.5,0.5',
    numcontours: 11,    
    styles: 'contour/rainbow'
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
var heightContourTimeLayer = L.timeDimension.layer.wms(heigthContourLayer, {
    proxy: proxy,
    updateTimeDimension: false,
});
var velocityTimeLayer = L.timeDimension.layer.wms(velocityLayer, {
    proxy: proxy,
    updateTimeDimension: false,
});

var overlayMaps = {
    "AVISO - Sea surface height above geoid": heightTimeLayer,
    "AVISO - Sea surface height above geoid (Contour)": heightContourTimeLayer,
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

var baseLayers = getCommonBaseLayers(map); // see baselayers.js
L.control.layers(baseLayers, overlayMaps).addTo(map);
L.control.coordinates({
    position: "bottomright",
    decimals: 3,
    labelTemplateLat: "Latitude: {y}",
    labelTemplateLng: "Longitude: {x}",
    useDMS: true,
    enableUserInput: false
}).addTo(map);

heightTimeLayer.addTo(map);
heightContourTimeLayer.addTo(map);
velocityTimeLayer.addTo(map);