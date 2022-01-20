/*jshint indent: 4, browser:true*/
/*global L*/
/*
 * L.TimeDimension: TimeDimension object manages the time component of a layer.
 * It can be shared among different layers and it can be added to a map, and become
 * the default timedimension component for any layer added to the map.
 */

L.TimeDimension = (L.Layer || L.Class).extend({

    includes: (L.Evented || L.Mixin.Events),

    /**
     * timedimension layer constructor
     * @param {object} options Object with timedimension layer settings
     * @returns Instance of timedimension layer
     */
    initialize: function (options) {
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
        if (this.options.lowerLimitTime) {
            this.setLowerLimit(this.options.lowerLimitTime);
        }
        if (this.options.upperLimitTime) {
            this.setUpperLimit(this.options.upperLimitTime);
        }
    },

    /**
     * Get available times
     * @returns array of available times
     */
    getAvailableTimes: function () {
        return this._availableTimes;
    },

    /**
     * Get current time index
     * @returns Index of the current time 
     */
    getCurrentTimeIndex: function () {
        if (this._currentTimeIndex === -1) {
            return this._availableTimes.length - 1;
        }
        return this._currentTimeIndex;
    },

    /**
     * Get current time
     * @returns current time or null
     */
    getCurrentTime: function () {
        var index = -1;
        if (this._loadingTimeIndex !== -1) {
            index = this._loadingTimeIndex;
        } else {
            index = this.getCurrentTimeIndex();
        }
        if (index >= 0) {
            return this._availableTimes[index];
        } else {
            return null;
        }
    },

    /**
     * Verify if the data is loading
     * @returns loading flag
     */
    isLoading: function () {
        return (this._loadingTimeIndex !== -1);
    },

    /**
     * Set current time index
     * @param {number} newIndex new current time index 
     * @returns updated current time index
     */
    setCurrentTimeIndex: function (newIndex) {
        var upperLimit = this._upperLimit || this._availableTimes.length - 1;
        var lowerLimit = this._lowerLimit || 0;
        //clamp the value
        newIndex = Math.min(Math.max(lowerLimit, newIndex), upperLimit);
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
            setTimeout((function (index) {
                if (index == this._loadingTimeIndex) {
                    console.log('Change time for timeout');
                    this._newTimeIndexLoaded();
                }
            }).bind(this, newIndex), this._loadingTimeout);
        }

    },

    /**
     * Load a new time index
     */
    _newTimeIndexLoaded: function () {
        if (this._loadingTimeIndex === -1) {
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
    
    /**
     * Check if a specific layer is synced
     * @param {number} time time to be synchronized
     * @returns synchronization of the time
     */
    _checkSyncedLayersReady: function (time) {
        for (var i = 0, len = this._syncedLayers.length; i < len; i++) {
            if (this._syncedLayers[i].isReady) {
                if (!this._syncedLayers[i].isReady(time)) {
					return false;                    
                }
            }
        }
        return true;
    },
    
    /**
     * Set current time
     * @param {number} time new time 
     */
    setCurrentTime: function (time) {
        var newIndex = this._seekNearestTimeIndex(time);
        this.setCurrentTimeIndex(newIndex);
    },

    /**
     * Seek nearest time
     * @param {number} time time to be seeked 
     * @returns nearest time
     */
    seekNearestTime: function (time) {
        var index = this._seekNearestTimeIndex(time);
        return this._availableTimes[index];
    },

    /**
     * Set next current time index
     * @param {number} numSteps steps to be jumped
     * @param {boolean} loop check if it's looping
     */
    nextTime: function (numSteps, loop) {
        if (!numSteps) {
            numSteps = 1;
        }
        var newIndex = this._currentTimeIndex;
        var upperLimit = this._upperLimit || this._availableTimes.length - 1;
        var lowerLimit = this._lowerLimit || 0;
        if (this._loadingTimeIndex > -1) {
            newIndex = this._loadingTimeIndex;
        }
        newIndex = newIndex + numSteps;
        if (newIndex > upperLimit) {
            if (!!loop) {
                newIndex = lowerLimit;
            } else {
                newIndex = upperLimit;
            }
        }
        // loop backwards
        if (newIndex < lowerLimit) {
            if (!!loop) {
                newIndex = upperLimit;
            } else {
                newIndex = lowerLimit;
            }
        }
        this.setCurrentTimeIndex(newIndex);
    },

    /**
     * Load the next times into the cache
     * @param {number} numSteps steps to be jumped
     * @param {number} howmany how many layers will be cached
     * @param {boolean} loop check if it's looping
     */
    prepareNextTimes: function (numSteps, howmany, loop) {
        if (!numSteps) {
            numSteps = 1;
        }

        var newIndex = this._currentTimeIndex;
        var currentIndex = newIndex;
        if (this._loadingTimeIndex > -1) {
            newIndex = this._loadingTimeIndex;
        }
        // assure synced layers have a buffer/cache of at least howmany elements
        for (var i = 0, len = this._syncedLayers.length; i < len; i++) {
            if (this._syncedLayers[i].setMinimumForwardCache) {
                this._syncedLayers[i].setMinimumForwardCache(howmany);
            }
        }
        var count = howmany;
        var upperLimit = this._upperLimit || this._availableTimes.length - 1;
        var lowerLimit = this._lowerLimit || 0;
        while (count > 0) {
            newIndex = newIndex + numSteps;
            if (newIndex > upperLimit) {
                if (!!loop) {
                    newIndex = lowerLimit;
                } else {
                    break;
                }
            }
            if (newIndex < lowerLimit) {
                if (!!loop) {
                    newIndex = upperLimit;
                } else {
                    break;
                }
            }
            if (currentIndex === newIndex) {
                //we looped around the timeline
                //no need to load further, the next times are already loading
                break;
            }
            this.fire('timeloading', {
                time: this._availableTimes[newIndex]
            });
            count--;
        }
    },

    /**
     * Get the next times into the cache
     * @param {number} numSteps steps to be jumped
     * @param {number} howmany how many layers will be cached
     * @param {boolean} loop check if it's looping
     */
    getNumberNextTimesReady: function (numSteps, howmany, loop) {
        if (!numSteps) {
            numSteps = 1;
        }

        var newIndex = this._currentTimeIndex;
        if (this._loadingTimeIndex > -1) {
            newIndex = this._loadingTimeIndex;
        }
        var count = howmany;
        var ready = 0;
        var upperLimit = this._upperLimit || this._availableTimes.length - 1;
        var lowerLimit = this._lowerLimit || 0;
        while (count > 0) {
            newIndex = newIndex + numSteps;
            if (newIndex > upperLimit) {
                if (!!loop) {
                    newIndex = lowerLimit;
                } else {
                    count = 0;
                    ready = howmany;
                    break;
                }
            }
            if (newIndex < lowerLimit) {
                if (!!loop) {
                    newIndex = upperLimit;
                } else {
                    count = 0;
                    ready = howmany;
                    break;
                }
            }
            var time = this._availableTimes[newIndex];
            if (this._checkSyncedLayersReady(time)) {
                ready++;
            }
            count--;
        }
        return ready;
    },

    /**
     * Get previoust time
     * @param {number} numSteps steps to be jumped
     * @param {boolean} loop check if it's looping
     */
    previousTime: function (numSteps, loop) {
        this.nextTime(numSteps*(-1), loop);
    },

    /**
     * Register leaflet synced layer
     * @param {L.Layer} layer leayer to be registered
     */
    registerSyncedLayer: function (layer) {
        this._syncedLayers.push(layer);
        layer.on('timeload', this._onSyncedLayerLoaded, this);
    },

    /**
     * Unregister leaflet synced layer
     * @param {L.Layer} layer leayer to be unregistered
     */
    unregisterSyncedLayer: function (layer) {
        var index = this._syncedLayers.indexOf(layer);
        if (index != -1) {
            this._syncedLayers.splice(index, 1);
        }
        layer.off('timeload', this._onSyncedLayerLoaded, this);
    },

    /**
     * Method called when a synced layer is loaded
     * @param {object} e 
     */
    _onSyncedLayerLoaded: function (e) {
        if (e.time == this._availableTimes[this._loadingTimeIndex] && this._checkSyncedLayersReady(e.time)) {
            this._newTimeIndexLoaded();
        }
    },

    /**
     * Generate available times
     * @returns array of available times
     */
    _generateAvailableTimes: function () {
        if (this.options.times) {
            return L.TimeDimension.Util.parseTimesExpression(this.options.times);
        } else if (this.options.timeInterval) {
            var tiArray = L.TimeDimension.Util.parseTimeInterval(this.options.timeInterval);
            var period = this.options.period || 'P1D';
            var validTimeRange = this.options.validTimeRange || undefined;
            return L.TimeDimension.Util.explodeTimeRange(tiArray[0], tiArray[1], period, validTimeRange);
        } else {
            return [];
        }
    },

    /**
     * Get default current time
     * @returns default current time
     */
    _getDefaultCurrentTime: function () {
        var index = this._seekNearestTimeIndex(new Date().getTime());
        return this._availableTimes[index];
    },

    /**
     * Seek nearest time index
     * @param {number} time 
     * @returns nearest time index
     */
    _seekNearestTimeIndex: function (time) {
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

    /**
     * Set available times based on the mode
     * @param {number[]} times Date array to be available
     * @param {string} mode mode type
     */
    setAvailableTimes: function (times, mode) {
        var currentTime = this.getCurrentTime(),
            lowerLimitTime = this.getLowerLimit(),
            upperLimitTime = this.getUpperLimit();

        if (mode == 'extremes') {
            var period = this.options.period || 'P1D';
            this._availableTimes = L.TimeDimension.Util.explodeTimeRange(new Date(times[0]), new Date(times[times.length - 1]), period);
        } else {
            var parsedTimes = L.TimeDimension.Util.parseTimesExpression(times);
            if (this._availableTimes.length === 0) {
                this._availableTimes = parsedTimes;
            } else if (mode == 'intersect') {
                this._availableTimes = L.TimeDimension.Util.intersect_arrays(parsedTimes, this._availableTimes);
            } else if (mode == 'union') {
                this._availableTimes = L.TimeDimension.Util.union_arrays(parsedTimes, this._availableTimes);
            } else if (mode == 'replace') {
                this._availableTimes = parsedTimes;
            } else {
                throw 'Merge available times mode not implemented: ' + mode;
            }
        }

        if (lowerLimitTime) {
            this.setLowerLimit(lowerLimitTime); //restore lower limit
        }
        if (upperLimitTime) {
            this.setUpperLimit(upperLimitTime); //restore upper limit
        }
        this.setCurrentTime(currentTime);
        this.fire('availabletimeschanged', {
            availableTimes: this._availableTimes,
            currentTime: currentTime
        });
        console.log('available times changed');
    },

    /**
     * Get lower limit
     * @returns lower limit
     */
    getLowerLimit: function () {
        return this._availableTimes[this.getLowerLimitIndex()];
    },

    /**
     * Get upper limit
     * @returns upper limit
     */
    getUpperLimit: function () {
        return this._availableTimes[this.getUpperLimitIndex()];
    },

    /**
     * Set lower limit
     * @param {number} time new lower limit
     */
    setLowerLimit: function (time) {
        var index = this._seekNearestTimeIndex(time);
        this.setLowerLimitIndex(index);
    },

    /**
     * Set upper limit
     * @param {number} time new upper limit
     */
    setUpperLimit: function (time) {
        var index = this._seekNearestTimeIndex(time);
        this.setUpperLimitIndex(index);
    },

    /**
     * Set lower limit index
     * @param {number} index new lower limit 
     */
    setLowerLimitIndex: function (index) {
        this._lowerLimit = Math.min(Math.max(index || 0, 0), this._upperLimit || this._availableTimes.length - 1);
        this.fire('limitschanged', {
            lowerLimit: this._lowerLimit,
            upperLimit: this._upperLimit
        });
    },

    /**
     * Set upper limit index
     * @param {number} index new upper limit 
     */
    setUpperLimitIndex: function (index) {
        this._upperLimit = Math.max(Math.min(index, this._availableTimes.length - 1), this._lowerLimit || 0);
        this.fire('limitschanged', {
            lowerLimit: this._lowerLimit,
            upperLimit: this._upperLimit
        });
    },

    /**
     * Get lower limit index
     * @returns lower limit index
     */
    getLowerLimitIndex: function () {
        return this._lowerLimit;
    },

    /**
     * Get upper limit index
     * @returns upper limit index
     */
    getUpperLimitIndex: function () {
        return this._upperLimit;
    }
});

/**
 * Editing leaflet Map hooks
 */
L.Map.addInitHook(function () {
    if (this.options.timeDimension) {
        this.timeDimension = L.timeDimension(this.options.timeDimensionOptions || {});
    }
});

/**
 * New leaflet timedimension instance
 * @param {object} options timedimension options value
 * @returns new instance
 */
L.timeDimension = function (options) {
    return new L.TimeDimension(options);
};
