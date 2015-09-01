/*
 * L.TimeDimension.Layer.WMS.TimeSeries: create timeseries for specific locations
 */

L.TimeDimension.Layer.WMS.TimeSeries = L.TimeDimension.Layer.WMS.extend({

    initialize: function(layer, options) {
        this._markers = options.markers || [];
        this._markerColors = options.markerColors || ["#2f7ed8", "#0d233a", "#8bbc21", "#910000", "#1aadce", "#492970", "#f28f43", "#77a1e5", "#c42525", "#a6c96a"];
        this._name = options.name || "";
        this._defaultRangeSelector = options.defaultRangeSelector || 1;
        this._enableNewMarkers = options.enableNewMarkers || false;
        this._chartOptions = options.chartOptions || {};

        this._currentMarkerColor = 0;

        L.TimeDimension.Layer.WMS.prototype.initialize.call(this, layer, options);
        if (options.units) {
            this._units = options.units;
        } else {
            this._loadUnits();
        }
        this._circleLabelMarkers = [];        
    },

    addTo: function(map) {
        L.TimeDimension.Layer.WMS.prototype.addTo.call(this, map);
        if (this._enableNewMarkers && this._enabledNewMarkers === undefined) {
            this._enabledNewMarkers = true;
            this._map.doubleClickZoom.disable();            
            this._map.on('dblclick', (function(e) {
                // e.originalEvent.preventDefault();
                this.addPositionMarker({
                    position: [e.latlng.lat, e.latlng.lng]
                });
                return false;
            }).bind(this));
        }
        return this;
    },

    eachLayer: function(method, context) {
        for (var i = 0, l = this._circleLabelMarkers.length; i < l; i++) {
            method.call(context, this._circleLabelMarkers[i]);
        }
        return L.TimeDimension.Layer.WMS.prototype.eachLayer.call(this, method, context);
    },

    onRemove: function(map){
        if (this._chart){
            this._chart.destroy();
            delete this._chart;
        }
        return L.TimeDimension.Layer.WMS.prototype.onRemove.call(this, map);
    },


    // we need to overwrite this function, which is called when the layer has availabletimes loaded, 
    // in order to initialize dates ranges (current min-max and layer min-max date ranges) and after that
    // add the default markers to the map
    _updateTimeDimensionAvailableTimes: function() {
        L.TimeDimension.Layer.WMS.prototype._updateTimeDimensionAvailableTimes.call(this);
        if (this._dateRange === undefined) {
            this._setDateRanges();
            this._addMarkers();
        }        
    },

    _getNextMarkerColor: function() {
        return this._markerColors[this._currentMarkerColor++ % this._markerColors.length];
    },

    _addMarkers: function() {
        for (var i = 0, l = this._markers.length; i < l; i++) {
            this.addPositionMarker(this._markers[i]);
        }
    },

    addPositionMarker: function(point) {
        if (!this._map) {
            return;
        }
        var color = this._getNextMarkerColor();
        var circle = L.circleMarker([point.position[0], point.position[1]], {
            color: '#FFFFFF',
            fillColor: color,
            fillOpacity: 0.8,
            radius: 5,
            weight: 2
        }).addTo(this._map);

        var afterLoadData = function(color, data) {
            var serie = this._showData(color, data, point.name);
            var marker = L.timeDimension.layer.circleLabelMarker(circle, {
                serieId: serie,
                dataLayer: this._currentLayer,
                proxy: this._proxy
            })
            this._circleLabelMarkers.push(marker);
            marker.addTo(this._map);
            if (this._chart) {
                this._chart.hideLoading();
            }
        };
        if (this._chart) {
            this._chart.showLoading();
        }
        this._loadData(circle.getLatLng(), afterLoadData.bind(this, color));
    },

    _loadData: function(latlng, callback) {
        var min = new Date(this._getNearestTime(this._currentDateRange.min.getTime()));
        var max = new Date(this._getNearestTime(this._currentDateRange.max.getTime()));

        var point = this._map.latLngToContainerPoint(latlng);
        var url = this._baseLayer.getURL() + '?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&SRS=EPSG:4326';
        url = url + '&LAYER=' + this._baseLayer.options.layers;
        url = url + '&QUERY_LAYERS=' + this._baseLayer.options.layers;
        url = url + '&X=' + point.x + '&Y=' + point.y + '&I=' + point.x + '&J=' + point.y;
        var size = this._map.getSize();
        url = url + '&BBox=' + this._map.getBounds().toBBoxString();
        url = url + '&WIDTH=' + size.x + '&HEIGHT=' + size.y;
        url = url + '&INFO_FORMAT=text/xml';
        var url_without_time = url;
        url = url + '&TIME=' + min.toISOString() + '/' + max.toISOString();

        if (this._proxy) url = this._proxy + '?url=' + encodeURIComponent(url);
        $.get(url, (function(data) {
            var result = {
                time: [],
                values: []
            };
            // Add min and max values to be able to get more data later
            if (this._currentDateRange.min > this._dateRange.min) {
                result.time.push(this._dateRange.min);
                result.values.push(null);
            }
            $(data).find('FeatureInfo').each(function() {
                var this_time = $(this).find('time').text();
                var this_data = $(this).find('value').text();
                try {
                    this_data = parseFloat(this_data);
                } catch (e) {
                    this_data = null;
                }
                result.time.push(this_time);
                result.values.push(this_data);
            });

            if (this._currentDateRange.max < this._dateRange.max) {
                result.time.push(this._dateRange.max);
                result.values.push(null);
            }
            result.longitude = $(data).find('longitude').text();
            try {
                result.longitude = parseFloat(result.longitude).toFixed(4);
            } catch (e) {}
            result.latitude = $(data).find('latitude').text();
            try {
                result.latitude = parseFloat(result.latitude).toFixed(4);
            } catch (e) {}

            result.url = url_without_time;
            if (callback !== undefined) {
                callback(result);
            }
        }).bind(this));
    },

    _checkLoadNewData: function(min, max) {
        min = new Date(min);
        max = new Date(max);

        var afterLoadData = (function(serie, data) {
            if (data !== undefined)
                this._updateSerie(serie, data.time, data.values);
            this._chart.hideLoading();
        }).bind(this);
        var i, l, serie;

        min = new Date(this._getNearestTime(min.getTime()));
        max = new Date(this._getNearestTime(max.getTime()));

        if (min < this._currentDateRange.min) {
            var old_min = this._currentDateRange.min;
            this._currentDateRange.min = min;
            this._chart.showLoading();
            for (i = 0, l = this._chart.series.length; i < l; i++) {
                serie = this._chart.series[i];
                if (serie.name != "Navigator")
                    this._loadMoreData(serie.options.custom.url, min, old_min, afterLoadData.bind(this, serie));
            }
        }
        if (max > this._currentDateRange.max) {
            var old_max = this._currentDateRange.max;
            this._currentDateRange.max = max;
            this._chart.showLoading();
            for (i = 0, l = this._chart.series.length; i < l; i++) {
                serie = this._chart.series[i];
                if (serie.name != "Navigator")
                    this._loadMoreData(serie.options.custom.url, old_max, max, afterLoadData.bind(this, serie));
            }
        }
    },

    _setDateRanges: function() {
        if (!this._timeDimension) {
            return;
        }
        var times = this._timeDimension.getAvailableTimes();
        this._dateRange = {
            min: new Date(times[0]),
            max: new Date(times[times.length - 1])
        };
        var max = this._dateRange.max;
        // check if max is a valid date
        if (!max.getTime || isNaN(max.getTime())) {
            return;
        }
        var min = new Date(Date.UTC(max.getUTCFullYear(), max.getUTCMonth(), max.getUTCDate()));

        if (this._defaultRangeSelector === 0) {
            min.setUTCDate(min.getUTCDate() - 3);
        } else if (this._defaultRangeSelector === 1) {
            min.setUTCDate(min.getUTCDate() - 7);
        } else if (this._defaultRangeSelector === 2) {
            min.setUTCMonth(min.getUTCMonth() - 1);
        } else if (this._defaultRangeSelector === 3) {
            min.setUTCMonth(min.getUTCMonth() - 3);
        } else if (this._defaultRangeSelector === 4) {
            min.setUTCMonth(min.getUTCMonth() - 6);
        } else {
            min.setUTCFullYear(min.getUTCFullYear() - 1);
        }

        if (min < this._dateRange.min) {
            min = this._dateRange.min;
        }

        min = new Date(this._getNearestTime(min.getTime()));

        this._currentDateRange = {
            min: min,
            max: max
        };
    },

    _loadUnits: function() {
        var url = this._baseLayer.getURL() + '?service=WMS&version=1.1.1&request=GetMetadata&item=layerDetails';
        url = url + '&layerName=' + this._baseLayer.options.layers;
        if (this._proxy) url = this._proxy + '?url=' + encodeURIComponent(url);
        $.getJSON(url, (function(data) {
            this._units = data.units;
        }).bind(this));
    },

    _createChart: function() {
        var chart_wrapper = $(this._map.getContainer()).parent().find('.chart-wrapper');
        if (!chart_wrapper.length) {
            $(this._map.getContainer()).parent().append("<div class='chart-wrapper'></div>");
            chart_wrapper = $(this._map.getContainer()).parent().find('.chart-wrapper');
        }
        var chart_container = chart_wrapper.find('.chart-' + this._baseLayer.options.layers);
        if (!chart_container.length) {
            chart_wrapper.append("<div class='chart chart-" + this._baseLayer.options.layers + "'></div>");
            chart_container = chart_wrapper.find('.chart-' + this._baseLayer.options.layers);
        }
        var options = {
            legend: {
                enabled: true
            },

            chart: {
                zoomType: 'x'
            },
            rangeSelector: {
                selected: this._defaultRangeSelector,
                buttons: [{
                    type: 'day',
                    count: 3,
                    text: '3d'
                }, {
                    type: 'day',
                    count: 7,
                    text: '7d'
                }, {
                    type: 'month',
                    count: 1,
                    text: '1m'
                }, {
                    type: 'month',
                    count: 3,
                    text: '3m'
                }, {
                    type: 'month',
                    count: 6,
                    text: '6m'
                }, {
                    type: 'year',
                    count: 1,
                    text: '1y'
                }, {
                    type: 'all',
                    text: 'All'
                }]
            },
            xAxis: {
                events: {
                    afterSetExtremes: (function(e) {
                        this._checkLoadNewData(e.min, e.max);
                    }).bind(this)
                },
                plotLines: [{
                    color: 'red',
                    dashStyle: 'solid',
                    value: new Date(this._timeDimension.getCurrentTime()),
                    width: 2,
                    id: 'pbCurrentTime'
                }]
            },
            title: {
                text: this._name
            },
            series: [],
            plotOptions: {
                series: {
                    cursor: 'pointer',
                    point: {
                        events: {
                            click: (function(event) {
                                var day = new Date(event.point.x);
                                this._timeDimension.setCurrentTime(day.getTime());
                            }).bind(this)
                        }
                    }
                }
            }
        };

        if (this._baseLayer.options.layers.substring(0, 3) == 'QC_') {
            options['yAxis'] = {};
            options['yAxis']['tickPositions'] = [0, 1, 2, 3, 4, 6, 9];
            options['yAxis']['plotBands'] = [{
                from: 0,
                to: 0.5,
                color: '#FFFFFF',
                label: {
                    text: 'No QC performed',
                    style: {
                        color: '#606060'
                    }
                }
            }, {
                from: 0.5,
                to: 1.5,
                color: 'rgba(0, 255, 0, 0.5)',
                label: {
                    text: 'Good data',
                    style: {
                        color: '#606060'
                    }
                }
            }, {
                from: 1.5,
                to: 2.5,
                color: 'rgba(0, 255, 0, 0.2)',
                label: {
                    text: 'Probably good data',
                    style: {
                        color: '#606060'
                    }
                }
            }, {
                from: 2.5,
                to: 3.5,
                color: 'rgba(255, 0, 0, 0.2)',
                label: {
                    text: 'Probably bad data',
                    style: {
                        color: '#606060'
                    }
                }
            }, {
                from: 3.5,
                to: 4.5,
                color: 'rgba(255, 0, 0, 0.5)',
                label: {
                    text: 'Bad data',
                    style: {
                        color: '#606060'
                    }
                }
            }, {
                from: 5.5,
                to: 6.5,
                color: 'rgba(177, 11, 255, 0.5)',
                label: {
                    text: 'Spike',
                    style: {
                        color: '#606060'
                    }
                }
            }, { // High wind
                from: 8.5,
                to: 9.5,
                color: 'rgba(200, 200, 200, 0.2)',
                label: {
                    text: 'Missing value',
                    style: {
                        color: '#606060'
                    }
                }
            }];
        }

        if (this._units == 'degree') {
            options['yAxis'] = {};
            options['yAxis']['tickPositions'] = [0, 90, 180, 270, 360, 361];
            options['yAxis']['labels'] = {
                formatter: function() {
                    if (this.value == 0)
                        return 'N';
                    if (this.value == 90)
                        return 'E';
                    if (this.value == 180)
                        return 'S';
                    if (this.value == 270)
                        return 'W';
                    if (this.value == 360)
                        return 'N';
                    return this.value;
                }
            };
            // options['chart']['type'] = 'heatmap';
        };
        options = $.extend({}, options, this._chartOptions);
        chart_container.highcharts('StockChart', options);
        this._chart = chart_container.highcharts();
        this._timeDimension.on('timeload', (function(data) {
            if (!this._chart){
                return;
            }
            this._chart.xAxis[0].removePlotBand("pbCurrentTime");
            this._chart.xAxis[0].addPlotLine({
                color: 'red',
                dashStyle: 'solid',
                value: new Date(this._timeDimension.getCurrentTime()),
                width: 2,
                id: 'pbCurrentTime'
            });
        }).bind(this));

        return this._chart;
    },

    _showData: function(color, data, positionName) {
        var position = data.latitude + ', ' + data.longitude;
        if (positionName !== undefined) {
            position = positionName;
        }
        return this._addSerie(data.time, data.values, position, data.url, color);
    },

    _addSerie: function(time, variableData, position, url, color) {
        var serie = this._createSerie(time, variableData, position, url, color);
        if (!this._chart){
            this._createChart();
        }
        this._chart.addSeries(serie);
        return serie.id;
    },

    _createSerie: function(time, variableData, position, url, color) {
        return {
            name: this._name + ' at ' + position,
            type: 'line',
            id: Math.random().toString(36).substring(7),
            color: color,
            data: (function() {
                var length = time.length;
                var data = new Array(length);
                var this_time = new Date();
                var this_data = null;
                for (var i = 0; i < length; i++) {
                    this_time = (new Date(time[i])).getTime();
                    this_data = variableData[i];
                    if (isNaN(this_data))
                        this_data = null;
                    data[i] = [this_time, this_data];
                }
                return data;
            })(),
            tooltip: {
                valueDecimals: 2,
                valueSuffix: ' ' + this._units,
                xDateFormat: '%A, %b %e, %H:%M',
                headerFormat: '<span style="font-size: 12px; font-weight:bold;">{point.key} (Click to visualize the map on this time)</span><br/>'
            },
            custom: {
                variable: this._name,
                position: position,
                url: url
            }
        };
    },

    _updateSerie: function(serie, time, variableData) {
        var length = time.length;
        var new_data = new Array(length);
        var this_time = new Date();
        var this_data = null;
        for (var i = 0; i < length; i++) {
            this_time = (new Date(time[i])).getTime();
            this_data = variableData[i];
            if (isNaN(this_data))
                this_data = null;
            new_data[i] = [this_time, this_data];
        }
        var old_data = serie.options.data;
        serie.options.data = old_data.concat(new_data).sort();
        serie.setData(serie.options.data);
    },

    _loadMoreData: function(url, mindate, maxdate, callback) {
        var min = new Date(this._getNearestTime(mindate.getTime()));
        var max = new Date(this._getNearestTime(maxdate.getTime()));
        url = url + '&TIME=' + min.toISOString() + '/' + max.toISOString();
        if (this._proxy) url = this._proxy + '?url=' + encodeURIComponent(url);
        $.get(url, (function(data) {
            var result = {
                time: [],
                values: []
            };
            $(data).find('FeatureInfo').each(function() {
                var this_time = $(this).find('time').text();
                var this_data = $(this).find('value').text();
                try {
                    this_data = parseFloat(this_data);
                } catch (e) {
                    this_data = null;
                }
                result.time.push(this_time);
                result.values.push(this_data);
            });
            if (callback !== undefined) {
                callback(result);
            }
        }).bind(this)).fail(function() {
            if (callback !== undefined) {
                callback();
            }
        });
    },

});

L.timeDimension.layer.wms.timeseries = function(layer, options) {
    return new L.TimeDimension.Layer.WMS.TimeSeries(layer, options);
};