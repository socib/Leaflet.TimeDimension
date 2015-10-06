var map = L.map('map', {
    zoom: 4,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    timeDimensionOptions: {
        // times: "2014-12-01T06:00:00Z,2014-12-01T09:00:00Z,2014-12-01T12:00:00Z,2014-12-01T15:00:00Z,2014-12-01T18:00:00Z,2014-12-01T21:00:00Z,2014-12-02T00:00:00Z,2014-12-02T03:00:00Z,2014-12-02T06:00:00Z,2014-12-02T09:00:00Z,2014-12-02T12:00:00Z,2014-12-02T15:00:00Z,2014-12-02T18:00:00Z,2014-12-02T21:00:00Z,2014-12-03T00:00:00Z,2014-12-03T03:00:00Z,2014-12-03T06:00:00Z,2014-12-03T09:00:00Z,2014-12-03T12:00:00Z,2014-12-03T15:00:00Z,2014-12-03T18:00:00Z,2014-12-03T21:00:00Z,2014-12-04T00:00:00Z,2014-12-04T03:00:00Z,2014-12-04T06:00:00Z,2014-12-04T12:00:00Z,2014-12-04T18:00:00Z,2014-12-05T00:00:00Z,2014-12-05T06:00:00Z,2014-12-05T12:00:00Z,2014-12-05T18:00:00Z,2014-12-06T00:00:00Z,2014-12-06T06:00:00Z,2014-12-06T12:00:00Z,2014-12-06T18:00:00Z,2014-12-07T00:00:00Z,2014-12-07T06:00:00Z,2014-12-07T12:00:00Z,2014-12-07T18:00:00Z,2014-12-08T00:00:00Z,2014-12-08T06:00:00Z,2014-12-08T12:00:00Z,2014-12-08T18:00:00Z,2014-12-09T00:00:00Z,2014-12-09T06:00:00Z,2014-12-09T12:00:00Z,2014-12-09T18:00:00Z,2014-12-10T00:00:00Z,2014-12-10T06:00:00Z"        
    },
    center: [45.3, 0.9],
});


// https://ogcie.iblsoft.com/metocean/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities
var testWMS = "https://ogcie.iblsoft.com/metocean/wms"
L.tileLayer.wms(testWMS, {
    layers: 'foreground-lines',
    format: 'image/png',
    transparent: true,
    crs: L.CRS.EPSG4326
}).addTo(map);

var testLayer = L.tileLayer.wms(testWMS, {
    layers: 'gfs-temperature-isbl', // isobaric levels, or -agl for above ground levels
    format: 'image/png',
    transparent: true,
    opacity: 0.3,
    crs: L.CRS.EPSG4326,
    attribution: 'OGC MetOcean DWG Best Practice Example, IBL Software Engineering'
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
    var src = testWMS + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=gfs-temperature-isbl&STYLE=default";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend">';
    return div;
};
testLegend.addTo(map);
