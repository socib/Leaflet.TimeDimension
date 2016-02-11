L.TimeDimension.Layer.CDrift = L.TimeDimension.Layer.GeoJson.extend({

    // CDrift data has property time in seconds, not in millis.
    _getFeatureTimes: function(feature) {
        if (!feature.properties) {
            return [];
        }
        if (feature.properties.hasOwnProperty('coordTimes')) {
            return feature.properties.coordTimes;
        }
        if (feature.properties.hasOwnProperty('times')) {
            return feature.properties.times;
        }
        if (feature.properties.hasOwnProperty('linestringTimestamps')) {
            return feature.properties.linestringTimestamps;
        }
        if (feature.properties.hasOwnProperty('time')) {
            return [feature.properties.time * 1000];
        }
        return [];
    },

    // Do not modify features. Just return the feature if it intersects
    // the time interval
    _getFeatureBetweenDates: function(feature, minTime, maxTime) {
        var featureStringTimes = this._getFeatureTimes(feature);
        if (featureStringTimes.length == 0) {
            return feature;
        }
        var featureTimes = [];
        for (var i = 0, l = featureStringTimes.length; i < l; i++) {
            var time = featureStringTimes[i]
            if (typeof time == 'string' || time instanceof String) {
                time = Date.parse(time.trim());
            }
            featureTimes.push(time);
        }

        if (featureTimes[0] > maxTime || featureTimes[l - 1] < minTime) {
            return null;
        }
        return feature;
    },

});

L.timeDimension.layer.cDrift = function(layer, options) {
    return new L.TimeDimension.Layer.CDrift(layer, options);
};

var startDate = new Date();
startDate.setUTCHours(0, 0, 0, 0);

var map = L.map('map', {
    zoom: 8,
    fullscreenControl: true,
    timeDimensionControl: true,
    timeDimensionControlOptions: {
        position: 'bottomleft',
        autoPlay: true,
        timeSlider: false,
        loopButton: true,
        playerOptions: {
            transitionTime: 125,
            loop: true,
        }
    },
    timeDimension: true,
    center: [39.6145, 1.99363]
});

L.control.coordinates({
    position: "bottomright",
    decimals: 3,
    labelTemplateLat: "Latitude: {y}",
    labelTemplateLng: "Longitude: {x}",
    useDMS: true,
    enableUserInput: false
}).addTo(map);

$.getJSON('data/spill.json', function(data) {
    var cdriftLayer = L.geoJson(data, {
        style: function(feature) {
            var color = "#FFF";
            if (feature.properties.confidence == '0.9') {
                color = "#FF0000";
            } else if (feature.properties.confidence == '0.75') {
                color = "#FFFF00";
            } else if (feature.properties.confidence == '0.5') {
                color = "#00FF00";
            }
            return {
                "color": color,
                "weight": 2,
                "opacity": 0.4
            };
        }
    });

    var cdriftTimeLayer = L.timeDimension.layer.cDrift(cdriftLayer, {
        updateTimeDimension: true,
        updateTimeDimensionMode: 'replace',
        addlastPoint: false,
        duration: 'PT20M',
    });
    cdriftTimeLayer.addTo(map);
    map.fitBounds(cdriftLayer.getBounds());

    var cDriftLegend = L.control({
        position: 'bottomright'
    });
    cDriftLegend.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'info legend');
        div.innerHTML += '<ul><li class="p05">50% probability</li><li class="p075">75% probability</li><li class="p09">90% probability</li></ul>';
        return div;
    };
    cDriftLegend.addTo(map);

    map.timeDimension.on('timeload', function(data) {
        var date = new Date(map.timeDimension.getCurrentTime());
        if (data.time == map.timeDimension.getCurrentTime()) {
            var totalTimes = map.timeDimension.getAvailableTimes().length;
            var position = map.timeDimension.getAvailableTimes().indexOf(data.time);
            $(map.getContainer()).find('.animation-progress-bar').width((position*100)/totalTimes + "%");
            // update map bounding box
            map.fitBounds(cdriftTimeLayer.getBounds());
        }
    });

});

var sorrento = L.circleMarker([39.6145, 1.99363], {
    color: '#FFFFFF',
    fillColor: "#f28f43",
    fillOpacity: 1,
    radius: 5,
    weight: 2
}).addTo(map);

var baseLayers = getCommonBaseLayers(map); // see baselayers.js
L.control.layers(baseLayers, {}).addTo(map);
