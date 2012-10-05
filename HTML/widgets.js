NodeWidget = Backbone.View.extend({
	tagname: "div",
	className: "node widget",
	attributes: function() {
		return {
			id:this.model.get("name"),
		}
	}, 
	template: _.template( $('#template-widget-node').html() ),
	initialize: function() {
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		return this;
	},
});

RhythmWidget = Backbone.View.extend( {
	tagname: "div",
	className: "rhythm widget",
	template: _.template( $('#template-widget-rhythm').html() ),
	initialize: function(model, fieldName) {
		this.model = model;
		this.model.bind("change", this.update, this);
		this.fieldName = fieldName;
		this.field = this.model.parameter(this.fieldName);
	},
	events: {
		"change input.steps" : "rhythmChanged",
		"change input.pulses" : "rhythmChanged",
		"change input.ticksPerStep" : "rhythmChanged",
		"change input.totalTicks" : "rhythmChanged",
		"change input.offset" : "rhythmChanged",
		"change input.retrigger" : "rhythmChanged",
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
	rhythmOffsetUp: function() {
		var modified = this.field.offset+1;
		this.field.offset = modified > this.field.steps ? this.field.steps : modified;
		this.model.trigger("change");
	},
	rhythmOffsetDown: function() {
		var modified = this.field.offset-1;
		this.field.offset = modified < 0 ? 0 : modified;
		this.model.trigger("change");
	},
	rhythmChanged: function() {
		this.field.steps = parseInt( this.stepsInput.val() );
		this.field.pulses = parseInt( this.pulsesInput.val() );
		this.field.ticksPerStep = parseInt( this.ticksPerStepInput.val() );
		this.field.totalTicks = parseInt( this.totalTicksInput.val() );
		this.field.offset = parseInt( this.offsetInput.val() );
		this.field.retrigger = this.retriggerInput.is(":checked");
		this.model.trigger("change");
	},
	update: function() {
		this.stepsInput.val( this.field.steps );
		this.pulsesInput.val( this.field.pulses );
		this.ticksPerStepInput.val( this.field.ticksPerStep );
		this.totalTicksInput.val( this.field.totalTicks );
		this.offsetInput.val( this.field.offset );
		this.retriggerInput.attr("checked",this.field.retrigger);
		return this;
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.stepsInput = this.$("input.steps");
		this.pulsesInput = this.$("input.pulses");
		this.ticksPerStepInput = this.$("input.ticksPerStep");
		this.totalTicksInput = this.$("input.totalTicks");
		this.offsetInput = this.$("input.offset");
		this.retriggerInput = this.$("input.retrigger");

        this.delegateEvents(this.events);
		return this.update();
	}
});

PianoWidget = Backbone.View.extend( {
	tagName: "div",
	className: "piano widget",
	pianoWidget_template: _.template( $("#template-widget-piano").html() ),
	pianokey_template: _.template( $("#pianokey-template").html() ),
	initialize: function( ) {
		this.field = this.model.parameter("note");
		this.canvas = undefined;
		this.ctx = undefined;
		this.numberOfOctaves = 4;
		this.numberOfKeys = 12*this.numberOfOctaves;
		this.hoverKey = undefined;
	},
	events: {
		"mouseup canvas.pianoCanvas" : "pianoKeyRelease",
		"mouseleave canvas.pianoCanvas" : "canvasMouseStoppedHovering",
		"mousemove canvas.pianoCanvas" : "canvasMouseHovering",
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
		var noteNumber = this.getNoteNumberForCoordinate(e.offsetX,e.offsetY);
		// no action on press... (TODO:send a midi note-on message)
		return false;
	},
	pianoKeyRelease: function(e) {
		var noteNumber = this.getNoteNumberForCoordinate(e.offsetX,e.offsetY);
		var isProgrammed = this.isPianokeyProgrammed( noteNumber );
		if (isProgrammed) {
			this.removePianokey(noteNumber);
		}
		else {
			this.addPianokey(noteNumber);
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
	isHoverKey : function(number) {
		return number === this.hoverKey;
	},
	drawCanvas : function() {
		var width = this.canvas.width;
		var keyWidth = this.canvas.width / (this.numberOfOctaves*7);
		var keyHeight = this.canvas.height;
		this.ctx.strokeStyle = "#000000";
		this.ctx.lineWidth = 1;
		var x = 0;
		for( var i = 0; i < this.numberOfKeys; i++ ) {
			if (this.whiteOrBlackPianokey(i) === "white") {
				if (this.isHoverKey(i)) {
					this.ctx.fillStyle = "#FF9090";
				}
				else {
					this.ctx.fillStyle = this.isPianokeyProgrammed(i) ? "#FF9000" : "#FFFFFF";
				}
				this.ctx.fillRect(x,0,keyWidth,keyHeight); 
				this.ctx.strokeRect(x,0,keyWidth,keyHeight);
				x+=keyWidth;  
			}

			if (this.whiteOrBlackPianokey(i-1) === "black") {
				if (this.isHoverKey(i-1)) {
					this.ctx.fillStyle = "#FF9090";
				}
				else {
					this.ctx.fillStyle = this.isPianokeyProgrammed(i-1) ? "#FF9000" : "#AAAAAA";
				}
				this.ctx.fillRect(x-keyWidth-keyWidth/2,0,keyWidth,keyHeight/2); 
				this.ctx.strokeRect(x-keyWidth-keyWidth/2,0,keyWidth,keyHeight/2);
			}
		}
	},
	getNoteNumberForCoordinate : function(x,y) {
		var keyWidth = this.canvas.width / (this.numberOfOctaves*7);
		var midKey = Math.floor( keyWidth / 2 );
		var keyHeight = this.canvas.height;
		var octave = Math.floor( x / (7*keyWidth) );
		var div = Math.floor( x / keyWidth ) - octave*7;
		var mod = Math.floor( x % keyWidth );
		var val = [0,2,4,5,7,9,11][div];
		if (y < keyHeight/2) {
			switch(val) {
				case 0: if (mod>midKey) { val++; }; break;
				case 2: if (mod>midKey) { val++; } else { val--; }; break;
				case 4: if (mod<midKey) { val--; }; break;
				case 5: if (mod>midKey) { val++; }; break;
				case 7: if (mod>midKey) { val++; } else { val--; }; break;
				case 9: if (mod>midKey) { val++; } else { val--; }; break;
				case 11: if (mod<midKey) { val--; } break;
			}
		}

		return val+octave*12;
	},
	canvasMouseStoppedHovering : function(e) {
		this.hoverKey = undefined;
		this.drawCanvas();
	},
	canvasMouseHovering : function(e) {
		this.hoverKey = this.getNoteNumberForCoordinate(e.offsetX,e.offsetY);
		this.drawCanvas();
	},
	render: function() {
		this.$el.html( this.pianoWidget_template() );
		this.canvas = this.$("canvas.pianoCanvas")[0];
		this.ctx = this.canvas.getContext("2d");
		this.drawCanvas();
        this.delegateEvents(this.events);
		return this;
	}     
});

LFSRWidget = Backbone.View.extend( {
	tagname: "div",
	className: "widget lfsr",
	template: _.template( $("#template-widget-lfsr").html() ),
	initialize: function(model,fieldName) {
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
		this.$(".fields > .label").html( this.fieldName );
        this.seedInput = this.$("input.seed");
        this.maskInput = this.$("input.mask");
		this.poolInput = this.$("input.pool");
        this.delegateEvents(this.events);
		return this.update();            
	}
});

SequentialWidget = Backbone.View.extend( {
	tagname: "div",
	className: "widget sequential",
	template: _.template( $("#template-widget-sequential").html() ),
	initialize: function(model,fieldName) {
		this.model = model;
		this.fieldName = fieldName;
		this.field = this.model.parameter(this.fieldName);
	},
	events: {
		"change input.pool" : "parameterChanged",
	},
	parameterChanged: function(e) {
		this.field.pool = inputToArray( this.poolInput );
		this.model.trigger("change");
	},
	update: function() {
		this.poolInput.val(this.field.pool);
		return this;
	},
	render: function() {
		this.$el.html( this.template() );
		this.$(".fields > .label").html(this.fieldName);
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
