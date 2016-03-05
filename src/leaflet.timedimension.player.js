/*jshint indent: 4, browser:true*/
/*global L*/


/*
 * L.TimeDimension.Player
 */
//'use strict';
L.TimeDimension.Player = (L.Layer || L.Class).extend({

    includes: L.Mixin.Events,
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
    },


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
    
    _getMaxIndex: function(){
       return Math.min(this._timeDimension.getAvailableTimes().length - 1, 
                       this._timeDimension.getUpperLimitIndex() || Infinity);
    },

    start: function(numSteps) {
        if (this._intervalID) return;
        this._steps = numSteps || 1;
        this._waitingForBuffer = false;
        if (this.options.startOver){
            if (this._timeDimension.getCurrentTimeIndex() === this._getMaxIndex()){
                 this._timeDimension.setCurrentTimeIndex(this._timeDimension.getLowerLimitIndex() || 0);
            }
        }
        this.release();
        this._intervalID = window.setInterval(
            L.bind(this._tick, this),
            this._transitionTime);
        this._tick();
        this.fire('play');
        this.fire('running');
    },

    stop: function() {
        if (!this._intervalID) return;
        clearInterval(this._intervalID);
        this._intervalID = null;
        this.fire('stop');
    },

    pause: function() {
        this._paused = true;
    },

    release: function () {
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
    isLooped: function() {
        return this._loop;
    },

    setLooped: function(looped) {
        this._loop = looped;
        this.fire('loopchange', {
            loop: looped
        });
    },

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
            this.start();
        }
        this.fire('speedchange', {
            transitionTime: transitionTime,
            buffer: this._bufferSize
        });
    },

    getSteps: function() {
        return this._steps;
    }
});