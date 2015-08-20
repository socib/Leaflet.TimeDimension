var map = L.map('map', {
    zoom: 10,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionOptions: {
        timeInterval: "2014-09-30/2014-10-30",
        period: "PT1H",
        currentTime: Date.parse("2014-09-30T09:00:00Z")
    },
    timeDimensionControl: true,
    timeDimensionControlOptions: {
        autoPlay: true,
        playerOptions: {
            buffer: 0,
            transitionTime: 250,
            loop: true,
        }
    },
    center: [38.705, 1.15],
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var testWMS = "http://thredds.socib.es/thredds/wms/observational/hf_radar/hf_radar_ibiza-scb_codarssproc001_aggregation/dep0001_hf-radar-ibiza_scb-codarssproc001_L1_agg.nc"
var testLayer = L.nonTiledLayer.wms(testWMS, {
    layers: 'sea_water_velocity',
    version: '1.3.0',
    format: 'image/png',
    transparent: true,
    styles: 'prettyvec/rainbow',
    markerscale: 15,
    markerspacing: 10,
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    colorscalerange: "0,0.4",
    attribution: 'SOCIB HF RADAR | sea_water_velocity'
});
var proxy = 'server/proxy.php';
var testTimeLayer = L.timeDimension.layer.wms(testLayer, {
    proxy: proxy,
    updateTimeDimension: true,
});
testTimeLayer.addTo(map);

var testLegend = L.control({
    position: 'topright'
});
testLegend.onAdd = function(map) {
    var src = testWMS + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=sea_water_velocity&PALETTE=rainbow&colorscalerange=0,0.4";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend">';
    return div;
};
testLegend.addTo(map);