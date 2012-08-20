PianoboardView = Backbone.View.extend( {
	tagName: "div",
	className: "pianoboard",
	pianoboard_template: _.template( $("#pianoboard-template").html() ),
	pianokey_template: _.template( $("#pianokey-template").html() ),
	initialize: function( model, fieldName ) {
		_.bindAll(this, "render");
		this.model = model;
		this.fieldName = fieldName;
		this.field = model.parameter(fieldName);
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
		this.$el.html( this.pianoboard_template() );
		for( var i = 2*12; i < 7*12; i++ ) {
			this.$("ul.pianokeys").append(this.makePianokey(i));
		}

		return this;
	}     
});

DragDropMixin = {
	initializeDragDrop: function() {
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("dragleave",_.bind(this.dragLeave, this));
		this.$el.bind("drop",_.bind(this.drop, this));
	},
    dragStart: function(e) {
		dragNode = this.model;
		e.stopPropagation();
	},                      
	dragOver: function(e) {
		this.$el.addClass("dragOver");
		return false;
	},
	dragLeave: function(e) {
		this.$el.removeClass("dragOver");
		return false;
	},
	drop: function(e) {
		this.$el.removeClass("dragOver");
		if( !this.model.get("pool").contains( dragNode ) )
		{
			this.model.get("pool").add( dragNode );
			dragNode.containedBy.get("pool").remove( dragNode );
			dragNode.containedBy = this.model;
		}
		e.preventDefault();
		e.stopPropagation();
	}
};

NodeCollection = Backbone.Collection.extend({ });

NodeModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			type: "branch",
			pool: new NodeCollection(),
		};
	},
	initialize: function() {
		this.containedBy = null;
	}
});

EmitterModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			type: "emitter",
			parameters: {
				indexer: "lfsr",
				channel : { seed:1, mask:0xC0, pool:[0] },
				note : { seed:1, mask:0xC0, pool:[36] },
				onVelocity : { seed:1, mask:0xC0, pool:[64,54,44,34,65]},
				offVelocity : { seed:1, mask:0xC0, pool:[60]},
				duration :{ seed:1, mask:0xC0, pool:[1]}
			},
		};
	},
	initialize: function() {
		this.containedBy = null;
	},
	parameters: function() {
		return this.get("parameters");
	},
	parameter: function(name) {
		return this.parameters()[name];
	}
});


EmitterView = Backbone.View.extend( {
	tagname: "li",
    attributes: { "draggable" : true },
	className: "emitter",
	template: _.template( $("#emitter-template").html() ),
	initialize: function() {
		_.bindAll(this, "render");
		this.model.bind("change", this.render);
		this.model.bind("change", publishAppModel);
		this.$el.attr("id",this.model.get("name"));
		this.initializeDragDrop();
	},
	events: {
		"change select.indexer" : "parameterChanged",
	},
	parameterChanged: function(e) {
		this.model.parameters().indexer = this.indexerSelect.val();
		this.model.trigger("change");
	},
	renderView: function( type, fieldName ) {
		var view = new type(this.model, fieldName);
		return view.render().el;
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$(".name").html( "node:"+this.model.get("name") );

		this.indexerSelect = populateIndexerSelect(this.$("select.indexer"));
		this.indexerSelect.val( this.model.parameter("indexer") );
		
		var type = getViewType( this.model.parameter("indexer"));
		this.$(".note").html(this.renderView(type, "note"));
		this.$(".channel").html(this.renderView(type, "channel"));
		this.$(".duration").html(this.renderView(type, "duration"));
		this.$(".onVelocity").html(this.renderView(type, "onVelocity"));
		this.$(".offVelocity").html(this.renderView(type, "offVelocity"));

		var pianoView = new PianoboardView(this.model, "note");
		this.$(".piano").html( pianoView.render().el );

		return this;            
	}
});
_.extend(EmitterView.prototype, DragDropMixin);

NodeView = Backbone.View.extend( {
	tagname: "li",
	className: "node",
    attributes: { "draggable" : true },
	template: _.template( $("#node-template").html() ),
	initialize: function() {
		_.bindAll(this, "render");
		this.model.bind("change", this.render);
		this.model.get("pool").bind("add", this.render);
		this.model.get("pool").bind("remove", this.render);
		this.$el.attr("id",this.model.get("name"));
		this.initializeDragDrop();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$(".name").html("node:"+this.model.get("name"));
		this.model.get("pool").each( function(node) {
			var type = node.get("type");
			if (type === "branch") {
				var view = new NodeView({model:node});
				this.$("> ul.pool").append( view.render().el );
			}
			else if (type == "emitter") {
				var view = new EmitterView({model:node});
				this.$("> ul.pool").append( view.render().el );
			}
			
		}, this);
		return this;            
	}
});
_.extend(NodeView.prototype, DragDropMixin);

InstrumentModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			type: "root",
			pool : new NodeCollection(),
			parameters : {steps:8, pulses:5, pulsesPerStep:24}
		};
	},
	rootNodes: function() {
		return this.get("pool");
	}
});

function modifyRhythm( steps, pulses, amount )
{
	var newPulses = pulses + amount;
	var newSteps = steps;

	if (newPulses > steps) {
		newPulses = 1;
		newSteps++;
	}
	else if (newPulses == 0) {
		newSteps--;
		newPulses = newSteps;
	}

	return {steps:newSteps, pulses:newPulses};
}

InstrumentView = Backbone.View.extend( {
	tagName: "li",
    className: "instrument",
	template: _.template( $('#instrument-template').html() ),
	initialize: function() {
		_.bindAll(this, "render");
		this.model.bind("change", this.render);
		this.model.rootNodes().bind("add", this.render);
		this.model.rootNodes().bind("remove", this.render);
		this.$el.attr("id",this.model.get("name"));
		this.initializeDragDrop();
	},
	events: {
		"click button.branch" : "newBranch",
		"click button.emitter" : "newEmitter",
		"click button.rhythmUp" : "rhythmUp",
		"click button.rhythmDown" : "rhythmDown",
		"change input.steps" : "rhythmChanged",
		"change input.pulses" : "rhythmChanged",
		"change input.pulsesPerStep" : "rhythmChanged",
	},
	newBranch: function() {
		var node = new NodeModel();
		node.containedBy = this.model;
		this.model.rootNodes().add(node);
		this.render();
	},
	newEmitter: function() {
		var node = new EmitterModel();
		node.containedBy = this.model;
		this.model.rootNodes().add(node);
		this.render();
	},
	rhythmUp: function() {
		parameters = this.model.get("parameters");
		var modified = modifyRhythm( parameters.steps, parameters.pulses, 1 );
		parameters.steps = modified.steps;
		parameters.pulses = modified.pulses;
		this.render();
	},
	rhythmDown: function() {
		parameters = this.model.get("parameters");
		var modified = modifyRhythm( parameters.steps, parameters.pulses, -1 );
		parameters.steps = modified.steps;
		parameters.pulses = modified.pulses;
		this.render();
	},
	rhythmChanged: function() {
		parameters = this.model.get("parameters");
		parameters.steps = parseInt( this.stepsInput.val() );
		parameters.pulses = parseInt( this.pulsesInput.val() );
		parameters.pulsesPerStep = parseInt( this.pulsesPerStepInput.val() );
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.stepsInput = this.$("input.steps");
		this.stepsInput.val( this.model.get("parameters").steps );
		this.pulsesInput = this.$("input.pulses");
		this.pulsesInput.val( this.model.get("parameters").pulses );
		this.pulsesPerStepInput = this.$("input.pulsesPerStep");
		this.pulsesPerStepInput.val( this.model.get("parameters").pulsesPerStep );

		this.model.rootNodes().each( function(node) {
			var type = node.get("type");
			if (type === "branch") {
				var view = new NodeView({model:node});
				this.$("> ul.nodes").append( view.render().el );
			}
			else if (type === "emitter") {
				var view = new EmitterView({model:node});
				this.$("> ul.nodes").append( view.render().el );
			}
			
		}, this);
		return this;            
	}
});
_.extend(InstrumentView.prototype, DragDropMixin);

InstrumentModelCollection = Backbone.Collection.extend( {
	model : InstrumentModel,
} );

AppModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			instruments : new InstrumentModelCollection()
		};
	},
	addInstrument: function(instrument) {
		this.get("instruments").add(instrument);
		return this;
	}
});

AppView = Backbone.View.extend( {
	el: $("ul#content"),
	initialize: function() {
		this.render();
	},
	addInstrument: function( instrument ) {
		this.model.addInstrument( instrument );
		this.render();
		return this;
	},
	render: function() {
		this.$el.empty();
		this.model.get("instruments").each( function(instrument) {
			var view = new InstrumentView( { model:instrument } );
			this.$el.append( view.render().el );
		}, this );
	},
});       

var appModel = new AppModel(); 
var appView = new AppView( { model: appModel } );
$("#new").click( function() {
	var instrumentModel = new InstrumentModel();
	appView.addInstrument( instrumentModel );
});

function publishAppModel() {
	var message = { toFeelers: appModel.toJSON() };
	send_data(message);
}

$("input[name='sync_mode']").change ( function() {
	var mode = $("input[name='sync_mode']:checked").val();
	transmit_sequencer_sync( mode );
});

$("#render").click( function() {
	appView.render();
});

function message_processor(evt) {
	console.log(evt);
}

open_interfaceWebSocket("ws://yeux.local:12345/service", message_processor );
$("#sync").click( publishAppModel );
