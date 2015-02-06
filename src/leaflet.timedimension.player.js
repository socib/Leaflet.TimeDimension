/*
 * L.TimeDimension.Player 
 */

L.TimeDimension.Player = L.Class.extend({

    initialize: function(options, timeDimension) {
        L.setOptions(this, options);
        this._timeDimension = timeDimension;
        this._paused = false;
        this._transitionTime = this.options.transitionTime || 1000;
        this._buffer = this.options.buffer || 5;
        this._minBufferReady = this.options.minBufferReady || 1;
        this._waitingForBuffer = false;
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
        var numberNextTimesReady = 0;
        if (self._minBufferReady > 0){
            numberNextTimesReady = self._timeDimension.getNumberNextTimesReady(self._steps, self._buffer);            
            // If the player was waiting, check if all times are loaded
            if (self._waitingForBuffer){
                if (numberNextTimesReady < self._buffer){
                    console.log('Waiting until buffer is loaded. ' + numberNextTimesReady + ' of ' + self._buffer + ' loaded');
                    self._timeDimension.fire('timeanimationwaiting', {percent: numberNextTimesReady/self._buffer});
                    return;
                }else{
                    // all times loaded
                    console.log('Buffer is fully loaded!');
                    self._timeDimension.fire('timeanimationrunning');
                    self._waitingForBuffer = false;
                }
            } else{
                // check if player has to stop to wait and force to full all the buffer
                if (numberNextTimesReady < self._minBufferReady){
                    console.log('Force wait for load buffer. ' + numberNextTimesReady + ' of ' + self._buffer + ' loaded');
                    self._waitingForBuffer = true;
                    self._timeDimension.fire('timeanimationwaiting', {percent: numberNextTimesReady/self._buffer});
                    self._timeDimension.prepareNextTimes(self._steps, self._buffer);
                    return;
                }
            }
        }
        self.pause();
        self._timeDimension.nextTime(self._steps, self._loop);
        if (self._buffer > 0){
            self._timeDimension.prepareNextTimes(self._steps, self._buffer);
        }
    },

    start: function(numSteps) {
        if (this._intervalID) return;
        this._steps = numSteps || 1;
        this._waitingForBuffer = false;
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

    isWaiting: function() {
        return this._waitingForBuffer;
    },

    setTransitionTime: function(transitionTime) {
        this._transitionTime = transitionTime;
        if (this._intervalID) {
            this.stop();
            this.start();
        }
    }    
});