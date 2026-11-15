var map = L.map('map', {
    zoom: 10,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionOptions: {
        timeInterval: "2015-09-01/2015-09-03",
        period: "PT1H",
        currentTime: Date.parse("2015-09-01T00:00:00Z")
    },
    timeDimensionControl: true,
    timeDimensionControlOptions: {
        autoPlay: true,
        loopButton: true,
        timeSteps: 1,
        playReverseButton: true,
        limitSliders: true,
        playerOptions: {
            buffer: 0,
            transitionTime: 250,
            loop: true,
        }
    },
    center: [38.705, 1.15],
});

L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var testWMS = "https://thredds.socib.es/thredds/wms/observational/hf_radar/hf_radar_ibiza-scb_codarssproc001_L1_agg/hf_radar_ibiza-scb_codarssproc001_L1_agg_best.ncd"
var testLayer = L.nonTiledLayer.wms(testWMS, {
    layers: 'U:V-group',
    version: '1.3.0',
    format: 'image/png',
    transparent: true,
    styles: 'colored_sized_arrows/rainbow',
    abovemaxcolor: "extend",
    belowmincolor: "extend",
    colorscalerange: "0,0.4",
    attribution: 'SOCIB HF Radar'
});
var testTimeLayer = L.timeDimension.layer.wms(testLayer, {
    updateTimeDimension: true
});
testTimeLayer.addTo(map);

var testLegend = L.control({
    position: 'topright'
});
testLegend.onAdd = function(map) {
    var src = testWMS + "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetLegendGraphic&LAYERS=U:V-mag&STYLES=default-scalar/rainbow&COLORSCALERANGE=0,0.4&FORMAT=image/png";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend">';
    return div;
};
testLegend.addTo(map);

$('#dtp_start').datetimepicker({
    inline: true,
    value: new Date('2015-09-01'),
    format: "c"
});
$('#dtp_end').datetimepicker({
    inline: true,
    value: new Date('2015-09-03'),
    format: "c"
});

$("#btn_timerange").click(function(){
    var startTime = new Date($('#dtp_start').val());
    var endTime = new Date($('#dtp_end').val());
    var newAvailableTimes = L.TimeDimension.Util.explodeTimeRange(startTime, endTime, 'PT1H');
    map.timeDimension.setAvailableTimes(newAvailableTimes, 'replace');
    map.timeDimension.setCurrentTime(startTime);
});

$("#btn_limitrange").click(function(){
    var startTime = new Date($('#dtp_start').val());
    var endTime = new Date($('#dtp_end').val());
    map.timeDimension.setLowerLimit(startTime);
    map.timeDimension.setUpperLimit(endTime);
    map.timeDimension.setCurrentTime(startTime);
});