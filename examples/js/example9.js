var startDate = new Date();
startDate.setUTCHours(0, 0, 0, 0);

var map = L.map('map', {
    zoom: 12,
    fullscreenControl: true,
    timeDimensionControl: true,
    timeDimensionControlOptions: {
        position: 'bottomleft',
        autoPlay: true,
        playerOptions: {
            transitionTime: 500,
            loop: true,
        }
    },
    timeDimension: true,
    timeDimensionOptions: {
        period: "PT5M",
    },
    center: [39.3, 4]
});

// Add OSM and emodnet bathymetry to map
var osmLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
});
var bathymetryLayer = L.tileLayer.wms("http://admin.n4m5.eu/geoserver/wms", {
    layers: 'emodnet:mean_singlecolour',
    format: 'image/png',
    transparent: true,
    attribution: "Emodnet bathymetry",
    opacity: 0.3
});
var bathymetryLayer2 = L.tileLayer.wms("http://admin.n4m5.eu/geoserver/wms", {
    layers: 'emodnet:mean_singlecolour',
    format: 'image/png',
    transparent: true,
    attribution: "Emodnet bathymetry",
    opacity: 0.3
});

var osmBathymetry = L.layerGroup([osmLayer, bathymetryLayer2]);
osmBathymetry.addTo(map);
var baseMaps = {
    "Emodnet bathymetry": bathymetryLayer,
    "Emodnet bathymetry + OSM": osmBathymetry
};

L.control.coordinates({
    position: "bottomright",
    decimals: 3,
    labelTemplateLat: "Latitude: {y}",
    labelTemplateLng: "Longitude: {x}",
    useDMS: true,
    enableUserInput: false
}).addTo(map);

var gpxLayer = omnivore.gpx('data/run.gpx');
var gpxLayer = omnivore.gpx('data/running_mallorca.gpx').on('ready', function() {
    map.fitBounds(gpxLayer.getBounds(), {
        paddingBottomRight: [40, 40]
    });
});
var gpxTimeLayer = L.timeDimension.layer.geoJson(gpxLayer, {
    updateTimeDimension: true,
    addlastPoint: true
});
var kmlLayer = omnivore.kml('data/easy_currents_track.kml');
var kmlTimeLayer = L.timeDimension.layer.geoJson(kmlLayer, {
    updateTimeDimension: true,
    addlastPoint: true
});


var overlayMaps = {
    "GPX Layer": gpxTimeLayer,
    "KML Layer": kmlTimeLayer
};

L.control.layers(baseMaps, overlayMaps).addTo(map);
gpxTimeLayer.addTo(map);