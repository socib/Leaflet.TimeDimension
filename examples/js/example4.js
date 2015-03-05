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
    }
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


// http://geoservices.knmi.nl/adaguc_portal/?srs=EPSG%3A28992&bbox=-47780.898876404506,300000,342780.8988764045,630000&service=http%253A%252F%252Fgeoservices.knmi.nl%252Fcgi-bin%252FRADNL_OPER_R___25PCPRR_L3.cgi%253F&layer=RADNL_OPER_R___25PCPRR_L3_COLOR%2524image%252Fpng%2524true%2524default%25241%25240&selected=0&dims=time$current&baselayers=world_raster$nl_world_line
var testWMS = "http://geoservices.knmi.nl/cgi-bin/RADNL_OPER_R___25PCPRR_L3.cgi"
var testLayer = L.nonTiledLayer.wms(testWMS, {
    layers: 'RADNL_OPER_R___25PCPRR_L3_COLOR',
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
    var src = testWMS + "?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&LAYER=RADNL_OPER_R___25PCPRR_L3_COLOR&format=image/png&STYLE=default";
    var div = L.DomUtil.create('div', 'info legend');
    div.style.width = '65px';
    div.style.height = '280px';
    div.style['background-image'] = 'url(' + src + ')';
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