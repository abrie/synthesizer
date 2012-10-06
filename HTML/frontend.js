DragDropMixin = {
	initializeDragDrop: function() {
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("dragleave",_.bind(this.dragLeave, this));
		this.$el.bind("drop",_.bind(this.drop, this));
		this.containedBy = undefined;
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
		if( !this.model.contains( dragNode ) )
		{
			dragNode.containedBy.remove( dragNode );
			this.model.add( dragNode );
		}
		e.preventDefault();
		e.stopPropagation();
	}
};

EmitterModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			type: "emitter",
			parameters: {
				rhythm: {
					steps:1,
					pulses:1,
					ticksPerStep:24,
					totalTicks:24,
					offset:0,
					retrigger:false,
					}, 
				indexer: "lfsr",
				channel : { seed:1, mask:0xC0, pool:[0] },
				note : { seed:1, mask:0xC0, pool:[36] },
				onVelocity : { seed:1, mask:0xC0, pool:[80]},
				offVelocity : { seed:1, mask:0xC0, pool:[60]},
				duration :{ seed:1, mask:0xC0, pool:[24]}
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
	attributes: function() {
		return {
			draggable:true,
			id:this.model.get("name"),
		}
	}, 
	className: "emitter",
	template: _.template( $("#template-emitter").html() ),
	initialize: function() {
		this.bind("all", this.render, this);
		this.model.bind("change", this.render, this);
		this.pianoWidget = new PianoWidget({model:this.model});
		this.rhythmWidget = new RhythmWidget( this.model, "rhythm" );
		this.cachedViews = {};
		this.cachedPiano = undefined;
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
		this.$(".rhythm").replaceWith( this.rhythmWidget.render().el );
		this.$(".note").replaceWith(this.renderView(indexer, "note"));
		this.$(".channel").replaceWith(this.renderView(indexer, "channel"));
		this.$(".duration").replaceWith(this.renderView(indexer, "duration"));
		this.$(".onVelocity").replaceWith(this.renderView(indexer, "onVelocity"));
		this.$("offVelocity").replaceWith(this.renderView(indexer, "offVelocity"));
		this.$(".piano").replaceWith(this.pianoWidget.render().el);

		return this;            
	}
});
_.extend(EmitterView.prototype, DragDropMixin);

NodeCollection = Backbone.Collection.extend({ });

BranchModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			pool : [],
			parameters : {
				rhythm: {
					steps:1,
					pulses:1,
					ticksPerStep:24,
					totalTicks:24000,
					offset:0,
					retrigger:false,
				}
			}
		};
	},
	add: function(node) {
		appModel.addNode(node);
		this.get("pool").push( node.get("name") );
		return this;
	},
	remove: function(model) {
		this.get("pool") = _.without(this.get("pool"), model.get("name")); 
		return this;
	},
	contains: function(model) {
		return this.get("pool").contains(model.get("name"));
	},
	parameters: function() {
		return this.get("parameters");
	},
	parameter: function(name) {
		return this.parameters()[name];
	}
});

BranchView = Backbone.View.extend( {
	tagName: "div",
    className: "branch",
	attributes: function() {
		return {
			draggable:true,
			id:this.model.get("name"),
		}
	}, 
	template: _.template( $('#template-branch').html() ),
	initialize: function() {
		_.bindAll(this, "render");
		this.rhythmWidget = new RhythmWidget( this.model, "rhythm" );
		this.initializeDragDrop();
	},
	events: {
		"click button.branch" : "newBranch",
		"click button.emitter" : "newEmitter",
	},
	newBranch: function(e) {
		var node = new BranchModel();
		node.set("type","branch");
		this.model.add(node);
		e.stopImmediatePropagation();
	},
	newEmitter: function(e) {
		var node = new EmitterModel();
		this.model.add(node);
		e.stopImmediatePropagation();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$("> .parameters > .rhythm").append( this.rhythmWidget.render().el );

		_.each( this.model.get("pool"), function(modelName) {
			var nodeModel = appModel.getNodeNamed(modelName);
			var tabWidget = new TabWidget({model:nodeModel});
			this.$("> .node-list").append( tabWidget.render().el );
		}, this);
		this.delegateEvents(this.events);
		return this;            
	}
});
_.extend(BranchView.prototype, DragDropMixin);

GeneratorModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			type: "generator",
			rSteps: 1,
			rPulses: 1,
			emitter: undefined,
		}
	},
	initialize: function() {
		var emitter = new EmitterModel();
		emitter.bind("change", this.emitterChanged, this);
		this.set("emitter", emitter);

	},
	parameter: function(name) {
		return this.get("emitter").parameter(name);
	},
	emitterChanged: function() {
		this.trigger("change");
	},
	treeParameters: function() {
		return {
			rSteps: this.get("rSteps"),
			rPulses: this.get("rPulses"),
			steps: this.parameter("rhythm").steps,
			pulses: this.parameter("rhythm").pulses,
			offset: this.parameter("rhythm").offset,
			notes: this.parameter("note").pool,
			channels: this.parameter("channel").pool, 
			ticksPerStep: this.parameter("rhythm").ticksPerStep,
		};
	},
	generate: function() {
		return generate_tree( this.treeParameters() );
	}
});

GeneratorCollection = Backbone.Collection.extend({model:GeneratorModel});

GeneratorView = Backbone.View.extend( {
	tagName: "div",
    className: "generator",
	template: _.template( $('#template-generator').html() ),
	initialize: function() {
		_.bindAll(this, "render");
		this.emitterView = new EmitterView({model:this.model.get("emitter")});
	},
	events: {
		"change input.r-pulses": "rPulsesEdited",
		"change input.r-steps": "rStepsEdited",
	},
	rStepsEdited: function(e) {
		this.model.set("rSteps", parseInt( $(e.target).val() ) );
	},
	rPulsesEdited: function(e) {
		this.model.set("rPulses", parseInt( $(e.target).val() ) );
	},
	render: function() {
		console.log(this);
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$("input.r-steps").val( this.model.get("rSteps") );
		this.$("input.r-pulses").val( this.model.get("rPulses") );
		this.$(".emitter").html( this.emitterView.render().el);
        this.delegateEvents(this.events);
		return this;            
	}
});

AppModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			nodes : new NodeCollection(),
			generators : new GeneratorCollection(), 
		};
	},
	reset: function() {
		this.get("nodes").reset();
		this.get("nodes").trigger("reset");
		return this;
	},
	addGenerator: function(node) {
		this.get("generators").add(node);
		return this;
	},
	addNode: function(node) {
		this.get("nodes").add(node);
		return this;
	},
	getNodes: function() {
		return this.get("nodes");
	},
	getNodeNamed: function(name) {
		var resultArray = this.get("nodes").where( {name:name} );
		return resultArray[0];
	},
	getGenerators: function() {
		return this.get("generators");
	},
});

AppView = Backbone.View.extend( {
	el: $("div#content"),
	template: _.template( $("#template-application").html() ),
	initialize: function() {
		_.bindAll(this, "render");
		this.model.get("nodes").bind("add", this.renderNodes, this);
		this.model.get("nodes").bind("remove", this.renderNodes, this);
		this.model.get("nodes").bind("reset", this.resetNodes, this);
		this.model.get("generators").bind("add", this.generatorChanged, this);
		this.model.get("generators").bind("change", this.generatorChanged, this);
		this.selectedNode = undefined;
		this.selectedGenerator = undefined;
		this.render();
	},
	events: {
		"click button.hide" : "hideNode",
		"click button.root" : "newRoot",
		"click button.generator" : "newGenerator",
		"click .generator-list > .tab.widget" : "generatorTabClicked",
		"click .node-list > .tab.widget" : "nodeTabClicked",
	},
	resetNodes: function() {
		this.selectedNode = undefined;
	},
	generatorChanged: function() {
		appModel.reset();
		this.model.get("generators").each( function(g) {
			generate_models( g.generate() );
		});
		publishAppModel();
		this.render();
	},
	generatorTabClicked : function(e) {
		var name = $(e.currentTarget).attr("id");
		var tab = this.model.get("generators").find( function(m) { 
			return m.get("name") === name; 
		}); 
		this.selectGenerator(tab);
	},
	nodeTabClicked : function(e) {
		var name = $(e.currentTarget).attr("id");
		var tab = this.model.get("nodes").find( function(m) { 
			return m.get("name") === name; 
		}); 
		this.selectNode(tab);
	},
	hideNode: function() {
		this.selectedNode = undefined;
		this.render();
	},
	selectGenerator: function(tab) {
		this.selectedGenerator = new GeneratorView({model:tab});
		this.render();
	},
	selectNode: function(node) {
		var type = node.get("type");
		if (type === "emitter") {
			this.selectedNode = new EmitterView({model:node});
		}
		else if (type === "branch" || type === "root") {
			this.selectedNode = new BranchView({model:node});
		}
		else {
			console.log("unrecognized node type");
		}
		this.render();
	},
	newGenerator: function(e) {
		var generator = new GeneratorModel();
		this.selectGenerator(generator);
		this.model.addGenerator(generator);
	},
	newRoot: function(e) {
		var root = new BranchModel();
		root.set("type","root");
		this.selectNode(root);
		this.model.addNode(root);
	},
	renderNodes: function() {
		if (this.selectedNode) {
			this.$("> .selected-node").html( this.selectedNode.render().el );
		}
		this.model.getNodes().each( function(node) {
			var nodeWidget = new TabWidget({model:node});
			this.$("> .node-list").append( nodeWidget.render().el );
		}, this );
	},
	renderGenerators: function() {
		if (this.selectedGenerator) {
			this.$("> .selected-generator").html( this.selectedGenerator.render().el );
		}
		
		this.model.getGenerators().each( function(generator) {
			var nodeWidget = new TabWidget({model:generator});
			this.$("> .generator-list").append( nodeWidget.render().el );
		}, this );
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.renderNodes();
		this.renderGenerators();
	},
});       

var appModel = new AppModel(); 
var appView = new AppView( { model: appModel } );

// process generated pattern
// function generate_tree(mag, notes, channel, ticksPerStep)
function generate_models(tree) {
	_.each( tree, function(dict) {
		if (dict.type === "branch" || dict.type == "root") {
			appModel.addNode( new BranchModel(dict) );
		}
		else if (dict.type === "emitter") {
			appModel.addNode( new EmitterModel(dict) );
		}
	}, this);
}

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

var tickIndicator = $("#tick-indicator");
var tickState = false;
var swapTickState = function() { tickState = !tickState; return tickState; };
function message_processor(message) {
	var json = JSON.parse(message);
	switch(json.type) {
		case "midi": switch(json.event) {
			case "t24":
				tickIndicator.attr("on",swapTickState());
				break;
			};
			break;
		case "emitter":
			var eEl =$("#"+json.name );
			eEl.attr("on", !(eEl.attr("on") == "true"));
			break;
	}
}

open_interfaceWebSocket("ws://yeux.local:12345/service", message_processor, publishAppModel );
$("#sync").click( publishAppModel );
