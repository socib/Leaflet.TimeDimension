var map = L.map('map', {
    zoom: 4,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    timeDimensionControlOptions: {
        autoPlay: false,
        playerOptions: {
            buffer: 10,
            transitionTime: 250,
            loop: true,
        }
    },
    center: [38.0, -90.50],
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var wmsUrl = "http://new.nowcoast.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer"
var radarWMS = L.nonTiledLayer.wms(wmsUrl, {
    layers: '1',
    format: 'image/png',
    transparent: true,
    opacity: 0.8,
    attribution: 'nowCOAST'
});

var proxy = 'server/proxy.php';
var testTimeLayer = L.timeDimension.layer.wms(radarWMS, {
    proxy: proxy,
    updateTimeDimension: true,
});
testTimeLayer.addTo(map);

var theLegend = L.control({
    position: 'topright'
});

theLegend.onAdd = function(map) {
    var src = "http://new.nowcoast.noaa.gov/images/legends/radar.png";
    var div = L.DomUtil.create('div', 'info legend');
    div.style.width = '270px';
    div.style.height = '50px';
    div.innerHTML += '<b>Legend</b><br><img src="' + src + '" alt="legend">';
    return div;
};
theLegend.addTo(map);