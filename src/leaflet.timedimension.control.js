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
    initialize: function (slider, options) {
        L.setOptions(this, options);
        this._element = L.DomUtil.create('div', this.options.className || 'knob', slider);
        L.Draggable.prototype.initialize.call(this, this._element, this._element);
        this._container = slider;
        this.on('predrag', function () {
            this._newPos.y = 0;
            this._newPos.x = this._adjustX(this._newPos.x);
        }, this);
        this.on('dragstart', function () {
            L.DomUtil.addClass(slider, 'dragging');
        });
        this.on('dragend', function () {
            L.DomUtil.removeClass(slider, 'dragging');
        });
        L.DomEvent.on(this._element, 'dblclick', function (e) {
            this.fire('dblclick', e);
        }, this);
        L.DomEvent.disableClickPropagation(this._element);
        this.enable();
    },

    _getProjectionCoef: function () {
        return (this.options.rangeMax - this.options.rangeMin) / (this._container.offsetWidth || this._container.style.width);
    },
    _update: function () {
        this.setPosition(L.DomUtil.getPosition(this._element).x);
    },
    _adjustX: function (x) {
        var value = this._toValue(x) || this.getMinValue();
        return this._toX(this._adjustValue(value));
    },

    _adjustValue: function (value) {
        value = Math.max(this.getMinValue(), Math.min(this.getMaxValue(), value)); //clamp value
        value = value - this.options.rangeMin; //offsets to zero

        //snap the value to the closet step
        value = Math.round(value / this.options.step) * this.options.step;
        value = value + this.options.rangeMin; //restore offset
        value = Math.round(value * 100) / 100; // *100/100 to avoid floating point precision problems

        return value;
    },

    _toX: function (value) {
        var x = (value - this.options.rangeMin) / this._getProjectionCoef();
        //console.log('toX', value, x);
        return x;
    },

    _toValue: function (x) {
        var v = x * this._getProjectionCoef() + this.options.rangeMin;
        //console.log('toValue', x, v);
        return v;
    },

    getMinValue: function () {
        return this.options.minValue || this.options.rangeMin;
    },
    getMaxValue: function () {
        return this.options.maxValue || this.options.rangeMax;
    },

    setStep: function (step) {
        this.options.step = step;
        this._update();
    },

    setPosition: function (x) {
        L.DomUtil.setPosition(this._element,
            L.point(this._adjustX(x), 0));
        this.fire('positionchanged');
    },
    getPosition: function () {
        return L.DomUtil.getPosition(this._element).x;
    },

    setValue: function (v) {
        //console.log('slider value', v);
        this.setPosition(this._toX(v));
    },

    getValue: function () {
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
        loopButton: true,
        displayDate: true,
        timeSlider: true,
        limitSliders: false,
        limitMinimumRange: 5,
        speedSlider: true,
        timeSteps: 1,
        autoPlay: false,
        playerOptions: {
            transitionTime: 1000
        }
    },

    initialize: function (options) {
        L.Control.prototype.initialize.call(this, options);
        this._dateUTC = true;
        this._timeDimension = this.options.timeDimension || null;
    },

    onAdd: function (map) {
        var container, limitKnobs;
        this._map = map;
        if (!this._timeDimension && map.timeDimension) {
            this._timeDimension = map.timeDimension;
        }
        container = L.DomUtil.create('div', 'leaflet-bar leaflet-bar-horizontal leaflet-bar-timecontrol');

        if (this.options.backwardButton) {
            this._buttonBackward = this._createButton('Backward', container);
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
            this._displayDate = this._createDisplayDate(this.options.styleNS + " timecontrol-date", container);
        }

        if (this.options.timeSlider) {
            this._sliderTime = this._createSliderTime(this.options.styleNS + " timecontrol-slider timecontrol-dateslider", container);
        }
        if (this.options.speedSlider) {
            this._sliderSpeed = this._createSliderSpeed(this.options.styleNS + " timecontrol-slider timecontrol-speed", container);
        }

        this._steps = this.options.timeSteps || 1;

        this._timeDimension.on('timeload', function (data) {
            this._update();
            this._onPlayerStateChange();
        }, this);

        this._timeDimension.on('timeloading', function (data) {
            if (data.time == this._timeDimension.getCurrentTime()) {
                if (this._displayDate) {
                    L.DomUtil.addClass(this._displayDate, 'loading');
                }
            }
        }, this);

        this._timeDimension.on('limitschanged availabletimeschanged', this._onTimeLimitsChanged, this);

        L.DomEvent.disableClickPropagation(container);

        this._initPlayer();
        window.timeDimension = this._timeDimension;
        return container;
    },
    addTo: function () {
        //To be notified AFTER the component was added to the DOM
        L.Control.prototype.addTo.apply(this, arguments);
        this._onPlayerStateChange();
        this._onTimeLimitsChanged();
        this._update();
        return this;
    },
    onRemove: function () {
        this._player.off('play stop running loopchange speedchange', this._onPlayerStateChange, this);
        this._player.off('waiting', this._onPlayerWaiting, this);
        this._player = null;
    },

    _initPlayer: function () {
        if (this.options.player) {
            this._player = this.options.player;
        } else {
            this._player = new L.TimeDimension.Player(this.options.playerOptions, this._timeDimension);
        }

        if (this.options.autoPlay && this._buttonPlayPause) {
            this._player.start(this._steps);
        }
        this._player.on('play stop running loopchange speedchange', this._onPlayerStateChange, this);
        this._player.on('waiting', this._onPlayerWaiting, this);
        this._onPlayerStateChange();
    },
    _onTimeLimitsChanged: function () {
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

    _onPlayerWaiting: function (evt) {
        if (this._buttonPlayPause) {
            L.DomUtil.addClass(this._buttonPlayPause, 'loading');
            this._buttonPlayPause.innerHTML = '<span>' + Math.floor(evt.available / evt.buffer * 100) + '%</span>';
        }
    },
    _onPlayerStateChange: function () {
        if (this._buttonPlayPause) {
            if (this._player.isPlaying()) {
                L.DomUtil.addClass(this._buttonPlayPause, 'pause');
                L.DomUtil.removeClass(this._buttonPlayPause, 'play');
            } else {
                L.DomUtil.removeClass(this._buttonPlayPause, 'pause');
                L.DomUtil.addClass(this._buttonPlayPause, 'play');
            }
            if (!this._player.isWaiting()) {
                this._buttonPlayPause.innerHTML = '';
                L.DomUtil.removeClass(this._buttonPlayPause, 'loading');
            } else {
                L.DomUtil.addClass(this._buttonPlayPause, 'loading');
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
            var speed = Math.round(10000 / (this._player.getTransitionTime() || 1000)) / 10;
            this._sliderSpeed.setValue(speed);
        }
    },

    _update: function () {
        if (!this._timeDimension) {
            return;
        }
        var time = this._timeDimension.getCurrentTime();
        if (time > 0) {
            var date = new Date(time);
            if (this._displayDate) {
                L.DomUtil.removeClass(this._displayDate, 'loading');
                this._displayDate.innerHTML = this._getDisplayDateFormat(date);
            }
            if (this._sliderTime && !this._slidingTimeSlider) {
                this._sliderTime.setValue(this._timeDimension.getCurrentTimeIndex());
            }
        } else {
            if (this._displayDate) {
                this._displayDate.innerHTML = "Time not available";
            }
        }
    },

    _createButton: function (title, container) {
        var link = L.DomUtil.create('a', this.options.styleNS + ' timecontrol-' + title.toLowerCase(), container);
        link.href = '#';
        link.title = title;

        L.DomEvent
            .addListener(link, 'click', L.DomEvent.stopPropagation)
            .addListener(link, 'click', L.DomEvent.preventDefault)
            .addListener(link, 'click', this['_button' + title + 'Clicked'], this);

        return link;
    },

    _createDisplayDate: function (className, container) {
        var link = L.DomUtil.create('a', className + ' utc', container);
        link.href = '#';
        link.title = 'UTC Time';
        L.DomEvent
            .addListener(link, 'click', L.DomEvent.stopPropagation)
            .addListener(link, 'click', L.DomEvent.preventDefault)
            .addListener(link, 'click', this._toggleDateUTC, this);

        return link;
    },

    _createSliderTime: function (className, container) {
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
            rangeMin: 0,
            rangeMax: max
        });
        knob.on('dragend', function (e) {
            var value = e.target.getValue();
            this._sliderTimeValueChanged(value);
            this._slidingTimeSlider = false;
        }, this);
        knob.on('drag', function (e) {
            this._slidingTimeSlider = true;
            var date = new Date(this._timeDimension.getAvailableTimes()[e.target.getValue()]);
            this._displayDate.innerHTML = this._getDisplayDateFormat(date);
        }, this);

        knob.on('predrag', function () {
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
        L.DomEvent.on(sliderbar, 'click', function (e) {
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


    _createLimitKnobs: function (sliderbar) {
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
        lknob.on('dragend', function (e) {
            var value = e.target.getValue();
            this._sliderLimitsValueChanged(value, uknob.getValue());
        }, this);
        uknob.on('dragend', function (e) {
            var value = e.target.getValue();
            this._sliderLimitsValueChanged(lknob.getValue(), value);
        }, this);

        //Add listeners to position the range bar
        lknob.on('drag positionchanged', function (e) {
            L.DomUtil.setPosition(rangeBar, L.point(lknob.getPosition(), 0));
            rangeBar.style.width = uknob.getPosition() - lknob.getPosition() + 'px';
        }, this);

        uknob.on('drag positionchanged', function (e) {
            rangeBar.style.width = uknob.getPosition() - lknob.getPosition() + 'px';
        }, this);

        //Add listeners to prevent overlaps
        uknob.on('predrag', function () {
            //bond upper to lower
            var lowerPosition = lknob._toX(lknob.getValue() + this.options.limitMinimumRange);
            if (uknob._newPos.x <= lowerPosition) {
                uknob._newPos.x = lowerPosition;
            }
        }, this);

        lknob.on('predrag', function () {
            //bond lower to upper
            var upperPosition = uknob._toX(uknob.getValue() - this.options.limitMinimumRange);
            if (lknob._newPos.x >= upperPosition) {
                lknob._newPos.x = upperPosition;
            }
        }, this);

        lknob.on('dblclick', function (e) {
            this._timeDimension.setLowerLimitIndex(0);
        }, this);
        uknob.on('dblclick', function (e) {
            this._timeDimension.setUpperLimitIndex(this._timeDimension.getAvailableTimes().length - 1);
        }, this);

        return [lknob, uknob];
    },


    _createSliderSpeed: function (className, container) {
        var sliderContainer = L.DomUtil.create('div', className, container);
        /* L.DomEvent
            .addListener(sliderContainer, 'click', L.DomEvent.stopPropagation)
            .addListener(sliderContainer, 'click', L.DomEvent.preventDefault);
*/
        var speedLabel = L.DomUtil.create('span', 'speed', sliderContainer);
        var sliderbar = L.DomUtil.create('div', 'slider', sliderContainer);
        var initialSpeed = Math.round(10000 / (this.options.playerOptions.transitionTime || 1000)) / 10;
        speedLabel.innerHTML = initialSpeed + "fps";

        var knob = new L.UI.Knob(sliderbar, {
            step: 0.1,
            rangeMin: 0.1,
            rangeMax: 10
        });
        knob.on('dragend', function (e) {
            var value = e.target.getValue();
            this._draggingSpeed = false;
            speedLabel.innerHTML = value + "fps";
            this._sliderSpeedValueChanged(value);
        }, this);
        knob.on('drag', function (e) {
            this._draggingSpeed = true;
            speedLabel.innerHTML = e.target.getValue() + "fps";
        }, this);

        L.DomEvent.on(sliderbar, 'click', function (e) {
            if (e.target === knob._element) {
                return; //prevent value changes on drag release
            }
            var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
                x = L.DomEvent.getMousePosition(first, sliderbar).x;
            knob.setPosition(x);
            speedLabel.innerHTML = knob.getValue() + "fps";
            this._sliderSpeedValueChanged(knob.getValue());
        }, this);
        return knob;
    },

    _buttonBackwardClicked: function (event) {
        this._timeDimension.previousTime(this._steps);
    },

    _buttonForwardClicked: function (event) {
        this._timeDimension.nextTime(this._steps);
    },
    _buttonLoopClicked: function (event) {
        this._player.setLooped(!this._player.isLooped());
    },

    _buttonPlayClicked: function (event) {
        if (this._player.isPlaying()) {
            if (this._player.isWaiting()) {
                // force restart
                this._player.stop();
                this._player.start(this._steps);

            } else {
                this._player.stop();
            }
        } else {
            this._player.start(this._steps);
        }
    },

    _sliderTimeValueChanged: function (newValue) {
        this._timeDimension.setCurrentTimeIndex(newValue);
    },

    _sliderLimitsValueChanged: function (lowerLimit, upperLimit) {
        this._timeDimension.setLowerLimitIndex(lowerLimit);
        this._timeDimension.setUpperLimitIndex(upperLimit);
    },

    _sliderSpeedValueChanged: function (newValue) {
        this._player.setTransitionTime(1000 / newValue);
    },

    _toggleDateUTC: function (event) {
        if (this._dateUTC) {
            L.DomUtil.removeClass(this._displayDate, 'utc');
            this._displayDate.title = 'Local Time';
        } else {
            L.DomUtil.addClass(this._displayDate, 'utc');
            this._displayDate.title = 'UTC Time';
        }
        this._dateUTC = !this._dateUTC;
        this._update();
    },

    _getDisplayDateFormat: function (date) {
        return this._dateUTC ? date.toISOString() : date.toLocaleString();
    }

});

L.Map.addInitHook(function () {
    if (this.options.timeDimensionControl) {
        this.timeDimensionControl = L.control.timeDimension(this.options.timeDimensionControlOptions || {});
        this.addControl(this.timeDimensionControl);
    }
});

L.control.timeDimension = function (options) {
    return new L.Control.TimeDimension(options);
};
