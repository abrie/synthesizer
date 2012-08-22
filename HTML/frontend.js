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
		this.bind("all", this.render, this);
		this.model.bind("change", this.render, this);
		this.$el.attr("id",this.model.get("name"));
		this.pianoWidget = new PianoWidget({model:this.model});
		this.cachedViews = {};
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
		var keyHash = type+fieldName;
		var view = this.cachedViews[keyHash]; 
		if (view === undefined) {
			if (type === "lfsr") {
				view = new LFSRWidget(this.model,fieldName);
			}
			else if (type === "sequential") {
				view = new SequentialWidget(this.model,fieldName);
			}
			this.cachedViews[keyHash] = view;
		}
		return view.render().el;
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$(".name").html( "node:"+this.model.get("name") );

		this.indexerSelect = populateIndexerSelect(this.$("select.indexer"));
		this.indexerSelect.val( this.model.parameter("indexer") );
		
		var indexer = this.model.parameter("indexer");
		this.$(".note").html(this.renderView(indexer, "note"));
		this.$(".channel").html(this.renderView(indexer, "channel"));
		this.$(".duration").html(this.renderView(indexer, "duration"));
		this.$(".onVelocity").html(this.renderView(indexer, "onVelocity"));
		this.$(".offVelocity").html(this.renderView(indexer, "offVelocity"));
        
		this.$(".piano").html( this.pianoWidget.render().el );

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

InstrumentView = Backbone.View.extend( {
	tagName: "li",
    className: "instrument",
	template: _.template( $('#instrument-template').html() ),
	initialize: function() {
		console.log("instrument initialize");
		_.bindAll(this, "render");
		this.model.bind("change", this.render);
		this.$el.attr("id",this.model.get("name"));
		this.rhythmWidget = new RhythmWidget( {model:this.model} );
		this.cachedViews = {};
		this.initializeDragDrop();
	},
	events: {
		"click button.branch" : "newBranch",
		"click button.emitter" : "newEmitter",
	},
	newBranch: function() {
		var node = new NodeModel();
		node.containedBy = this.model;
		node.bind("change", publishAppModel);
		this.model.rootNodes().add(node);
		this.model.trigger("change");
	},
	newEmitter: function() {
		var node = new EmitterModel();
		node.containedBy = this.model;
		node.bind("change", publishAppModel);
		this.model.rootNodes().add(node);
		this.model.trigger("change");
	},
	renderView: function(model) {
		var result = this.cachedViews[model.cid];
		if (result === undefined) {
			var type = model.get("type");
			if (type === "branch") {
				result = new NodeView({model:model});
			}
			else if (type === "emitter") {
				result = new EmitterView({model:model});
			}
			this.cachedViews[model.cid] = result;
		}
		return result.render().el;
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$(".rhythm").html( this.rhythmWidget.render().el );

		this.model.rootNodes().each( function(model) {
			this.$("> ul.nodes").append( this.renderView(model) );
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
	instrumentModel.bind("change", publishAppModel);
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
