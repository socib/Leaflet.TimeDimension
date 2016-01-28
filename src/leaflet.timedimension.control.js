/*
 * L.Control.TimeDimension: Leaflet control to manage a timeDimension
 */

L.Control.TimeDimension = L.Control.extend({
	options: {
		position: 'bottomleft',
		title: 'Time Control',
		backwardButton: true,
		forwardButton: true,
		playButton: true,
		displayDate: true,
		timeSlider: true,
		speedSlider: true,
		timeSteps: 1,
		autoPlay: false,
		playerOptions:{
			transitionTime: 1000
		}
	},

	initialize: function (options) {
		L.Control.prototype.initialize.call(this, options);
		this._dateUTC = true;
		this._timeDimension = this.options.timeDimension || null;
	},

	onAdd: function(map) {
		this._map = map;
        if (!this._timeDimension && map.timeDimension){
            this._timeDimension = map.timeDimension;
        }
		var className = 'leaflet-control-timecontrol',
			container;

		container = L.DomUtil.create('div', 'leaflet-bar leaflet-bar-horizontal leaflet-bar-timecontrol');

		if (this.options.backwardButton)
			this._buttonBackward = this._createBackwardButton(className + " timecontrol-backward", container);
		if (this.options.playButton)
			this._buttonPlayPause = this._createPlayPauseButton(className + " timecontrol-play", container);
		if (this.options.forwardButton)
			this._buttonForward = this._createForwardButton(className + " timecontrol-forward", container);
		if (this.options.displayDate)
			this._displayDate = this._createDisplayDate(className + " timecontrol-date", container);
		if (this.options.timeSlider)
			this._slider = this._createSlider(className + " timecontrol-slider timecontrol-dateslider", container);
		if (this.options.speedSlider)
			this._sliderSpeed = this._createSliderSpeed(className + " timecontrol-slider timecontrol-speed", container);

		this._steps = this.options.timeSteps || 1;

		this._timeDimension.on('timeload', (function(data){
        	this._update();
    	}).bind(this));

		this._timeDimension.on('timeloading', (function(data){
			if(data.time == this._timeDimension.getCurrentTime()){
				if (this._displayDate && this._displayDate.className.indexOf(' timecontrol-loading') == -1){
					this._displayDate.className += " timecontrol-loading";
				}
			}
    	}).bind(this));

    	this._timeDimension.on('timeanimationwaiting', (function(data){
			if (this._buttonPlayPause){
        		this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-play-loading';
        		this._buttonPlayPause.innerHTML = '<span>' + Math.floor(data.percent*100) + '%</span>';
			}

    	}).bind(this));

    	this._timeDimension.on('timeload timeanimationrunning', (function(data){
			if (this._buttonPlayPause){
				this._buttonPlayPause.innerHTML = '';
				if (this._player && this._player.isPlaying()){
					this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-pause';
				} else {
					this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-play';
				}
			}
    	}).bind(this));

		this._timeDimension.on('timeanimationfinished', (function(data){
			if (this._buttonPlayPause)
        		this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-play';
    	}).bind(this));

		this._timeDimension.on('availabletimeschanged', (function(data){
			if (this._slider)
        		this._slider.slider("option", "max", this._timeDimension.getAvailableTimes().length - 1);
    	}).bind(this));

		// Disable dragging and zoom when user's cursor enters the element
		container.addEventListener('mouseover', function() {
			map.dragging.disable();
			map.doubleClickZoom.disable();
			// map.off('mousemove');
		});

		// Re-enable dragging and zoom when user's cursor leaves the element
		container.addEventListener('mouseout', function() {
			map.dragging.enable();
			map.doubleClickZoom.enable();
		});
		this._update();
		if (this.options.autoPlay && this._buttonPlayPause){
			this._buttonPlayPauseClicked();
		}
		return container;
	},

	_initPlayer : function(){
		this._player = new L.TimeDimension.Player(this.options.playerOptions, this._timeDimension);
		// Update TransitionTime with the one setted on the slider
		if(this._sliderSpeed){
			this._sliderSpeedValueChanged(this._sliderSpeed.slider( "value"));
		}
    },

	_update: function () {
		if (!this._timeDimension){
			return;
		}
		var time = this._timeDimension.getCurrentTime();
		if (time > 0){
			var date = new Date(time);
			if (this._displayDate){
				this._displayDate.className = this._displayDate.className.replace(' timecontrol-loading', '');
				this._displayDate.innerHTML = this._getDisplayDateFormat(date);
			}
			if (this._slider && !this._slidingTimeSlider){
	        	this._slider.slider( "value", this._timeDimension.getCurrentTimeIndex());
			}
		}else{
			if (this._displayDate){
				this._displayDate.innerHTML = "Time not available";
			}
			if (this._slider){
	        	this._slider.slider( "value", 0);
	        }
		}
	},

	_createBackwardButton: function(className, container) {
		var link = L.DomUtil.create('a', className, container);
		link.href = '#';
		link.title = 'Backward';
		// link.innerHTML = '<span class="glyphicon glyphicon-backward"></span>';

		L.DomEvent
			.addListener(link, 'click', L.DomEvent.stopPropagation)
			.addListener(link, 'click', L.DomEvent.preventDefault)
			.addListener(link, 'click', this._buttonBackwardClicked, this);

		return link;
	},

	_createForwardButton: function(className, container) {
		var link = L.DomUtil.create('a', className, container);
		link.href = '#';
		link.title = 'Forward';
		// link.innerHTML = '<span class="glyphicon glyphicon-forward"></span>';

		L.DomEvent
			.addListener(link, 'click', L.DomEvent.stopPropagation)
			.addListener(link, 'click', L.DomEvent.preventDefault)
			.addListener(link, 'click', this._buttonForwardClicked, this);

		return link;
	},

	_createPlayPauseButton: function(className, container) {
		var link = L.DomUtil.create('a', className, container);
		link.href = '#';
		link.title = 'Play';
		// link.innerHTML = '<span class="glyphicon glyphicon-play"></span>';

		L.DomEvent
			.addListener(link, 'click', L.DomEvent.stopPropagation)
			.addListener(link, 'click', L.DomEvent.preventDefault)
			.addListener(link, 'click', this._buttonPlayPauseClicked, this);

		return link;
	},

	_createDisplayDate: function(className, container) {
		var link = L.DomUtil.create('a', className, container);
		link.href = '#';
		link.title = 'UTC Time';
		L.DomEvent
			.addListener(link, 'click', L.DomEvent.stopPropagation)
			.addListener(link, 'click', L.DomEvent.preventDefault)
			.addListener(link, 'click', this._toggleDateUTC, this);

		return link;
	},

	_createSlider: function(className, container) {
		var _slider = L.DomUtil.create('a', className, container);
		_slider.href = '#';
		L.DomEvent
			.addListener(_slider, 'click', L.DomEvent.stopPropagation)
			.addListener(_slider, 'click', L.DomEvent.preventDefault);

		_slider.innerHTML = '<div class="slider"></div>';
		var slider = $(_slider).find('.slider');
		var max = this._timeDimension.getAvailableTimes().length - 1;
		slider.slider({
      		min: 0,
      		max: max,
      		range: "min",
      		stop: (function( event, ui ) {
        		this._sliderValueChanged(ui.value);
        		this._slidingTimeSlider = false;
        	}).bind(this),
        	slide: (function( event, ui ) {
        		this._slidingTimeSlider = true;
				var date = new Date(this._timeDimension.getAvailableTimes()[ui.value]);
				this._displayDate.innerHTML = this._getDisplayDateFormat(date);
        	}).bind(this),

      	});
		return slider;
	},

	_createSliderSpeed: function(className, container) {
		var _slider = L.DomUtil.create('a', className, container);
		_slider.href = '#';
		L.DomEvent
			.addListener(_slider, 'click', L.DomEvent.stopPropagation)
			.addListener(_slider, 'click', L.DomEvent.preventDefault);

		var currentSpeed = 1;
		if (this._player){
			currentSpeed = 1000/this._playerOptions.getTransitionTime();
		}else{
			currentSpeed = Math.round(10000/(this.options.playerOptions.transitionTime||1000))/10;
		}
		_slider.innerHTML = '<span class="speed">' +  currentSpeed  + 'fps</span><div class="slider"></div>';
		var slider = $(_slider).find('.slider');
		slider.slider({
      		min: 0.1,
      		max: 10,
      		value: currentSpeed,
      		step: 0.1,
      		range: "min",
      		stop: (function(sliderContainer, event, ui ) {
        		var speed = $(sliderContainer).find('.speed')[0];
				speed.innerHTML = ui.value + "fps";
        		this._sliderSpeedValueChanged(ui.value);
        	}).bind(this, _slider),
        	slide: (function(sliderContainer, event, ui ) {
        		var speed = $(sliderContainer).find('.speed')[0];
				speed.innerHTML = ui.value + "fps";
        	}).bind(this, _slider),

      	});
		return slider;
	},

	_buttonBackwardClicked: function(event) {
		this._timeDimension.previousTime(this._steps);
	},

	_buttonForwardClicked: function(event) {
		this._timeDimension.nextTime(this._steps);
	},

	_buttonPlayPauseClicked: function(event) {
		if (!this._player){
		    this._initPlayer();
		}
		if (this._player.isPlaying()){
			if (this._player.isWaiting()){
				// force start
				this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-pause';
				this._buttonPlayPause.innerHTML = '';
				this._player.stop();
				this._player.start(this._steps);

			} else {
				this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-play';
				this._player.stop();
				this._buttonPlayPause.innerHTML = '';
			}
		} else {
			this._buttonPlayPause.className = 'leaflet-control-timecontrol timecontrol-pause';
			this._player.start(this._steps);
		}
	},

	_sliderValueChanged: function(newValue) {
		this._timeDimension.setCurrentTimeIndex(newValue);
	},

	_sliderSpeedValueChanged: function(newValue){
		if (this._player){
		    this._player.setTransitionTime(1000/newValue);
		}
	},

	_toggleDateUTC: function(event){
		if (this._dateUTC){
			this._displayDate.title = 'Local Time';
		}else{
			this._displayDate.title = 'UTC Time';
		}
		this._dateUTC = !this._dateUTC;
		this._update();
	},

	_getDisplayDateFormat: function(date){
		return this._dateUTC ? date.toISOString() : date.toLocaleString();
	}

});

L.Map.addInitHook(function() {
	if (this.options.timeDimensionControl) {
		this.timeDimensionControl = L.control.timeDimension(this.options.timeDimensionControlOptions || {});
		this.addControl(this.timeDimensionControl);
	}
});

L.control.timeDimension = function(options) {
	return new L.Control.TimeDimension(options);
};
