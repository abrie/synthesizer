var PPQN = 24;
function parseNotation(str) {
    var ticks = 0;
    var index = 0;
    if( str[index] == "e" ) {
        ticks = PPQN/2;
    }
    else if( str[index] == "s" ) {
        ticks = PPQN/4;
    }
    else if( str[index] == "q" ) {
        ticks = PPQN;
    }
    else if( str[index] == "h" ) {
        ticks = PPQN*2;
    }
    else if( str[index] == "w" ) {
        ticks = PPQN*4;
    }
    
    if( str.length > 1 ) {
        var dot = ticks;
        index++;
        while( str[index] == "." && index < str.length) {
            dot /= 2;
            ticks += dot;
            index++;
        }
    }

	return ticks > 0 ? ticks : str;
}


function inputToArray( input ) {
    if (!input) {
        console.log("inputToArray called with null parameter");
        return [];
    }
	var result = _.map( input.val().split(','), function(val) {
		if(val == 0) {
			return 0;
		}
		var parsed = parseNotation(val);
		return parseInt( parsed ) || val;
	});

	return result;
}
