/*jshint indent: 4, browser:true*/
/*global L*/


/*
 * L.TimeDimension.Player
 */
//'use strict';
L.TimeDimension.Player = (L.Layer || L.Class).extend({

    includes: (L.Evented || L.Mixin.Events),

    /**
     * Timedimension player initializer
     * @param {object} options player options 
     * @param {Layer} timedimension timedimension layer
     * @returns timedimension player
     */
    initialize: function(options, timeDimension) {
        L.setOptions(this, options);
        this._timeDimension = timeDimension;
        this._paused = false;
        this._buffer = this.options.buffer || 5;
        this._minBufferReady = this.options.minBufferReady || 1;
        this._waitingForBuffer = false;
        this._loop = this.options.loop || false;
        this._steps = 1;
        this._timeDimension.on('timeload', (function(data) {
            this.release(); // free clock
            this._waitingForBuffer = false; // reset buffer
        }).bind(this));
        this.setTransitionTime(this.options.transitionTime || 1000);
        
        this._timeDimension.on('limitschanged availabletimeschanged timeload', (function(data) {
            this._timeDimension.prepareNextTimes(this._steps, this._minBufferReady, this._loop);
        }).bind(this));
    },

    /**
     * Method called uppon each tick of the player
     * @returns Empty return
     */
    _tick: function() {
        var maxIndex = this._getMaxIndex();
        var maxForward = (this._timeDimension.getCurrentTimeIndex() >= maxIndex) && (this._steps > 0);
        var maxBackward = (this._timeDimension.getCurrentTimeIndex() == 0) && (this._steps < 0);
        if (maxForward || maxBackward) {
            // we reached the last step
            if (!this._loop) {
                this.pause();
                this.stop();
                this.fire('animationfinished');
                return;
            }
        }

        if (this._paused) {
            return;
        }
        var numberNextTimesReady = 0,
            buffer = this._bufferSize;

        if (this._minBufferReady > 0) {
            numberNextTimesReady = this._timeDimension.getNumberNextTimesReady(this._steps, buffer, this._loop);
            // If the player was waiting, check if all times are loaded
            if (this._waitingForBuffer) {
                if (numberNextTimesReady < buffer) {
                    console.log('Waiting until buffer is loaded. ' + numberNextTimesReady + ' of ' + buffer + ' loaded');
                    this.fire('waiting', {
                        buffer: buffer,
                        available: numberNextTimesReady
                    });
                    return;
                } else {
                    // all times loaded
                    console.log('Buffer is fully loaded!');
                    this.fire('running');
                    this._waitingForBuffer = false;
                }
            } else {
                // check if player has to stop to wait and force to full all the buffer
                if (numberNextTimesReady < this._minBufferReady) {
                    console.log('Force wait for load buffer. ' + numberNextTimesReady + ' of ' + buffer + ' loaded');
                    this._waitingForBuffer = true;
                    this._timeDimension.prepareNextTimes(this._steps, buffer, this._loop);
                    this.fire('waiting', {
                        buffer: buffer,
                        available: numberNextTimesReady
                    });
                    return;
                }
            }
        }
        this.pause();
        this._timeDimension.nextTime(this._steps, this._loop);
        if (buffer > 0) {
            this._timeDimension.prepareNextTimes(this._steps, buffer, this._loop);
        }
    },
    
    /**
     * Get maximum time intex
     * @returns maximun time index
     */
    _getMaxIndex: function(){
       return Math.min(this._timeDimension.getAvailableTimes().length - 1, 
                       this._timeDimension.getUpperLimitIndex() || Infinity);
    },

    /**
     * Method called when the player is started
     * @param {number} numSteps number of steps previously activated
     * @returns Empty return
     */
    start: function(numSteps) {
        if (this._intervalID) return;
        this._steps = numSteps || 1;
        this._waitingForBuffer = false;
        var startedOver = false;
        if (this.options.startOver){
            if (this._timeDimension.getCurrentTimeIndex() === this._getMaxIndex()){
                this._timeDimension.setCurrentTimeIndex(this._timeDimension.getLowerLimitIndex() || 0);
                startedOver = true;
            }
        }
        this.release();
        this._intervalID = window.setInterval(
            L.bind(this._tick, this),
            this._transitionTime);
        if (!startedOver)
            this._tick();
        this.fire('play');
        this.fire('running');
    },

    /**
     * Method called when the player is stopped
     */
    stop: function() {
        if (!this._intervalID) return;
        clearInterval(this._intervalID);
        this._intervalID = null;
        this._waitingForBuffer = false;
        this.fire('stop');
    },

    /**
     * Method called when the player is paused
     */
    pause: function() {
        this._paused = true;
    },

    /**
     * Method called when the player is unpaused
     */
    release: function () {
        this._paused = false;
    },

    /**
     * Get transition time
     * @returns transition time
     */
    getTransitionTime: function() {
        return this._transitionTime;
    },

    /**
     * Check if the player is playing
     * @returns flag to check if the player is playing
     */
    isPlaying: function() {
        return this._intervalID ? true : false;
    },

    /**
     * Check if the player is waiting
     * @returns flag to check if the player is waiting
     */
    isWaiting: function() {
        return this._waitingForBuffer;
    },

    /**
     * Check if the player has looped
     * @returns flag to check if the player is in loop
     */
    isLooped: function() {
        return this._loop;
    },

    /**
     * Set if the player is looped
     * @param {boolean} looped flag to define if the player is looped
     */
    setLooped: function(looped) {
        this._loop = looped;
        this.fire('loopchange', {
            loop: looped
        });
    },

    /**
     * Set transition time
     * @param {number} transitionTime Transition time
     */
    setTransitionTime: function(transitionTime) {
        this._transitionTime = transitionTime;
        if (typeof this._buffer === 'function') {
            this._bufferSize = this._buffer.call(this, this._transitionTime, this._minBufferReady, this._loop);
            console.log('Buffer size changed to ' + this._bufferSize);
        } else {
            this._bufferSize = this._buffer;
        }
        if (this._intervalID) {
            this.stop();
            this.start(this._steps);
        }
        this.fire('speedchange', {
            transitionTime: transitionTime,
            buffer: this._bufferSize
        });
    },

    /**
     * Get player steps
     * @returns player steps
     */
    getSteps: function() {
        return this._steps;
    }
});
