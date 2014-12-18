
var map = L.map('map', {
    zoom: 2,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionOptions:{
        timeInterval: "2006-01/2099-12",
        period: "P1M"
    },
    timeDimensionControl: true,
    timeDimensionControlOptions:{
        timeSteps: 12
    },    
    center: [20.0, 0.0],
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'    
}).addTo(map);

var proxy = 'server/proxy.php';
var testWMS = "http://glues.pik-potsdam.de:8080/thredds/wms/pik_wcrp_cmip3/ncar_pcm1_sresb1_2006-2099_tmp.nc"
var testLayer = L.tileLayer.wms(testWMS, {
    layers: 'tmp',
    format: 'image/png',
    transparent: true,
    attribution: '<a href="https://www.pik-potsdam.de/">PIK</a>'
});
var testTimeLayer = L.timeDimension.layer.wms(testLayer, {proxy: proxy});
testTimeLayer.addTo(map);

var testLegend = L.control({
    position: 'topright'
});
testLegend.onAdd = function(map) {
    var src = testWMS + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=tmp&PALETTE=tmp";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend">';
    return div;
};
testLegend.addTo(map);

L.control.coordinates({
    position: "bottomright",
    decimals: 3,
    labelTemplateLat: "Latitude: {y}",
    labelTemplateLng: "Longitude: {x}",
    useDMS: true,
    enableUserInput: false
}).addTo(map);