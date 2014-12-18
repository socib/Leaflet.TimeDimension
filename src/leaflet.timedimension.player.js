/*
 * L.TimeDimension.Player 
 */

L.TimeDimension.Player = L.Class.extend({

    initialize: function(options, timeDimension) {
        L.setOptions(this, options);
        this._timeDimension = timeDimension;
        this._paused = false;
        this._transitionTime = this.options.transitionTime || 1000;
        this._buffer = this.options.buffer || 10;
        this._loop = this.options.loop || false;
        this._steps = 1;
        this._timeDimension.on('timeload', (function(data){
            this.continue();  // free clock
        }).bind(this));        
    },


    _tick: function(self) {
        if (self._timeDimension.getCurrentTimeIndex() >= self._timeDimension.getAvailableTimes().length - 1) {
            if (!self._loop){
                clearInterval(self._intervalID);
                self._timeDimension.fire('timeanimationfinished');                
                return;
            }
        }
        if (self._paused) {
            return;
        }
        self.pause();
        self._timeDimension.nextTime(self._steps);
        if (self._buffer > 0){
            self._timeDimension.prepareNextTimes(self._steps, self._buffer);            
        }
    },

    start: function(numSteps) {
        if (this._intervalID) return;
        this._steps = numSteps || 1;
        this._intervalID = window.setInterval(
            this._tick,
            this._transitionTime,
            this);
        this._tick(this);
    },

    stop: function() {
        if (!this._intervalID) return;
        clearInterval(this._intervalID);
        this._intervalID = null;
    },

    pause: function() {
        this._paused = true;
    },

    continue: function() {
        this._paused = false;
    },

    getTransitionTime: function() {
        return this._transitionTime;
    },

    isPlaying: function() {
        return this._intervalID ? true : false;
    },

    setTransitionTime: function(transitionTime) {
        this._transitionTime = transitionTime;
        if (this._intervalID) {
            this.stop();
            this.start();
        }
    }    
});