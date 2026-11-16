var endDate = new Date();
endDate.setUTCMinutes(0, 0, 0);

var map = L.map('map', {
    zoom: 7,
    fullscreenControl: true,
    center: [52.0, 3.50],
    timeDimension: true,
    timeDimensionControl: true,
    timeDimensionOptions: {
        timeInterval: "P2W/" + endDate.toISOString(),
        period: "PT5M"
    },
    timeDimensionControlOptions: {
        playerOptions: {
            transitionTime: 250,
        }
    }
});

L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


// https://geoservices.knmi.nl/adagucserver?dataset=RADAR&service=WMS&request=GetCapabilities
var testWMS = "https://geoservices.knmi.nl/adagucserver?dataset=RADAR";
var testLayer = L.nonTiledLayer.wms(testWMS, {
    layers: 'RAD_NL25_PCP_CM',
    format: 'image/png',
    transparent: true,
    attribution: 'KNMI'
});
var testTimeLayer = L.timeDimension.layer.wms(testLayer);
testTimeLayer.addTo(map);

var testLegend = L.control({
    position: 'topright'
});
testLegend.onAdd = function(map) {
    var src = testWMS + "&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=RAD_NL25_PCP_CM&FORMAT=image/png&STYLE=radar/nearest";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML += '<img src="' + src + '" alt="legend" style="height: 240px">';
    return div;
};
testLegend.addTo(map);
