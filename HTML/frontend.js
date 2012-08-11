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
	var result = _.map( input.val().split(','), function(val) {
		if(val == 0) {
			return 0;
		}
		var parsed = parseNotation(val);
		return parseInt( parsed ) || val;
	});

	return result;
}

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
				channel : [0],
				note : [36],
				onVelocity : [64,54,44,34,65],
				offVelocity : [60],
				duration :[1]
			},
		};
	},
	initialize: function() {
		this.containedBy = null;
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
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("drop",_.bind(this.drop, this));
		this.$el.attr("id",this.model.get("name"));
		this.render();
	},
	events: {
		"change input.note" : "parameterChanged",
		"change input.channel" : "parameterChanged",
		"change input.duration" : "parameterChanged",
	},
    dragStart: function(e) {
		dragNode = this.model;
		console.log("dragStart:", dragNode.get("name"));
		e.stopPropagation();
	},                      
	dragOver: function(e) {
		return false;
	},
	drop: function(e) {
		console.log("dropped into:", this.model.get("name") );
		console.log("dragged node:", dragNode.get("name") );
		console.log("dragNode was containedBy:", dragNode.containedBy.get("name"));
		if( !this.model.get("pool").contains( dragNode ) )
		{
			this.model.get("pool").add( dragNode );
			dragNode.containedBy.get("pool").remove( dragNode );
			dragNode.containedBy = this.model;
		}
		console.log("dragNode now containedBy:", dragNode.containedBy.get("name"));
		e.preventDefault();
		e.stopPropagation();
	},
	parameterChanged: function(e) {
		parameters = this.model.get("parameters");
		parameters["note"] = inputToArray( this.noteInput );
		parameters["channel"] = inputToArray( this.channelInput );
		parameters["duration"] = inputToArray( this.durationInput );
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$(".name").html( "node:"+this.model.get("name") );
		this.noteInput = this.$("input.note");
		this.noteInput.val( this.model.get("parameters")["note"] );
		this.channelInput = this.$("input.channel");
		this.channelInput.val( this.model.get("parameters")["channel"] );
		this.durationInput = this.$("input.duration");
		this.durationInput.val( this.model.get("parameters")["duration"] );
		return this;            
	}
});

NodeView = Backbone.View.extend( {
	tagname: "li",
    attributes: { "draggable" : true },
	className: "node",
	template: _.template( $("#node-template").html() ),
	initialize: function() {
		_.bindAll(this, "render");
		this.model.bind("change", this.render);
		this.model.get("pool").bind("add", this.render);
		this.model.get("pool").bind("remove", this.render);
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("drop",_.bind(this.drop, this));
		this.$el.attr("id",this.model.get("name"));
		this.render();
	},
    dragStart: function(e) {
		dragNode = this.model;
		console.log("dragStart:", dragNode.get("name"));
		e.stopPropagation();
	},                      
	dragOver: function(e) {
		return false;
	},
	drop: function(e) {
		console.log("dropped into:", this.model.get("name") );
		console.log("dragged node:", dragNode.get("name") );
		console.log("dragNode was containedBy:", dragNode.containedBy.get("name"));
		if( !this.model.get("pool").contains( dragNode ) )
		{
			this.model.get("pool").add( dragNode );
			dragNode.containedBy.get("pool").remove( dragNode );
			dragNode.containedBy = this.model;
		}
		console.log("dragNode now containedBy:", dragNode.containedBy.get("name"));
		e.preventDefault();
		e.stopPropagation();
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

InstrumentView = Backbone.View.extend( {
	tagName: "li",
    className: "instrument",
	template: _.template( $('#instrument-template').html() ),
	initialize: function() {
		_.bindAll(this, "render");
		this.model.bind("change", this.render);
		this.model.rootNodes().bind("add", this.render);
		this.render();
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("drop",_.bind(this.drop, this));
		this.$el.attr("id",this.model.get("name"));
	},
	events: {
		"click button.new" : "newNode",
		"click button.emitter" : "newEmitter",
		"change input.steps" : "rhythmChanged",
		"change input.pulses" : "rhythmChanged",
		"change input.pulsesPerStep" : "rhythmChanged",
	},
	newNode: function() {
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
	rhythmChanged: function() {
		parameters = this.model.get("parameters");
		parameters["steps"] = this.stepsInput.val();
		parameters["pulses"] = this.pulsesInput.val();
		parameters["pulsesPerStep"] = this.pulsesPerStepInput.val();
	},
    dragStart: function(e) { },                      
	dragOver: function(e) {
		return false;
	},
	drop: function(e) {
		console.log("dropped into:", this.model.get("name") );
		console.log("dragged node:", dragNode.get("name") );
		console.log("dragNode was containedBy:", dragNode.containedBy.get("name"));
		if( !this.model.get("pool").contains( dragNode ) )
		{
			this.model.get("pool").add( dragNode );
			dragNode.containedBy.get("pool").remove( dragNode );
			dragNode.containedBy = this.model;
		}
		console.log("dragNode now containedBy:", dragNode.containedBy.get("name"));
		e.preventDefault();
		e.stopPropagation();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.stepsInput = this.$("input.steps");
		this.stepsInput.val( this.model.get("parameters")["steps"] );
		this.pulsesInput = this.$("input.pulses");
		this.pulsesInput.val( this.model.get("parameters")["pulses"] );
		this.pulsesPerStepInput = this.$("input.pulsesPerStep");
		this.pulsesPerStepInput.val( this.model.get("parameters")["pulsesPerStep"] );
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
	report: function() {
		var message = { toFeelers: this.model.toJSON() };
		send_data(message);
	},
	render: function() {
		this.$el.empty();
		this.model.get("instruments").each( function(instrument) {
			var view = new InstrumentView( { model:instrument } );
			this.$el.append( view.render().el );
		}, this );
	},
});       

appView = new AppView( { model: new AppModel() } );
$("#new").click( function() {
	var instrumentModel = new InstrumentModel();
	appView.addInstrument( instrumentModel );
});

$("input[name='sync_mode']").change ( function() {
	var mode = $("input[name='sync_mode']:checked").val();
	transmit_sequencer_sync( mode );
});

$("#render").click( function() {
	appView.render();
	appView.debug();
});

function message_processor(evt) {
	console.log(evt);
}

open_interfaceWebSocket("ws://yeux.local:12345/service", message_processor );
$("#sync").click( function() {
	appView.report();
});
