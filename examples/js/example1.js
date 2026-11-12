var endDate = new Date();
endDate.setUTCHours(0, 0, 0, 0);
L.TimeDimension.Util.addTimeDuration(endDate, "P3D", true);

var map = L.map('map', {
    zoom: 6,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionOptions: {
        timeInterval: "P1M/" + endDate.toISOString(),
        period: "P1D"
    },
    timeDimensionControl: true,
    center: [39.0, 2.5]
});

var wmopWMS = "https://thredds.socib.es/thredds/wms/operational_models/oceanographical/hydrodynamics/model_run_aggregation/wmop_surface/wmop_surface_best.ncd";

var heigthLayer = L.tileLayer.wms(wmopWMS, {
    layers: 'zeta',
    format: 'image/png',
    transparent: true,
    colorscalerange: '-0.7,-0.1',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 100,
    styles: 'default-scalar/div-RdBu-inv'
});
var heigthContourLayer = L.tileLayer.wms(wmopWMS, {
    layers: 'zeta',
    format: 'image/png',
    transparent: true,
    colorscalerange: '-0.7,-0.1',
    numcontours: 11,
    styles: 'contours'
});

var velocityLayer = L.nonTiledLayer.wms(wmopWMS, {
    layers: 'u:v-group',
    format: 'image/png',
    transparent: true,
    colorscalerange: '0,1',
    styles: 'sized_arrows'
});

var heightTimeLayer = L.timeDimension.layer.wms(heigthLayer, {
    updateTimeDimension: true,
});
var heightContourTimeLayer = L.timeDimension.layer.wms(heigthContourLayer, {
    updateTimeDimension: false,
});
var velocityTimeLayer = L.timeDimension.layer.wms(velocityLayer, {
    updateTimeDimension: false,
});

var overlayMaps = {
    "WMOP - Sea surface height": heightTimeLayer,
    "WMOP - Sea surface height (Contour)": heightContourTimeLayer,
    "WMOP - Surface sea water velocity": velocityTimeLayer
};

// Legends
var heigthLegend = L.control({
    position: 'bottomright'
});
heigthLegend.onAdd = function(map) {
    var src = wmopWMS + "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYERS=zeta&STYLES=default-scalar/div-RdBu-inv&colorscalerange=-0.7,-0.1&numcolorbands=100&transparent=TRUE&FORMAT=image/png";
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
    div.innerHTML += '<img src="img/black-arrow.png" /> Surface<br/>sea water velocity';
    return div;
};


map.on('overlayadd', function(eventLayer) {
    if (eventLayer.name == 'WMOP - Sea surface height') {
        heigthLegend.addTo(this);
    } else if (eventLayer.name == 'WMOP - Surface sea water velocity') {
        velocityLegend.addTo(this);
    }
});

map.on('overlayremove', function(eventLayer) {
    if (eventLayer.name == 'WMOP - Sea surface height') {
        map.removeControl(heigthLegend);
    } else if (eventLayer.name == 'WMOP - Surface sea water velocity') {
        map.removeControl(velocityLegend);
    }
});

var baseLayers = getCommonBaseLayers(map); // see baselayers.js
L.control.layers(baseLayers, overlayMaps).addTo(map);

heightTimeLayer.addTo(map);
heightContourTimeLayer.addTo(map);
velocityTimeLayer.addTo(map);
