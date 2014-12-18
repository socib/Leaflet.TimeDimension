/*
 * Shared and maintained by [Nezasa](http://www.nezasa.com)
 * Published under [Apache 2.0 license](http://www.apache.org/licenses/LICENSE-2.0.html)
 * © Nezasa, 2012-2013
 *
 * ---
 *
 * Javascript library for parsing of ISO 8601 durations. Supported are durations of 
 * the form P3Y6M4DT12H30M17S or PT1S or P1Y4DT1H3S etc.
 *
 * @author Nezasa AG -- https://github.com/nezasa
 * @contributor Jason "Palamedes" Ellis -- https://github.com/palamedes
 */

(function( nezasa, undefined ) {

    // create sub packages
    if (!nezasa.iso8601) nezasa.iso8601 = {};
    if (!nezasa.iso8601.Period) nezasa.iso8601.Period = {};

    //---- public properties

    /**
     * version of the ISO8601 version
     */
    nezasa.iso8601.version = '0.2';

    //---- public methods

    /**
     * Returns an array of the duration per unit. The normalized sum of all array elements
     * represents the total duration.
     *
     * - array[0]: years
     * - array[1]: months
     * - array[2]: weeks
     * - array[3]: days
     * - array[4]: hours
     * - array[5]: minutes
     * - array[6]: seconds
     *
     * @param period iso8601 period string
     * @param distributeOverflow if 'true', the unit overflows are merge into the next higher units. Defaults to 'false'.
     */
    nezasa.iso8601.Period.parse = function(period, distributeOverflow) {
        return parsePeriodString(period, distributeOverflow);
    };

    /**
     * Returns the total duration of the period in seconds.
     */
    nezasa.iso8601.Period.parseToTotalSeconds = function(period) {

        var multiplicators = [31104000 /* year   (360*24*60*60) */,
            2592000  /* month  (30*24*60*60) */,
            604800   /* week   (24*60*60*7) */,
            86400    /* day    (24*60*60) */,
            3600     /* hour   (60*60) */,
            60       /* minute (60) */,
            1        /* second (1) */];
        var durationPerUnit = parsePeriodString(period);
        var durationInSeconds = 0;

        for (var i = 0; i < durationPerUnit.length; i++) {
            durationInSeconds += durationPerUnit[i] * multiplicators[i];
        }

        return durationInSeconds;
    };

    /**
     * Return boolean based on validity of period
     * @param period
     * @return {Boolean}
     */
    nezasa.iso8601.Period.isValid = function(period) {
        try {
            parsePeriodString(period);
            return true;
        } catch(e) {
            return false;
        }
    }

    /**
     * Returns a more readable string representation of the ISO8601 period.
     * @param period the ISO8601 period string
     * @param unitName the names of the time units if there is only one (such as hour or minute).
     *        Defaults to ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'].
     * @param unitNamePlural thenames of the time units if there are several (such as hours or minutes).
     *        Defaults to ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'].
     * @param distributeOverflow if 'true', the unit overflows are merge into the next higher units. Defaults to 'false'.
     */
    nezasa.iso8601.Period.parseToString = function(period, unitNames, unitNamesPlural, distributeOverflow) {

        var result = ['', '', '', '', '', '', ''];
        var durationPerUnit = parsePeriodString(period, distributeOverflow);

        // input validation (use english as default)
        if (!unitNames)       unitNames       = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];
        if (!unitNamesPlural) unitNamesPlural = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'];

        // assemble string per unit
        for (var i = 0; i < durationPerUnit.length; i++) {
            if (durationPerUnit[i] > 0) {
                if   (durationPerUnit[i] == 1) result[i] = durationPerUnit[i] + " " + unitNames[i];
                else                           result[i] = durationPerUnit[i] + " " + unitNamesPlural[i];
            }
        }

        // trim because of space at very end and because of join(" ")
        // replace double spaces because of join(" ") and empty strings
        // Its actually possible to get more than 2 spaces in a row,
        //   so lets get 2+ spaces and remove them
        return result.join(' ').trim().replace(/[ ]{2,}/g,' ');
    };

    //---- private methods

    /**
     * Parses a ISO8601 period string.
     * @param period iso8601 period string
     * @param _distributeOverflow if 'true', the unit overflows are merge into the next higher units.
     */
    function parsePeriodString(period, _distributeOverflow) {

        // regex splits as follows
        // grp0 omitted as it is equal to the sample
        //
        // | sample            | grp1   | grp2 | grp3 | grp4 | grp5 | grp6       | grp7 | grp8 | grp9 |
        // --------------------------------------------------------------------------------------------
        // | P1Y2M3W           | 1Y2M3W | 1Y   | 2M   | 3W   | 4D   | T12H30M17S | 12H  | 30M  | 17S  |
        // | P3Y6M4DT12H30M17S | 3Y6M4D | 3Y   | 6M   |      | 4D   | T12H30M17S | 12H  | 30M  | 17S  |
        // | P1M               | 1M     |      | 1M   |      |      |            |      |      |      |
        // | PT1M              | 3Y6M4D |      |      |      |      | T1M        |      | 1M   |      |
        // --------------------------------------------------------------------------------------------

        var distributeOverflow = (_distributeOverflow) ? _distributeOverflow : false;
        var valueIndexes       = [2, 3, 4, 5, 7, 8, 9];
        var duration           = [0, 0, 0, 0, 0, 0, 0];
        var overflowLimits     = [0, 12, 4, 7, 24, 60, 60];
        var struct;

        // upcase the string just in case people don't follow the letter of the law
        period = period.toUpperCase();

        // input validation
        if (!period)                         return duration;
        else if (typeof period !== "string") throw new Error("Invalid iso8601 period string '" + period + "'");

        // parse the string
        if (struct = /^P((\d+Y)?(\d+M)?(\d+W)?(\d+D)?)?(T(\d+H)?(\d+M)?(\d+S)?)?$/.exec(period)) {

            // remove letters, replace by 0 if not defined
            for (var i = 0; i < valueIndexes.length; i++) {
                var structIndex = valueIndexes[i];
                duration[i] = struct[structIndex] ? +struct[structIndex].replace(/[A-Za-z]+/g, '') : 0;
            }
        }
        else {
            throw new Error("String '" + period + "' is not a valid ISO8601 period.");
        }

        if (distributeOverflow) {
            // note: stop at 1 to ignore overflow of years
            for (var i = duration.length - 1; i > 0; i--) {
                if (duration[i] >= overflowLimits[i]) {
                    duration[i-1] = duration[i-1] + Math.floor(duration[i]/overflowLimits[i]);
                    duration[i] = duration[i] % overflowLimits[i];
                }
            }
        }

        return duration;
    };


}( window.nezasa = window.nezasa || {} ));

