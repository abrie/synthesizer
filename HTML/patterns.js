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
function generate_emitter( pattern, emitter ) {
	return {
		name: uid(),
		type: "emitter",
		parameters: {
			rhythm: generate_rhythmParameters(pattern),
			indexer: emitter.parameter("indexer"),
			channel : $.extend({},emitter.parameter("channel")),
			note : $.extend({},emitter.parameter("note")),
			onVelocity : $.extend({},emitter.parameter("onVelocity")),
			offVelocity : $.extend({},emitter.parameter("offVelocity")),
			duration :{ seed:1, mask:0xC0, pool:[pattern.ticksPerPulse]}
		},
	};
}

function generate_rhythmParameters( pattern ) {
	return {
		steps:pattern.steps,
		pulses:pattern.pulses,
		ticksPerStep: pattern.ticksPerStep,
		ticksPerPulse: pattern.ticksPerPulse,
		totalTicks: pattern.pulses * pattern.ticksPerPulse + (pattern.steps-pattern.pulses) * pattern.ticksPerStep,
		offset:pattern.offset,
		retrigger:pattern.retrigger,
	} 
}

function generate_tree( parameters )
{
	var k_pattern = {
		steps:parameters.emitter.parameter("rhythm").steps,
		pulses:parameters.emitter.parameter("rhythm").pulses,
		offset:parameters.emitter.parameter("rhythm").offset,
		ticksPerStep:parameters.emitter.parameter("rhythm").ticksPerStep,
		ticksPerPulse:parameters.emitter.parameter("rhythm").ticksPerPulse,
		retrigger:parameters.emitter.parameter("rhythm").retrigger
	};

	var emitter_a = generate_emitter( k_pattern, parameters.emitter  );
	var i_pattern = {steps:parameters.rSteps,pulses:parameters.rPulses,offset:k_pattern.offset};

	var root_a = {
		name: uid(),
		type: "root",
		pool : [emitter_a.name],
		parameters : {
			rhythm: {
				steps:parameters.rSteps,
				pulses:parameters.rPulses,
				ticksPerStep:emitter_a.parameters.rhythm.totalTicks,
				ticksPerPulse:emitter_a.parameters.rhythm.totalTicks,
				totalTicks:999999,
				offset:parameters.rOffset,
				retrigger:parameters.rRetrigger,
			}
		}
	};

	return [
		root_a,
		emitter_a,
		];
}
