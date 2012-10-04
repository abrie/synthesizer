function incrementPattern( pattern, amount )
{
	var newPattern = $.extend({},pattern);
	for (i=0; i<amount; i++)
	{
		if (newPattern.steps == newPattern.pulses) {
			newPattern.steps += 1;
			newPattern.pulses = 1;
			newPattern.offset = 0;
		}
		else {
			newPattern.offset += 1;
			if (newPattern.offset >= newPattern.steps) {
				newPattern.pulses += 1;
				if (newPattern.pulses > newPattern.steps) {
					newPattern.steps += 1;
					newPattern.pulses = 1;
				}
				newPattern.offset = 0;
			}
		}
	}
	
	console.log("pattern:",newPattern.steps, newPattern.pulses, newPattern.offset);
	return newPattern;
}

// ideas:
// - add a ticksPerPulse parameter in conjunction with ticksPerStep. This will give
//   different timings for pulses v/s steps. Keep in mind that this will complicate
//   calculation of the totalTicks value.
// - try a pre-delay on the emitter; this is a countdown before the emitter begins to
//   cycle through its pattern.  The effect may be possible through a combination
//   of offset and emitter lengths... research required.
function generate_emitter( pattern, notes, channels, ticksPerStep ) {
	return {
		name: uid(),
		type: "emitter",
		parameters: {
			rhythm: {
				steps:pattern.steps,
				pulses:pattern.pulses,
				ticksPerStep: ticksPerStep,
				totalTicks: pattern.steps * ticksPerStep,
				offset:pattern.offset,
			 	retrigger:false,
			}, 
			indexer: "lfsr",
			channel : { seed:1, mask:0xC0, pool:channels },
			note : { seed:1, mask:0xC0, pool:notes },
			onVelocity : { seed:1, mask:0xC0, pool:[80]},
			offVelocity : { seed:1, mask:0xC0, pool:[60]},
			duration :{ seed:1, mask:0xC0, pool:[ticksPerStep]}
		},
	};
}

function generate_tree(mag, notes, channel, ticksPerStep)
{
	var k_pattern = incrementPattern( {steps:1,pulses:1,offset:0}, mag );
	var emitter_a = generate_emitter( k_pattern, notes, channel, ticksPerStep );
	var i_pattern = {steps:1,pulses:1,offset:0};

	var root_a = {
		name: uid(),
		type: "root",
		pool : [emitter_a.name],
		parameters : {
			rhythm: {
				steps:i_pattern.steps,
				pulses:i_pattern.pulses,
				ticksPerStep:k_pattern.steps * ticksPerStep,
				totalTicks:999999,
				offset:0,
				retrigger:false,
			}
		}
	};

	return [
		root_a,
		emitter_a,
		];
}
