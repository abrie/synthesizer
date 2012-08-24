RhythmWidget = Backbone.View.extend( {
	tagname: "div",
	className: "rhythmWidget",
	template: _.template( $('#rhythmWidget-template').html() ),
	initialize: function(model, fieldName) {
		console.log("initialize LFSRWidget. model:",model,"fieldName:",fieldName);
		this.model = model;
		this.model.bind("change", this.update, this);
		this.fieldName = fieldName;
		this.field = this.model.parameter(this.fieldName);
		this.patternKnobValue = 0;
		this.patternKnobPrevious = 0;
	},
	events: {
		"change input.steps" : "rhythmChanged",
		"change input.pulses" : "rhythmChanged",
		"change input.pulsesPerStep" : "rhythmChanged",
		"change input.offset" : "rhythmChanged",
	},
	rhythmUp: function() {
		var modified = modifyRhythm( this.field.steps, this.field.pulses, 1 );
		this.field.steps = modified.steps;
		this.field.pulses = modified.pulses;
		this.model.trigger("change");
	},
	rhythmDown: function() {
		var modified = modifyRhythm( this.field.steps, this.field.pulses, -1 );
		this.field.steps = modified.steps;
		this.field.pulses = modified.pulses;
		this.model.trigger("change");
	},
	rhythmChanged: function() {
		this.field.steps = parseInt( this.stepsInput.val() );
		this.field.pulses = parseInt( this.pulsesInput.val() );
		this.field.pulsesPerStep = parseInt( this.pulsesPerStepInput.val() );
		this.field.offset = parseInt( this.offsetInput.val() );
		this.model.trigger("change");
	},
	patternKnobChange: function(v) {
		var delta = v - this.patternKnobPrevious;
		this.patternKnobPrevious = v;
	    if (delta > 0) {
			this.patternKnobValue+=1;
			this.rhythmUp();
		}
		else if (delta < 0) {
			this.patternKnobValue-=1;
			this.rhythmDown();
		}
	},
	update: function() {
		this.stepsInput.val( this.field.steps );
		this.pulsesInput.val( this.field.pulses );
		this.pulsesPerStepInput.val( this.field.pulsesPerStep );
		this.offsetInput.val( this.field.offset );
		this.patternKnob.val(this.patternKnobValue);
		return this;
	},
	render: function() {
		this.$el.html( this.template() );
		this.stepsInput = this.$("input.steps");
		this.pulsesInput = this.$("input.pulses");
		this.pulsesPerStepInput = this.$("input.pulsesPerStep");
		this.offsetInput = this.$("input.offset");
		this.patternKnob = this.$("input.pattern-knob").knob( {
			min : 0,
			max : 100,
			stopper : true,
			change : _.bind(this.patternKnobChange,this),
		});
        this.delegateEvents(this.events);
		return this.update();
	}
});

PianoWidget = Backbone.View.extend( {
	tagName: "div",
	className: "pianoWidget",
	pianoWidget_template: _.template( $("#pianoWidget-template").html() ),
	pianokey_template: _.template( $("#pianokey-template").html() ),
	initialize: function( ) {
		this.field = this.model.parameter("note");
	},
	events: {
        "mousedown li.pianokey" : "pianoKeyPress",
		"mouseup li.pianokey" : "pianoKeyRelease"
	},
	noteNumberOfPianokey : function(pianoKey) {
		return parseInt( $(pianoKey).attr("note_number") );
	},
	whiteOrBlackPianokey : function(noteNumber) {
		return _.find( [1,3,6,8,10], function(n) { 
			return (noteNumber%12) / n == 1;
		}) ? "black" : "white";
	},
	isPianokeyProgrammed: function(noteNumber) {
		var indexInPool = this.field.pool.indexOf(noteNumber); 
		 return indexInPool >= 0;
	},
	addPianokey: function(noteNumber) {
		this.field.pool.push(noteNumber);
		this.model.trigger("change");
	},
	removePianokey: function(noteNumber) {
		var filtered = this.field.pool.filter( function(i) {
			return i != noteNumber
		});
		this.field.pool = filtered;
		this.model.trigger("change");
	},
	pianoKeyPress: function(e) {
		var noteNumber = this.noteNumberOfPianokey( e.currentTarget );
		// no action on press... (TODO:send a midi note-on message)
		return false;
	},
	pianoKeyRelease: function(e) {
		var noteNumber = this.noteNumberOfPianokey( e.currentTarget );
		var isProgrammed = this.isPianokeyProgrammed( noteNumber );
		if (isProgrammed) {
			this.removePianokey(noteNumber);
			$(e.currentTarget).attr("state","off");
		}
		else {
			this.addPianokey(noteNumber);
			$(e.currentTarget).attr("state","on");
		}
		return false;
	},
	makePianokey: function( noteNumber ) {
		return this.pianokey_template( {
			note_number: noteNumber,
			whiteblack: this.whiteOrBlackPianokey(noteNumber),
			state: this.isPianokeyProgrammed(noteNumber) ? "on" : "off" 
		});
	},
	render: function() {
		this.$el.html( this.pianoWidget_template() );
		for( var i = 2*12; i < 7*12; i++ ) {
			this.$("ul.pianokeys").append(this.makePianokey(i));
		}
        this.delegateEvents(this.events);
		return this;
	}     
});

LFSRWidget = Backbone.View.extend( {
	tagname: "div",
	className: "lfsrWidget",
	template: _.template( $("#lfsrWidget-template").html() ),
	initialize: function(model,fieldName) {
		console.log("initialize LFSRWidget. model:",model,"fieldName:",fieldName);
		this.model = model;
		this.fieldName = fieldName;
		this.field = this.model.parameter(this.fieldName);
	},
	events: {
		"change input.seed" : "parameterChanged",
		"change input.mask" : "parameterChanged",
		"change input.pool" : "parameterChanged",
	},
	parameterChanged: function(e) {
		this.field.seed = parseInt( this.seedInput.val() );
		this.field.mask = parseInt( this.maskInput.val() );
		this.field.pool = inputToArray( this.poolInput );
		this.model.trigger("change");
	},
	update: function() {
        this.seedInput.val(this.field.seed);
        this.maskInput.val(this.field.mask);
		this.poolInput.val(this.field.pool);
		return this;
	},
	render: function() {
		this.$el.html( this.template() );
		this.$(".name").html( this.fieldName );
        this.seedInput = this.$("input.seed");
        this.maskInput = this.$("input.mask");
		this.poolInput = this.$("input.pool");
        this.delegateEvents(this.events);
		return this.update();            
	}
});

SequentialWidget = Backbone.View.extend( {
	tagname: "div",
	className: "sequentialWidget",
	template: _.template( $("#sequentialWidget-template").html() ),
	initialize: function(model,fieldName) {
		console.log("initialize SequentialWidget. model:",model,"fieldName:",fieldName);
		this.model = model;
		this.fieldName = fieldName;
		this.field = this.model.parameter(this.fieldName);
	},
	events: {
		"change input.direction" : "parameterChanged",
		"change input.pool" : "parameterChanged",
	},
	parameterChanged: function(e) {
		this.field.step = parseInt( this.stepInput.val() );
		this.field.pool = inputToArray( this.poolInput );
		this.model.trigger("change");
	},
	update: function() {
        this.stepInput.val(this.field.step);
		this.poolInput.val(this.field.pool);
		return this;
	},
	render: function() {
		this.$el.html( this.template() );
		this.$(".name").html(this.fieldName);
        this.stepInput = this.$("input.step");
		this.poolInput = this.$("input.pool");
        this.delegateEvents(this.events);
		return this.update();            
	}
});

var indexerViews = {lfsr:LFSRWidget, sequential:SequentialWidget};
function populateIndexerSelect( select, current ) {
	_.each( indexerViews, function(type, name) {
		select[0].add( new Option( name, name ) );
	}); 

	return select;
}

function getViewType( type )
{
	return indexerViews[type];
}
