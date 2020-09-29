var endDate = new Date();
endDate.setUTCMinutes(0, 0, 0);

var map = L.map('map', {
    zoom: 4,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    timeDimensionOptions:{
        timeInterval: "PT4H/" + endDate.toISOString(),
        period: "PT4M",
        currentTime: endDate
    },

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

L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var wmsUrl = "https://nowcoast.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer"
var radarWMS = L.nonTiledLayer.wms(wmsUrl, {
    layers: '1',
    format: 'image/png',
    transparent: true,
    opacity: 0.8,
    attribution: 'nowCOAST'
});

var testTimeLayer = L.timeDimension.layer.wms(radarWMS, {
    updateTimeDimension: false,
    wmsVersion: '1.3.0'
});
testTimeLayer.addTo(map);

var theLegend = L.control({
    position: 'topright'
});

theLegend.onAdd = function(map) {
    var src = "https://nowcoast.noaa.gov/images/legends/radar.png";
    var div = L.DomUtil.create('div', 'info legend');
    div.style.width = '270px';
    div.style.height = '50px';
    div.innerHTML += '<b>Legend</b><br><img src="' + src + '" alt="legend">';
    return div;
};
theLegend.addTo(map);