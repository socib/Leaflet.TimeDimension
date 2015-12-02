/*
 * L.TimeDimension: TimeDimension object manages the time component of a layer.
 * It can be shared among different layers and it can be added to a map, and become
 * the default timedimension component for any layer added to the map.
 */

L.TimeDimension = (L.Layer || L.Class).extend({

    includes: L.Mixin.Events,

    initialize: function(options) {
        L.setOptions(this, options);
        // _availableTimes is an array with all the available times in ms.
        this._availableTimes = this._generateAvailableTimes();
        this._currentTimeIndex = -1;
        this._loadingTimeIndex = -1;
        this._loadingTimeout = this.options.loadingTimeout || 3000;
        this._syncedLayers = [];
        if (this._availableTimes.length > 0) {
            this.setCurrentTime(this.options.currentTime || this._getDefaultCurrentTime());
        }
    },

    getAvailableTimes: function() {
        return this._availableTimes;
    },

    getCurrentTimeIndex: function() {
        if (this._currentTimeIndex == -1) {
            return this._availableTimes.length - 1;
        }
        return this._currentTimeIndex;
    },

    getCurrentTime: function() {
        var index = -1;
        if (this._loadingTimeIndex != -1) {
            index = this._loadingTimeIndex;
        } else {
            index = this.getCurrentTimeIndex();
        }
        if (index >= 0) {
            return this._availableTimes[index];
        } else {
            return 0;
        }
    },

    isLoading: function() {
        return (this._loadingTimeIndex != -1);
    },

    setCurrentTimeIndex: function(newIndex) {
        if (newIndex >= this._availableTimes.length) {
            newIndex = this._availableTimes.length - 1;
        }
        if (newIndex < 0) {
            return;
        }
        this._loadingTimeIndex = newIndex;
        var newTime = this._availableTimes[newIndex];
        console.log('INIT -- Current time: ' + new Date(newTime).toISOString());
        if (this._checkSyncedLayersReady(this._availableTimes[this._loadingTimeIndex])) {
            this._newTimeIndexLoaded();
        } else {
            this.fire('timeloading', {
                time: newTime
            });
            // add timeout of 3 seconds if layers doesn't response
            setTimeout((function(index) {
                if (index == this._loadingTimeIndex) {
                    console.log('Change time for timeout');
                    this._newTimeIndexLoaded();
                }
            }).bind(this, newIndex), this._loadingTimeout);
        }

    },

    _newTimeIndexLoaded: function() {
        if (this._loadingTimeIndex == -1) {
            return;
        }
        var time = this._availableTimes[this._loadingTimeIndex];
        console.log('END -- Current time: ' + new Date(time).toISOString());
        this._currentTimeIndex = this._loadingTimeIndex;
        this.fire('timeload', {
            time: time
        });
        this._loadingTimeIndex = -1;
    },

    _checkSyncedLayersReady: function(time) {
        for (var i = 0, len = this._syncedLayers.length; i < len; i++) {
            if (this._syncedLayers[i].isReady) {
                if (!this._syncedLayers[i].isReady(time)) {
                    return false;
                }
            }
        }
        return true;
    },

    setCurrentTime: function(time) {
        var newIndex = this._seekNearestTimeIndex(time);
        this.setCurrentTimeIndex(newIndex);
    },

    seekNearestTime: function(time) {
        var index = this._seekNearestTimeIndex(time);
        return this._availableTimes[index];
    },

    nextTime: function(numSteps, loop) {
        if (numSteps === undefined) {
            numSteps = 1;
        }
        if (loop === undefined) {
            loop = false;
        }

        var newIndex = this._currentTimeIndex;
        if (this._loadingTimeIndex > -1)
            newIndex = this._loadingTimeIndex;
        newIndex = newIndex + numSteps;
        if (newIndex >= this._availableTimes.length) {
            if (loop){
                newIndex = 0;
            }else{
                // nextTime out of range
                return;
            }
        }
        this.setCurrentTimeIndex(newIndex);
    },

    prepareNextTimes: function(numSteps, howmany) {
        if (numSteps === undefined) {
            numSteps = 1;
        }

        var newIndex = this._currentTimeIndex;
        if (this._loadingTimeIndex > -1)
            newIndex = this._loadingTimeIndex;
        // assure synced layers have a buffer/cache of at least howmany elements
        for (var i = 0, len = this._syncedLayers.length; i < len; i++) {
            if (this._syncedLayers[i].setMinimumForwardCache) {
                this._syncedLayers[i].setMinimumForwardCache(howmany);
            }
        }
        var count = howmany;
        while (count > 0) {
            newIndex = newIndex + numSteps;
            if (newIndex >= this._availableTimes.length) {
                break;
            }
            this.fire('timeloading', {
                time: this._availableTimes[newIndex]
            });
            count--;
        }
    },

    getNumberNextTimesReady: function(numSteps, howmany) {
        if (numSteps === undefined) {
            numSteps = 1;
        }

        var newIndex = this._currentTimeIndex;
        if (this._loadingTimeIndex > -1)
            newIndex = this._loadingTimeIndex;
        var count = howmany;
        var ready = 0;
        while (count > 0) {
            newIndex = newIndex + numSteps;
            if (newIndex >= this._availableTimes.length) {
                count = 0;
                ready = howmany;
                break;
            }
            var time = this._availableTimes[newIndex];
            if (this._checkSyncedLayersReady(time)){
                ready++;
            }
            count--;
        }
        return ready;
    },

    previousTime: function(numSteps) {
        if (numSteps === undefined) {
            numSteps = 1;
        }
        var newIndex = this._currentTimeIndex;
        if (this._loadingTimeIndex > -1)
            newIndex = this._loadingTimeIndex;
        newIndex = newIndex - numSteps;
        if (newIndex < 0) {
            newIndex = 0;
        }
        this.setCurrentTimeIndex(newIndex);
    },

    registerSyncedLayer: function(layer) {
        this._syncedLayers.push(layer);
        layer.on("timeload", this._onSyncedLayerLoaded, this);
    },

    unregisterSyncedLayer: function(layer) {
        var index = this._syncedLayers.indexOf(layer);
        if (index != -1) {
            this._syncedLayers.splice(index, 1);
        }
        layer.off("timeload", this._onSyncedLayerLoaded, this);
    },

    _onSyncedLayerLoaded: function(e) {
        if (e.time == this._availableTimes[this._loadingTimeIndex] && this._checkSyncedLayersReady(e.time)) {
            this._newTimeIndexLoaded();
        }
    },

    _generateAvailableTimes: function() {
        if (this.options.times) {
            return L.TimeDimension.Util.parseTimesExpression(this.options.times);
        } else if (this.options.timeInterval) {
            var tiArray = L.TimeDimension.Util.parseTimeInterval(this.options.timeInterval);
            var period = this.options.period || "P1D";
            var validTimeRange = this.options.validTimeRange || undefined;
            return L.TimeDimension.Util.explodeTimeRange(tiArray[0], tiArray[1], period, validTimeRange);
        } else {
            return [];
        }
    },

    _getDefaultCurrentTime: function() {
        var index = this._seekNearestTimeIndex(new Date().getTime());
        return this._availableTimes[index];
    },

    _seekNearestTimeIndex: function(time) {
        var newIndex = 0;
        var len = this._availableTimes.length;
        for (; newIndex < len; newIndex++) {
            if (time < this._availableTimes[newIndex]) {
                break;
            }
        }
        // We've found the first index greater than the time. Return the previous
        if (newIndex > 0) {
            newIndex--;
        }
        return newIndex;
    },

    setAvailableTimes: function(times, mode) {
        var currentTime = this.getCurrentTime();
        if (mode == 'extremes') {
            var period = this.options.period || "P1D";
            this._availableTimes = L.TimeDimension.Util.explodeTimeRange(new Date(times[0]), new Date(times[times.length - 1]), period);
        } else {
            var parsedTimes = L.TimeDimension.Util.parseTimesExpression(times);
            if (this._availableTimes.length == 0) {
                this._availableTimes = parsedTimes;
            } else if (mode == 'intersect') {
                this._availableTimes = L.TimeDimension.Util.intersect_arrays(parsedTimes, this._availableTimes);
            } else if (mode == 'union') {
                this._availableTimes = L.TimeDimension.Util.union_arrays(parsedTimes, this._availableTimes);
            } else if (mode == 'replace') {
                this._availableTimes = parsedTimes;
            } else {
                throw "Merge available times mode not implemented: " + mode;
            }
        }
        this.setCurrentTime(currentTime);
        this.fire('availabletimeschanged', {});
        console.log('available times changed');
    }
});

L.Map.addInitHook(function() {
    if (this.options.timeDimension) {
        this.timeDimension = L.timeDimension(this.options.timeDimensionOptions || {});
    }
});

L.timeDimension = function(options) {
    return new L.TimeDimension(options);
};
