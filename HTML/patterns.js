function generate_emitter( emitter ) {
	return {
		name: uid(),
		type: "emitter",
		parameters: {
			rhythm: generate_rhythmParameters(emitter.parameter("rhythm")),
			indexer: emitter.parameter("indexer"),
			channel : $.extend({},emitter.parameter("channel")),
			note : $.extend({},emitter.parameter("note")),
			onVelocity : $.extend({},emitter.parameter("onVelocity")),
			offVelocity : $.extend({},emitter.parameter("offVelocity")),
			duration :{ seed:1, mask:0xC0, pool:[emitter.parameter("rhythm").get("ticksPerPulse")]}
		},
	};
}

function generate_rhythmParameters( pattern ) {
	return {
		steps:pattern.get("steps"),
		pulses:pattern.get("pulses"),
		ticksPerStep: pattern.get("ticksPerStep"),
		ticksPerPulse: pattern.get("ticksPerPulse"),
		totalTicks: pattern.get("pulses") * pattern.get("ticksPerPulse") + 
			(pattern.get("steps") - pattern.get("pulses")) * pattern.get("ticksPerStep"),
		offset:pattern.get("offset"),
		retrigger:pattern.get("retrigger"),
	} 
}

function generate_tree( model )
{
	var emitter_a = generate_emitter( model.get("emitter") );

	var root_a = {
		name: uid(),
		type: "root",
		pool : [emitter_a.name],
		parameters : {
			rhythm: {
				steps:model.get("rhythm").get("steps"),
				pulses:model.get("rhythm").get("pulses"),
				ticksPerStep:emitter_a.parameters.rhythm.totalTicks,
				ticksPerPulse:emitter_a.parameters.rhythm.totalTicks,
				totalTicks:999999,
				offset:model.get("rhythm").get("offset"),
				retrigger:model.get("rhythm").get("retrigger"),
			}
		}
	};

	return [
		root_a,
		emitter_a,
		];
}
