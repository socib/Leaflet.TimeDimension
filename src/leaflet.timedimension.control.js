/*jshint indent: 4, browser:true*/
/*global L*/

/*
 * L.Control.TimeDimension: Leaflet control to manage a timeDimension
 */

L.UI = L.ui = L.UI || {};
L.UI.Knob = L.Draggable.extend({
    options: {
        className: 'knob',
        step: 1,
        rangeMin: 0,
        rangeMax: 10
            //minValue : null,
            //maxValue : null
    },

    /**
     * UI slider constructor
     * @param {DOM} slider Html slider DOM 
     * @param {object} options Object with slider settings
     * @returns Instance of timedimension slider
     */
    initialize: function(slider, options) {
        L.setOptions(this, options);
        this._element = L.DomUtil.create('div', this.options.className || 'knob', slider);
        L.Draggable.prototype.initialize.call(this, this._element, this._element);
        this._container = slider;
        this.on('predrag', function() {
            this._newPos.y = 0;
            this._newPos.x = this._adjustX(this._newPos.x);
        }, this);
        this.on('dragstart', function() {
            L.DomUtil.addClass(slider, 'dragging');
        });
        this.on('dragend', function() {
            L.DomUtil.removeClass(slider, 'dragging');
        });
        L.DomEvent.on(this._element, 'dblclick', function(e) {
            this.fire('dblclick', e);
        }, this);
        L.DomEvent.disableClickPropagation(this._element);
        this.enable();
    },

    /**
     * Get projection coefficient
     * @returns projection coefficient as number
     */
    _getProjectionCoef: function() {
        return (this.options.rangeMax - this.options.rangeMin) / (this._container.offsetWidth || this._container.style.width);
    },

    /**
     * Update the slider UI
     */
    _update: function() {
        this.setPosition(L.DomUtil.getPosition(this._element).x);
    },

    /**
     * Adjust slider x position based on user click 
     * @param {number} x User click x position
     * @returns adjusted value
     */
    _adjustX: function(x) {
        var value = this._toValue(x) || this.getMinValue();
        return this._toX(this._adjustValue(value));
    },

    /**
     * Adjust internal slider x value
     * @param {number} value Value x to be adjusted 
     * @returns adjusted value
     */
    _adjustValue: function(value) {
        value = Math.max(this.getMinValue(), Math.min(this.getMaxValue(), value)); //clamp value
        value = value - this.options.rangeMin; //offsets to zero

        //snap the value to the closet step
        value = Math.round(value / this.options.step) * this.options.step;
        value = value + this.options.rangeMin; //restore offset
        value = Math.round(value * 100) / 100; // *100/100 to avoid floating point precision problems

        return value;
    },

    /**
     * Adjust value close to X based on the projection coefficient
     * @param {number} value value to be adjusted 
     * @returns adjusted value
     */
    _toX: function(value) {
        var x = (value - this.options.rangeMin) / this._getProjectionCoef();
        //console.log('toX', value, x);
        return x;
    },

    /**
     * Adjust value close to the value based on the projection coefficient
     * @param {number} value value to be adjusted 
     * @returns adjusted value
     */
    _toValue: function(x) {
        var v = x * this._getProjectionCoef() + this.options.rangeMin;
        //console.log('toValue', x, v);
        return v;
    },

    /**
     * Get mininal slider value
     * @returns minimal slider value
     */
    getMinValue: function() {
        return this.options.minValue || this.options.rangeMin;
    },

    /**
     * Get maximal slider value
     * @returns maximal slider value
     */
    getMaxValue: function() {
        return this.options.maxValue || this.options.rangeMax;
    },

    /**
     * Set step value
     * @param {number} step new step value
     */
    setStep: function(step) {
        this.options.step = step;
        this._update();
    },

    /**
     * Set slider DOM position
     * @param {number} x new slider position
     */
    setPosition: function(x) {
        L.DomUtil.setPosition(this._element,
            L.point(this._adjustX(x), 0));
        this.fire('positionchanged');
    },

    /**
     * Get slider original x position
     * @returns slider original x position
     */
    getPosition: function() {
        return L.DomUtil.getPosition(this._element).x;
    },

    /**
     * Set slider position value
     * @param {number} v new position value
     */
    setValue: function(v) {
        //console.log('slider value', v);
        this.setPosition(this._toX(v));
    },

    /**
     * Get slider fixed position value
     * @returns fixed position value
     */
    getValue: function() {
        return this._adjustValue(this._toValue(this.getPosition()));
    }
});


/*
 * L.Control.TimeDimension: Leaflet control to manage a timeDimension
 */

L.Control.TimeDimension = L.Control.extend({
    options: {
        styleNS: 'leaflet-control-timecontrol',
        position: 'bottomleft',
        title: 'Time Control',
        backwardButton: true,
        forwardButton: true,
        playButton: true,
        playReverseButton: false,
        loopButton: false,
        displayDate: true,
        timeSlider: true,
        timeSliderDragUpdate: false,
        limitSliders: false,
        limitMinimumRange: 5,
        speedSlider: true,
        minSpeed: 0.1,
        maxSpeed: 10,
        speedStep: 0.1,
        timeSteps: 1,
        autoPlay: false,
        playerOptions: {
            transitionTime: 1000
        },
        timeZones: ['UTC', 'Local']
    },

    /**
     * UI controller constructor
     * @param {object} options Object with controller settings
     * @returns Instance of timedimension controller
     */
    initialize: function(options) {
        L.setOptions(options);
        L.Control.prototype.initialize.call(this, options);
        this._timeZoneIndex = 0;
        this._timeDimension = this.options.timeDimension || null;
    },

    /**
     * Method called when adding this controller to a map
     * @param {L.Map} map Leaflet map
     */
    onAdd: function(map) {
        var container;
        this._map = map;
        if (!this._timeDimension && map.timeDimension) {
            this._timeDimension = map.timeDimension;
        }
        this._initPlayer();

        container = L.DomUtil.create('div', 'leaflet-bar leaflet-bar-horizontal leaflet-bar-timecontrol');
        if (this.options.backwardButton) {
            this._buttonBackward = this._createButton('Backward', container);
        }
        if (this.options.playReverseButton) {
            this._buttonPlayReversePause = this._createButton('Play Reverse', container);
        }
        if (this.options.playButton) {
            this._buttonPlayPause = this._createButton('Play', container);
        }
        if (this.options.forwardButton) {
            this._buttonForward = this._createButton('Forward', container);
        }
        if (this.options.loopButton) {
            this._buttonLoop = this._createButton('Loop', container);
        }
        if (this.options.displayDate) {
            this._displayDate = this._createButton('Date', container);
        }
        if (this.options.timeSlider) {
            this._sliderTime = this._createSliderTime(this.options.styleNS + ' timecontrol-slider timecontrol-dateslider', container);
        }
        if (this.options.speedSlider) {
            this._sliderSpeed = this._createSliderSpeed(this.options.styleNS + ' timecontrol-slider timecontrol-speed', container);
        }

        this._steps = this.options.timeSteps || 1;

        this._timeDimension.on('timeload',  this._update, this);
        this._timeDimension.on('timeload',  this._onPlayerStateChange, this);
        this._timeDimension.on('timeloading', this._onTimeLoading, this);

        this._timeDimension.on('limitschanged availabletimeschanged', this._onTimeLimitsChanged, this);

        L.DomEvent.disableClickPropagation(container);

        return container;
    },

    /**
     * Method called after the component was added to the DOM
     */
    addTo: function() {
        //To be notified AFTER the component was added to the DOM
        L.Control.prototype.addTo.apply(this, arguments);
        this._onPlayerStateChange();
        this._onTimeLimitsChanged();
        this._update();
        return this;
    },

    /**
     * Method called when the this controller is removed from the map
     */
    onRemove: function() {
        this._player.off('play stop running loopchange speedchange', this._onPlayerStateChange, this);
        this._player.off('waiting', this._onPlayerWaiting, this);
        //this._player = null;  keep it for later re-add

        this._timeDimension.off('timeload',  this._update, this);
        this._timeDimension.off('timeload',  this._onPlayerStateChange, this);
        this._timeDimension.off('timeloading', this._onTimeLoading, this);
        this._timeDimension.off('limitschanged availabletimeschanged', this._onTimeLimitsChanged, this);
    },

    /**
     * Method called to initiate the player
     */
    _initPlayer: function() {
        if (!this._player){ // in case of remove/add
            if (this.options.player) {
                this._player = this.options.player;
            } else {
                this._player = new L.TimeDimension.Player(this.options.playerOptions, this._timeDimension);
            }
        }
        if (this.options.autoPlay) {
            this._player.start(this._steps);
        }
        this._player.on('play stop running loopchange speedchange', this._onPlayerStateChange, this);
        this._player.on('waiting', this._onPlayerWaiting, this);
        this._onPlayerStateChange();
    },

    /**
     * Trigger called while waiting for data
     * @param {object} data 
     */
    _onTimeLoading : function(data) {
        if (data.time == this._timeDimension.getCurrentTime()) {
            if (this._displayDate) {
                L.DomUtil.addClass(this._displayDate, 'loading');
            }
        }
    },

    /**
     * Trigger called when time limits changes
     */
    _onTimeLimitsChanged: function() {
        var lowerIndex = this._timeDimension.getLowerLimitIndex(),
            upperIndex = this._timeDimension.getUpperLimitIndex(),
            max = this._timeDimension.getAvailableTimes().length - 1;

        if (this._limitKnobs) {
            this._limitKnobs[0].options.rangeMax = max;
            this._limitKnobs[1].options.rangeMax = max;
            this._limitKnobs[0].setValue(lowerIndex || 0);
            this._limitKnobs[1].setValue(upperIndex || max);
        }
        if (this._sliderTime) {
            this._sliderTime.options.rangeMax = max;
            this._sliderTime._update();
        }
    },

    /**
     * Method called to update the player instance while waiting for data
     * @param {object} evt
     */
    _onPlayerWaiting: function(evt) {
        if (this._buttonPlayPause && this._player.getSteps() > 0) {
            L.DomUtil.addClass(this._buttonPlayPause, 'loading');
            this._buttonPlayPause.innerHTML = this._getDisplayLoadingText(evt.available, evt.buffer);
        }
        if (this._buttonPlayReversePause && this._player.getSteps() < 0) {
            L.DomUtil.addClass(this._buttonPlayReversePause, 'loading');
            this._buttonPlayReversePause.innerHTML = this._getDisplayLoadingText(evt.available, evt.buffer);
        }
    },

    /**
     * Method called whent the user updates the player instance
     */
    _onPlayerStateChange: function() {
        if (this._buttonPlayPause) {
            if (this._player.isPlaying() && this._player.getSteps() > 0) {
                L.DomUtil.addClass(this._buttonPlayPause, 'pause');
                L.DomUtil.removeClass(this._buttonPlayPause, 'play');
            } else {
                L.DomUtil.removeClass(this._buttonPlayPause, 'pause');
                L.DomUtil.addClass(this._buttonPlayPause, 'play');
            }
            if (this._player.isWaiting() && this._player.getSteps() > 0) {
                L.DomUtil.addClass(this._buttonPlayPause, 'loading');
            } else {
                this._buttonPlayPause.innerHTML = '';
                L.DomUtil.removeClass(this._buttonPlayPause, 'loading');
            }
        }
        if (this._buttonPlayReversePause) {
            if (this._player.isPlaying() && this._player.getSteps() < 0) {
                L.DomUtil.addClass(this._buttonPlayReversePause, 'pause');
            } else {
                L.DomUtil.removeClass(this._buttonPlayReversePause, 'pause');
            }
            if (this._player.isWaiting() && this._player.getSteps() < 0) {
                L.DomUtil.addClass(this._buttonPlayReversePause, 'loading');
            } else {
                this._buttonPlayReversePause.innerHTML = '';
                L.DomUtil.removeClass(this._buttonPlayReversePause, 'loading');
            }
        }
        if (this._buttonLoop) {
            if (this._player.isLooped()) {
                L.DomUtil.addClass(this._buttonLoop, 'looped');
            } else {
                L.DomUtil.removeClass(this._buttonLoop, 'looped');
            }
        }
        if (this._sliderSpeed && !this._draggingSpeed) {
            var speed =  this._player.getTransitionTime() || 1000;//transitionTime
            speed = Math.round(10000 / speed) /10; // 1s / transition
            this._sliderSpeed.setValue(speed);
        }
    },

    /**
     * Method called to update the controller instance
     */
    _update: function() {
        if (!this._timeDimension) {
            return;
        }
        if (this._timeDimension.getCurrentTimeIndex() >= 0) {
            var date = new Date(this._timeDimension.getCurrentTime());
            if (this._displayDate) {
                L.DomUtil.removeClass(this._displayDate, 'loading');
                this._displayDate.innerHTML = this._getDisplayDateFormat(date);
            }
            if (this._sliderTime && !this._slidingTimeSlider) {
                this._sliderTime.setValue(this._timeDimension.getCurrentTimeIndex());
            }
        } else {
            if (this._displayDate) {
                this._displayDate.innerHTML = this._getDisplayNoTimeError();
            }
        }
    },

    /**
     * Method called to create a new button into the DOM
     * @param {string} title title of the button
     * @param {DOM} container DOM value of the button 
     * @returns new button
     */
    _createButton: function(title, container) {
        var link = L.DomUtil.create('a', this.options.styleNS + ' timecontrol-' + title.toLowerCase(), container);
        link.href = '#';
        link.title = title;

        L.DomEvent
            .addListener(link, 'click', L.DomEvent.stopPropagation)
            .addListener(link, 'click', L.DomEvent.preventDefault)
            .addListener(link, 'click', this['_button' + title.replace(/ /i, '') + 'Clicked'], this);

        return link;
    },

    /**
     * Method called to create a new slider into the DOM
     * @param {string} className html class name properties
     * @param {DOM} container DOM value of the slider 
     * @returns new slider
     */
    _createSliderTime: function(className, container) {
        var sliderContainer,
            sliderbar,
            max,
            knob, limits;
        sliderContainer = L.DomUtil.create('div', className, container);
        /*L.DomEvent
            .addListener(sliderContainer, 'click', L.DomEvent.stopPropagation)
            .addListener(sliderContainer, 'click', L.DomEvent.preventDefault);*/

        sliderbar = L.DomUtil.create('div', 'slider', sliderContainer);
        max = this._timeDimension.getAvailableTimes().length - 1;

        if (this.options.limitSliders) {
            limits = this._limitKnobs = this._createLimitKnobs(sliderbar);
        }
        knob = new L.UI.Knob(sliderbar, {
            className: 'knob main',
            rangeMin: 0,
            rangeMax: max
        });
        knob.on('dragend', function(e) {
            var value = e.target.getValue();
            this._sliderTimeValueChanged(value);
            this._slidingTimeSlider = false;
        }, this);
        knob.on('drag', function(e) {
            this._slidingTimeSlider = true;
            var time = this._timeDimension.getAvailableTimes()[e.target.getValue()];
            if (time) {
                var date = new Date(time);
                if (this._displayDate) {
                  this._displayDate.innerHTML = this._getDisplayDateFormat(date);
                }
                if (this.options.timeSliderDragUpdate){
                    this._sliderTimeValueChanged(e.target.getValue());
                }
            }
        }, this);

        knob.on('predrag', function() {
            var minPosition, maxPosition;
            if (limits) {
                //limits the position between lower and upper knobs
                minPosition = limits[0].getPosition();
                maxPosition = limits[1].getPosition();
                if (this._newPos.x < minPosition) {
                    this._newPos.x = minPosition;
                }
                if (this._newPos.x > maxPosition) {
                    this._newPos.x = maxPosition;
                }
            }
        }, knob);
        L.DomEvent.on(sliderbar, 'click', function(e) {
            if (L.DomUtil.hasClass(e.target, 'knob')) {
                return; //prevent value changes on drag release
            }
            var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
                x = L.DomEvent.getMousePosition(first, sliderbar).x;
            if (limits) { // limits exits
                if (limits[0].getPosition() <= x && x <= limits[1].getPosition()) {
                    knob.setPosition(x);
                    this._sliderTimeValueChanged(knob.getValue());
                }
            } else {
                knob.setPosition(x);
                this._sliderTimeValueChanged(knob.getValue());
            }

        }, this);
        knob.setPosition(0);

        return knob;
    },

    /**
     * Method called to create a new knob into the DOM
     * @param {DOM} slidebar DOM value of the slider 
     * @returns new knob
     */
    _createLimitKnobs: function(sliderbar) {
        L.DomUtil.addClass(sliderbar, 'has-limits');
        var max = this._timeDimension.getAvailableTimes().length - 1;
        var rangeBar = L.DomUtil.create('div', 'range', sliderbar);
        var lknob = new L.UI.Knob(sliderbar, {
            className: 'knob lower',
            rangeMin: 0,
            rangeMax: max
        });
        var uknob = new L.UI.Knob(sliderbar, {
            className: 'knob upper',
            rangeMin: 0,
            rangeMax: max
        });


        L.DomUtil.setPosition(rangeBar, 0);
        lknob.setPosition(0);
        uknob.setPosition(max);

        //Add listeners for value changes
        lknob.on('dragend', function(e) {
            var value = e.target.getValue();
            this._sliderLimitsValueChanged(value, uknob.getValue());
        }, this);
        uknob.on('dragend', function(e) {
            var value = e.target.getValue();
            this._sliderLimitsValueChanged(lknob.getValue(), value);
        }, this);

        //Add listeners to position the range bar
        lknob.on('drag positionchanged', function() {
            L.DomUtil.setPosition(rangeBar, L.point(lknob.getPosition(), 0));
            rangeBar.style.width = uknob.getPosition() - lknob.getPosition() + 'px';
        }, this);

        uknob.on('drag positionchanged', function() {
            rangeBar.style.width = uknob.getPosition() - lknob.getPosition() + 'px';
        }, this);

        //Add listeners to prevent overlaps
        uknob.on('predrag', function() {
            //bond upper to lower
            var lowerPosition = lknob._toX(lknob.getValue() + this.options.limitMinimumRange);
            if (uknob._newPos.x <= lowerPosition) {
                uknob._newPos.x = lowerPosition;
            }
        }, this);

        lknob.on('predrag', function() {
            //bond lower to upper
            var upperPosition = uknob._toX(uknob.getValue() - this.options.limitMinimumRange);
            if (lknob._newPos.x >= upperPosition) {
                lknob._newPos.x = upperPosition;
            }
        }, this);

        lknob.on('dblclick', function() {
            this._timeDimension.setLowerLimitIndex(0);
        }, this);
        uknob.on('dblclick', function() {
            this._timeDimension.setUpperLimitIndex(this._timeDimension.getAvailableTimes().length - 1);
        }, this);

        return [lknob, uknob];
    },

    /**
     * Method called to create a new slider speed into the DOM
     * @param {string} className html class name properties
     * @param {DOM} container DOM value of the slider speed
     * @returns new slider speed
     */
    _createSliderSpeed: function(className, container) {
        var sliderContainer = L.DomUtil.create('div', className, container);
        /* L.DomEvent
            .addListener(sliderContainer, 'click', L.DomEvent.stopPropagation)
            .addListener(sliderContainer, 'click', L.DomEvent.preventDefault);
*/
        var speedLabel = L.DomUtil.create('span', 'speed', sliderContainer);
        var sliderbar = L.DomUtil.create('div', 'slider', sliderContainer);
        var initialSpeed = Math.round(10000 / (this._player.getTransitionTime() || 1000)) / 10;
        speedLabel.innerHTML = this._getDisplaySpeed(initialSpeed);

        var knob = new L.UI.Knob(sliderbar, {
            step: this.options.speedStep,
            rangeMin: this.options.minSpeed,
            rangeMax: this.options.maxSpeed
        });

        knob.on('dragend', function(e) {
            var value = e.target.getValue();
            this._draggingSpeed = false;
            speedLabel.innerHTML = this._getDisplaySpeed(value);
            this._sliderSpeedValueChanged(value);
        }, this);
        knob.on('drag', function(e) {
            this._draggingSpeed = true;
            speedLabel.innerHTML = this._getDisplaySpeed(e.target.getValue());
        }, this);
         knob.on('positionchanged', function (e) {
            speedLabel.innerHTML = this._getDisplaySpeed(e.target.getValue());
        }, this);

        L.DomEvent.on(sliderbar, 'click', function(e) {
            if (e.target === knob._element) {
                return; //prevent value changes on drag release
            }
            var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
                x = L.DomEvent.getMousePosition(first, sliderbar).x;
            knob.setPosition(x);
            speedLabel.innerHTML = this._getDisplaySpeed(knob.getValue());
            this._sliderSpeedValueChanged(knob.getValue());
        }, this);
        return knob;
    },

    /**
     * Set time when backward button is clicked
     */
    _buttonBackwardClicked: function() {
        this._timeDimension.previousTime(this._steps);
    },

    /**
     * Set time when foward button is clicked
     */
    _buttonForwardClicked: function() {
        this._timeDimension.nextTime(this._steps);
    },

    /**
     * Set loop value when loop button is clicked
     */
    _buttonLoopClicked: function() {
        this._player.setLooped(!this._player.isLooped());
    },

    /**
     * Starts and stops the data requests when play button is clicked
     */
    _buttonPlayClicked: function() {
        if (this._player.isPlaying()) {
            this._player.stop();
        } else {
            this._player.start(this._steps);
        }
    },

    /**
     * Activate and deactivate the data flow inversion when reverse button is clicked
     */
    _buttonPlayReverseClicked: function() {
        if (this._player.isPlaying()) {
            this._player.stop();
        } else {
            this._player.start(this._steps * (-1));
        }
    },

    /**
     * Change timezone when date button is clicked
     */
    _buttonDateClicked: function(){
        this._switchTimeZone();
    },

    /**
     * Set new time value
     * @param {number} newValue new time value
     */
    _sliderTimeValueChanged: function(newValue) {
        this._timeDimension.setCurrentTimeIndex(newValue);
    },

    /**
     * Set new lower limit value
     * @param {number} lowerLimit new lower limit value
     * @param {number} upperLimit new upper limit value
     */
    _sliderLimitsValueChanged: function(lowerLimit, upperLimit) {
        this._timeDimension.setLowerLimitIndex(lowerLimit);
        this._timeDimension.setUpperLimitIndex(upperLimit);
    },

    /**
     * Set new speed value
     * @param {number} newValue new speed value
     */
    _sliderSpeedValueChanged: function(newValue) {
        this._player.setTransitionTime(1000 / newValue);
    },

    /**
     * Get current timezone
     * @returns actual timezone
     */
    _getCurrentTimeZone: function() {
        return this.options.timeZones[this._timeZoneIndex];
    },

    /**
     * Method called while switching timezones
     */
    _switchTimeZone: function() {
        if (this._getCurrentTimeZone().toLowerCase() == 'utc') {
            L.DomUtil.removeClass(this._displayDate, 'utc');
        }
        this._timeZoneIndex = (this._timeZoneIndex + 1) % this.options.timeZones.length;
        var timeZone = this._getCurrentTimeZone();
        if (timeZone.toLowerCase() == 'utc') {
            L.DomUtil.addClass(this._displayDate, 'utc');
            this._displayDate.title = 'UTC Time';
        } else if (timeZone.toLowerCase() == 'local') {
            this._displayDate.title = 'Local Time';
        } else {
            this._displayDate.title = timeZone;
        }

        this._update();
    },

    /**
     * Get date format as string
     * @param {Date} date 
     * @returns date format as string
     */
    _getDisplayDateFormat: function(date) {
        var timeZone = this._getCurrentTimeZone();
        if (timeZone.toLowerCase() == 'utc') {
            return date.toISOString();
        }
        if (timeZone.toLowerCase() == 'local') {
            return date.toLocaleString();
        }
        return date.toLocaleString([], {timeZone: timeZone, timeZoneName: "short"});
    },

    /**
     * Display speed
     * @param {number} fps 
     * @returns fps value as string
     */
    _getDisplaySpeed: function(fps) {
        return fps + 'fps';
    },

    /**
     * Display loading text
     * @param {number} available 
     * @param {number} buffer 
     * @returns loading text as string
     */
    _getDisplayLoadingText: function(available, buffer) {
        return '<span>' + Math.floor(available / buffer * 100) + '%</span>';
    },

    /**
     * Display no time error
     * @returns Error message
     */
    _getDisplayNoTimeError: function() {
        return 'Time not available';
    }

});

/**
 * Editing leaflet Map hooks
 */

L.Map.addInitHook(function() {
    if (this.options.timeDimensionControl) {
        this.timeDimensionControl = L.control.timeDimension(this.options.timeDimensionControlOptions || {});
        this.addControl(this.timeDimensionControl);
    }
});

/**
 * New leaflet controller instance
 * @param {object} options controller options value
 * @returns new instance
 */
L.control.timeDimension = function(options) {
    return new L.Control.TimeDimension(options);
};
