var startDate = new Date();
startDate.setUTCHours(0, 0, 0, 0);

var map = L.map('map', {
    zoom: 8,
    fullscreenControl: true,
    timeDimensionControl: true,
    timeDimensionControlOptions: {
        position: 'bottomleft',
        playerOptions: {
            transitionTime: 1000,
        }
    },
    timeDimension: true,
    center: [39.3, 2.9]
});

var sapoWMS = "https://thredds.socib.es/thredds/wms/operational_models/oceanographical/wave/model_run_aggregation/sapo_ib/sapo_ib_best.ncd";
var sapoHeightLayer = L.nonTiledLayer.wms(sapoWMS, {
    layers: 'significant_wave_height',
    format: 'image/png',
    transparent: true,
    colorscalerange: '0,3',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 253,
    styles: 'default-scalar/scb_bugnylorrd'
});

var sapoMeanDirectionLayer = L.nonTiledLayer.wms(sapoWMS, {
    layers: 'average_wave_direction',
    format: 'image/png',
    transparent: true,
    styles: 'meteorological_arrows/greyscale'
});

var sapoPeakDirectionLayer = L.nonTiledLayer.wms(sapoWMS, {
    layers: 'direction_of_the_peak_of_the_spectrum',
    format: 'image/png',
    transparent: true,
    styles: 'meteorological_arrows/greyscale',
    opacity: 0.5
});

var markers = [{
    name: 'Sa Dragonera',
    position: [39.555, 2.102],
    platformName: 'Buoy at Sa Dragonera',
    platform: 18,
    instrument: 68,
    variable: 17
}, {
    name: 'Alcúdia',
    position: [39.8, 3.216]
}, {
    name: 'Palma',
    position: [39.492847, 2.700405],
    platformName: 'Buoy at Palma Bay',
    platform: 143,
    instrument: 296,
    variable: 90047
}, {
    name: 'Ciutadella',
    position: [39.976, 3.761]
}, {
    name: 'Ibiza Channel',
    platformName: 'Buoy at Ibiza Channel',
    position: [38.82445, 0.783667],
    platform: 146,
    instrument: 314,
    variable: 90047
}];

var sapoHeightTimeLayer = L.timeDimension.layer.wms.timeseries(sapoHeightLayer, {
    updateTimeDimension: true,
    markers: markers,
    name: "Significant wave height",
    units: "m",
    enableNewMarkers: true
});

var sapoMeanDirectionTimeLayer = L.timeDimension.layer.wms(sapoMeanDirectionLayer);
var sapoPeakDirectionTimeLayer = L.timeDimension.layer.wms(sapoPeakDirectionLayer);

var sapoLegend = L.control({
    position: 'bottomright'
});
sapoLegend.onAdd = function(map) {
    var src = sapoWMS + "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYERS=significant_wave_height&STYLES=default-scalar/scb_bugnylorrd&COLORSCALERANGE=0,3&NUMCOLORBANDS=253&FORMAT=image/png";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend" style="height: 280px">';
    return div;
};

var sapoMeanDirectionLegend = L.control({
    position: 'bottomright'
});
sapoMeanDirectionLegend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML += '<img src="img/black-arrow.png" /> mean direction';
    return div;
};

var sapoPeakDirectionLegend = L.control({
    position: 'bottomright'
});
sapoPeakDirectionLegend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML += '<img src="img/grey-arrow.png" /> peak direction';
    return div;
};

var overlayMaps = {
    "SAPO - significant wave height": sapoHeightTimeLayer,
    "SAPO - average wave direction": sapoMeanDirectionTimeLayer,
    "SAPO - direction of the peak": sapoPeakDirectionTimeLayer
};

map.on('overlayadd', function(eventLayer) {
    if (eventLayer.name == 'SAPO - significant wave height') {
        sapoLegend.addTo(this);
    } else if (eventLayer.name == 'SAPO - average wave direction') {
        sapoMeanDirectionLegend.addTo(this);
    } else if (eventLayer.name == 'SAPO - direction of the peak') {
        sapoPeakDirectionLegend.addTo(this);
    }
});

map.on('overlayremove', function(eventLayer) {
    if (eventLayer.name == 'SAPO - significant wave height') {
        map.removeControl(sapoLegend);
    } else if (eventLayer.name == 'SAPO - average wave direction') {
        map.removeControl(sapoMeanDirectionLegend);
    } else if (eventLayer.name == 'SAPO - direction of the peak') {
        map.removeControl(sapoPeakDirectionLegend);
    }
});

var baseLayers = getCommonBaseLayers(map); // see baselayers.js
L.control.layers(baseLayers, overlayMaps).addTo(map);

sapoHeightTimeLayer.addTo(map);
sapoPeakDirectionTimeLayer.addTo(map);
sapoMeanDirectionTimeLayer.addTo(map);