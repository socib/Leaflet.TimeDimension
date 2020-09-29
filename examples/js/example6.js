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
    timeDimensionOptions: {
        timeInterval: "2020-09-25/2020-09-30",
        period: "PT1H",
        currentTime: Date.parse("2020-09-25T12:00:00Z")
    },
    center: [39.3, 2.9]
});

var sapoWMS = "https://thredds.socib.es/thredds/wms/operational_models/oceanographical/wave/model_run_aggregation/sapo_ib/sapo_ib_best.ncd";
var sapoHeightLayer = L.tileLayer.wms(sapoWMS, {
    layers: 'significant_wave_height',
    format: 'image/png',
    transparent: true,
    colorscalerange: '0,3',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    numcolorbands: 100,
    styles: 'areafill/scb_bugnylorrd'
        // styles: 'areafill/scb_greens'
});

var sapoMeanDirectionLayer = L.nonTiledLayer.wms(sapoWMS, {
    layers: 'average_wave_direction',
    format: 'image/png',
    transparent: true,
    colorscalerange: '1,1',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    markerscale: 15,
    markerspacing: 12,
    markerclipping: true,
    styles: 'prettyvec/greyscale'
});

var sapoPeakDirectionLayer = L.nonTiledLayer.wms(sapoWMS, {
    layers: 'direction_of_the_peak_of_the_spectrum',
    format: 'image/png',
    transparent: true,
    colorscalerange: '0,2',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    markerscale: 15,
    markerspacing: 12,
    markerclipping: true,
    styles: 'prettyvec/greyscale'
});

var proxy = 'server/proxy.php';
var sapoHeightTimeLayer = L.timeDimension.layer.wms(sapoHeightLayer, {
    proxy: proxy,
    updateTimeDimension: false
});

var sapoMeanDirectionTimeLayer = L.timeDimension.layer.wms(sapoMeanDirectionLayer, {
    proxy: proxy
});
var sapoPeakDirectionTimeLayer = L.timeDimension.layer.wms(sapoPeakDirectionLayer, {
    proxy: proxy
});

var sapoLegend = L.control({
    position: 'bottomright'
});
sapoLegend.onAdd = function(map) {
    var src = sapoWMS + "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYER=significant_wave_height&colorscalerange=0,3&PALETTE=scb_bugnylorrd&numcolorbands=100&transparent=TRUE";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend">';
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