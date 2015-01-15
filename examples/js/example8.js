L.TimeDimension.Layer.DrifterDeployment = L.TimeDimension.Layer.GeoJson.extend({

    initialize: function(layer, options) {
        layer = L.geoJson();
        L.TimeDimension.Layer.GeoJson.prototype.initialize.call(this, layer, options);
        this._id_platform = this.options.id_platform;
        this._id_deployment = this.options.id_deployment;
    },

    onAdd: function(map) {
        L.TimeDimension.Layer.prototype.onAdd.call(this, map);
        var proxy = "server/proxy-datadiscovery.php";
        var url = "http://apps.socib.es/DataDiscovery/deployment-info?" +
            "id_platform=" + this._id_platform + "&id_deployment=" + this._id_deployment +
            "&sample=50";
        $.getJSON(proxy + '?url=' + encodeURIComponent(url), (function(map, data) {
            this._baseLayer = this._createLayer(data);
            this._onReadyBaseLayer();
        }.bind(this, map)));
    },

    _createLayer: function(featurecollection) {
        // lastPosition
        this._color = this._pickRandomColor();


        this._icon = L.icon({
            iconUrl: 'img/surface-drifter.png',
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        });

        var layer = L.geoJson(null, {
            pointToLayer: (function(feature, latLng) {
                if (feature.properties.hasOwnProperty('last')) {
                    return new L.Marker(latLng, {
                        icon: this._icon
                    });
                }
                return L.circleMarker(latLng, {
                    fillColor: this._color,
                    fillOpacity: 0.5,
                    stroke: false,
                    radius: 3
                });
            }).bind(this),
            style: (function(feature) {
                return {
                    "color": this._color,
                    "weight": 2,
                    "opacity": 1
                };
            }).bind(this)
        });
        if (!featurecollection.features) {
            return layer;
        }
        layer.addData(featurecollection.features[0]);
        for (var i = 1, l = featurecollection.features.length; i < l; i++) {
            var point = featurecollection.features[i];
            // fix Point
            if (point.geometry.type == 'point') {
                point.geometry.type = 'Point';
            }
            layer.addData(point);
        }
        // save last point
        this._lastPoint = featurecollection.features[featurecollection.features.length - 1];
        return layer;
    },

    _pickRandomColor: function() {
        var colors = ["#00aaff", "#ffaa00", "#ff00aa", "#ff0000", "#00ffaa", "#00ff00", "#0000ff", "#aa00ff", "#aaff00"];
        var index = Math.floor(Math.random() * colors.length);
        return colors[index];
    },

    _addDeploymentTrajectory: function(layer, trajectory_feature) {
        // remove the old one
        if (this._deploymentTrajectory) {
            layer.removeLayer(this._deploymentTrajectory);
        }
        var getStyle = (function(feature) {
            return {
                "color": this._color,
                "weight": 2,
                "opacity": 1
            };
        }).bind(this);
        var deploymentTrajectory = L.geoJson(trajectory_feature, {
            style: getStyle
        });
        // deploymentTrajectory.on('click', deployment.popupFunction.bind(this, deployment, undefined));
        deploymentTrajectory.addTo(layer);
        // save for later
        this._deploymentTrajectory = deploymentTrajectory;
    },

    _addDeploymenPoint: function(layer, point, isLastPoint) {
        var deploymentPoint = L.geoJson(point, {
            pointToLayer: (function(feature, latLng) {
                if (isLastPoint) {
                    return new L.Marker(latLng, {
                        icon: this._icon
                    });
                } else {
                    return L.circleMarker(latLng, {
                        fillColor: this._color,
                        fillOpacity: 0.5,
                        stroke: false,
                        radius: 3
                    });
                }
            }).bind(this)
        });
        // deploymentPoint.on('click', deployment.popupFunction.bind(this, deployment, point));
        deploymentPoint.addTo(layer);
        if (isLastPoint)
            this._lastPoint = deploymentPoint;
    }


});

L.timeDimension.layer.drifterDeployment = function(options) {
    return new L.TimeDimension.Layer.DrifterDeployment(null, options);
};



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
            buffer: 10,            
            transitionTime: 500,
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
    format: 'image/png',
    transparent: true,
    styles: 'prettyvec/mpl_reds',
    markerscale: 15,
    markerspacing: 6,
    numcolorbands: 10,
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
    var src = testWMS + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=sea_water_velocity&PALETTE=mpl_reds&numcolorbands=10&colorscalerange=0,0.4";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend">';
    return div;
};
testLegend.addTo(map);

var drifters = [
    [243, 416],
    [244, 417],
    [245, 418],
    [246, 419],
    [248, 421],
    [249, 422],
    [162, 423],
    [161, 424],
    [250, 425],
    [253, 427],
    [252, 428]
];

for (var i = 0, l = drifters.length; i < l; i++) {
    var drifterLayer = L.timeDimension.layer.drifterDeployment({
        id_platform: drifters[i][0],
        id_deployment: drifters[i][1],
        duration: "P1D",
        addlastPoint: true
    });
    drifterLayer.addTo(map);
}