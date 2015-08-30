var endDate = new Date();
endDate.setUTCMinutes(0, 0, 0);

var map = L.map('map', {
    zoom: 4,
    fullscreenControl: true,
    center: [38.0, -90.50],
    timeDimension: true,
    timeDimensionControl: true,
    timeDimensionControlOptions: {
            autoPlay: true,
            playerOptions: {
                buffer: 10,
                transitionTime: 500,
                loop: true
            }
        },
//    updateTimeDimension: true
    timeDimensionOptions: {
        timeInterval: "PT2H/" + endDate.toISOString(),
        period: "PT5M"
    },
    loop: true
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var testWMS = "http://new.nowcoast.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer"
var testLayer = L.nonTiledLayer.wms(testWMS, {
    layers: '1',
    format: 'image/png',
    transparent: true, 
    attribution: 'KNMI'
});
var testTimeLayer = L.timeDimension.layer.wms(testLayer);
testTimeLayer.addTo(map);

var testLegend = L.control({
    position: 'topright'
});
var firstLoad = true;
testLegend.onAdd = function(map) {
testLegend.onAdd = function(map) {
   if(firstLoad){
    var src = "http://new.nowcoast.noaa.gov/images/legends/radar.png";
    var div = L.DomUtil.create('div', 'info legend');
    div.style.width = '265px';
    div.style.height = '280px';
    div.style['background-image'] = 'url(' + src + ')';
    firstLoad = false;
    return div;
    }else{
    }
};
testLegend.addTo(map);

L.control.coordinates({
    position: "bottomright",
    decimals: 3,
    labelTemplateLat: "Latitude: {y}",
    labelTemplateLng: "Longitude: {x}",
    useDMS: true,
    enableUserInput: true
}).addTo(map);