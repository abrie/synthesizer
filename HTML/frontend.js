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

LFSRView = Backbone.View.extend( {
	tagname: "div",
	className: "lfsr",
	template: _.template( $("#lfsr-template").html() ),
	initialize: function( model, parameterName ) {
		_.bindAll(this, "render");
		this.targetParameterName = parameterName;
		this.targetParameter = model.parameter(parameterName);
	},
	events: {
		"change input.seed" : "parameterChanged",
		"change input.mask" : "parameterChanged",
		"change input.pool" : "parameterChanged",
	},
	parameterChanged: function(e) {
		this.targetParameter["seed"] = parseInt( this.seedInput.val() );
		this.targetParameter["mask"] = parseInt( this.maskInput.val() );
		this.targetParameter["pool"] = inputToArray( this.poolInput );
	},
	render: function() {
		this.$el.html( this.template() );
		this.$(".name").html( this.targetParameterName );
        this.seedInput = this.$("input.seed");
		this.seedInput.val( this.targetParameter["seed"] );
        this.maskInput = this.$("input.mask");
		this.maskInput.val( this.targetParameter["mask"] );
		this.poolInput = this.$("input.pool");
		this.poolInput.val( this.targetParameter["pool"] );
		return this;            
	}
});

SequentialView = Backbone.View.extend( {
	tagname: "div",
	className: "sequential",
	template: _.template( $("#sequential-template").html() ),
	initialize: function( model, parameterName ) {
		_.bindAll(this, "render");
		this.targetParameterName = parameterName;
		this.targetParameter = model.parameter(parameterName);
	},
	events: {
		"change input.direction" : "parameterChanged",
		"change input.pool" : "parameterChanged",
	},
	parameterChanged: function(e) {
		this.targetParameter["direction"] = parseInt( this.directionInput.val() );
		this.targetParameter["pool"] = inputToArray( this.poolInput );
	},
	render: function() {
		this.$el.html( this.template() );
		this.$(".name").html( this.targetParameterName );
        this.directionInput = this.$("input.direction");
		this.directionInput.val( this.targetParameter["direction"] );
		this.poolInput = this.$("input.pool");
		this.poolInput.val( this.targetParameter["pool"] );
		return this;            
	}
});

var indexerViews = {lfsr:LFSRView, sequential:SequentialView};
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
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("dragleave",_.bind(this.dragLeave, this));
		this.$el.bind("drop",_.bind(this.drop, this));
		this.$el.attr("id",this.model.get("name"));
		this.render();
	},
	events: {
		"change select.indexer" : "parameterChanged",
		"change input.note" : "parameterChanged",
		"change input.channel" : "parameterChanged",
		"change input.duration" : "parameterChanged",
        "change input.onVelocity" : "parameterChanged",
        "change input.offVelocity" : "parameterChanged",
	},
    dragStart: function(e) {
		dragNode = this.model;
		e.stopPropagation();
	},                      
	dragOver: function(e) {
		if (dragNode != this.model ) {
			this.$el.addClass("dragOver");
		}
		return false;
	},
	dragLeave: function(e) {
		this.$el.removeClass("dragOver");
		return false;
	},
	drop: function(e) {
		this.$el.removeClass("dragOver");
		if( !this.model.parameter("pool").contains( dragNode ) )
		{
			this.model.parameter("pool").add( dragNode );
			dragNode.containedBy.parameter("pool").remove( dragNode );
			dragNode.containedBy = this.model;
		}
		e.preventDefault();
		e.stopPropagation();
	},
	parameterChanged: function(e) {
		this.model.parameters()["indexer"] = this.indexerSelect.val();
		this.render();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$(".name").html( "node:"+this.model.get("name") );

		this.indexerSelect = populateIndexerSelect( this.$("select.indexer") );
		this.indexerSelect.val( this.model.parameter("indexer") );
		
		var viewType = getViewType( this.model.parameter("indexer") );
		this.$(".note").html( new viewType(this.model,"note").render().el );
		this.$(".channel").html( new viewType(this.model,"channel").render().el );
		this.$(".duration").html( new viewType(this.model,"duration").render().el );
		this.$(".onVelocity").html( new viewType(this.model,"onVelocity").render().el );
		this.$(".offVelocity").html( new viewType(this.model,"offVelocity").render().el );

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
		e.stopPropagation();
	},                      
	dragOver: function(e) {
		this.$el.addClass("dragOver");
		return false;
	},
	drop: function(e) {
		this.$el.addClass("dragOver");
		if( !this.model.get("pool").contains( dragNode ) )
		{
			this.model.get("pool").add( dragNode );
			dragNode.containedBy.get("pool").remove( dragNode );
			dragNode.containedBy = this.model;
		}
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
		this.model.rootNodes().bind("remove", this.render);
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("dragleave",_.bind(this.dragLeave, this));
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
