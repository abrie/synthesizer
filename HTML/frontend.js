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
					ticksPerPulse:24,
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
					ticksPerPulse:24,
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
			rTicksPerStep: 1,
			rTicksPerPulse: 1,
			emitter: undefined,
		}
	},
	initialize: function() {
		var emitter = new EmitterModel(this.get("emitter"));
		emitter.bind("change", this.emitterChanged, this);
		this.set("emitter", emitter);

	},
	parameter: function(name) {
		return this.get("emitter").parameter(name);
	},
	emitterChanged: function() {
		this.trigger("change",this);
	},
	treeParameters: function() {
		return {
			rSteps: this.get("rSteps"),
			rPulses: this.get("rPulses"),
			rTicksPerStep: this.get("rTicksPerStep"),
			rTicksPerPulse: this.get("rTicksPerPulse"),
			emitter: this.get("emitter"),
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
		this.rStepsInputs = undefined;
		this.rPulsesInputs = undefined;
		this.rTicksPerStepInput = undefined;
		this.rTicksPerPulse = undefined;
	},
	events: {
		"change input.r-pulses": "rPulsesEdited",
		"change input.r-steps": "rStepsEdited",
		"change input.r-ticksPerPulse": "rTicksPerPulseEdited",
		"change input.r-ticksPerStep": "rTicksPerStepEdited",
	},
	rStepsEdited: function(e) {
		var rSteps = parseInt( $(e.target).val() );    
		this.model.set( {rSteps:rSteps, silent:true} );
	},
	rPulsesEdited: function(e) {
		var rPulses = parseInt( $(e.target).val() );    
		this.model.set( {rPulses:rPulses, silent:true} );
	},
	rTicksPerPulseEdited: function(e) {
		var rTicksPerPulse = parseInt( $(e.target).val() );    
		this.model.set( {rTicksPerPulse:rTicksPerPulse, silent:true} );
	},
	rTicksPerStepEdited: function(e) {
		var rTicksPerStep = parseInt( $(e.target).val() );    
		this.model.set( {rTicksPerStep:rTicksPerStep, silent:true} );
	},
	update : function() {
		this.rStepsInputs.val( this.model.get("rSteps") );
		this.rPulsesInputs.val( this.model.get("rPulses") );
		this.rTicksPerStepInput.val( this.model.get("rTicksPerStep") );
		this.rTicksPerPulseInput.val( this.model.get("rTicksPerPulse") );
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.rStepsInputs = this.$("input.r-steps");
		this.rPulsesInputs = this.$("input.r-pulses");
		this.rTicksPerStepInput = this.$("input.r-ticksPerStep");
		this.rTicksPerPulseInput = this.$("input.r-ticksPerPulse");
		this.$(".emitter").html( this.emitterView.render().el);
		this.update();
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
	resetGenerators: function() {
		this.get("generators").reset();
		return this;
	},
	resetNodes: function() {
		this.get("nodes").reset();
		return this;
	},
	addGenerator: function(node, options) {
		this.get("generators").add(node, options);
		return this;
	},
	addNode: function(node, options) {
		this.get("nodes").add(node, options);
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
		this.model.get("generators").bind("add", this.generatorAdded, this);
		this.model.get("generators").bind("change", this.generatorChanged, this);
		this.model.get("generators").bind("reset", this.resetGenerators, this);
		this.selectedNode = undefined;
		this.selectedGenerator = undefined;
		this.render();
	},
	events: {
		"click button.hide" : "hideNode",
		"click button.root" : "newRoot",
		"click button.generator" : "newGenerator",
		"click button.snapshot" : "requestSnapshot",
		"click button.pop" : "popSnapshot",
		"click .generator-list > .tab.widget" : "generatorTabClicked",
		"click .node-list > .tab.widget" : "nodeTabClicked",
	},
	resetNodes: function() {
		this.selectedNode = undefined;
		this.renderNodes();
	},
	resetGenerators: function() {
		this.selectedGenerator = undefined;
		this.renderGenerators();
	},
	generatorAdded: function() {
		appModel.resetNodes();
		this.model.get("generators").each( function(g) {
			generate_models( g.generate(), {silent:false} );
		});
		publishAppModel();
		this.render();
	},
	generatorChanged: function(generator) {
		appModel.resetNodes();
		this.model.get("generators").each( function(g) {
			generate_models( g.generate(), {silent:false} );
		});
		publishAppModel();
		if(this.selectedGenerator.model.get("name") === generator.get("name")) {
			this.selectedGenerator.update();
		}
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
	popSnapshot : function() {
		popSnapshot();
	},
	requestSnapshot : function() {
		var message = { toFeelers: {snapshot:[]} };
		send_data(message);
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
			console.log("unrecognized node type:", type);
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
		this.nodeTabs.empty();
		this.model.getNodes().each( function(node) {
			var nodeTab = new TabWidget({model:node});
			this.nodeTabs.append( nodeTab.render().el );
		}, this );
	},
	renderGenerators: function() {
		if (this.selectedGenerator) {
			this.$("> .selected-generator").html( this.selectedGenerator.render().el );
		}
		
		this.generatorTabs.empty();
		this.model.getGenerators().each( function(generator) {
			var generatorTab = new TabWidget({model:generator});
			this.generatorTabs.append( generatorTab.render().el );
		}, this );
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.generatorTabs = this.$("> .generator-list");
		this.renderGenerators();
		this.nodeTabs = this.$("> .node-list");
		this.renderNodes();
		return this;
	},
});       

var appModel = new AppModel(); 
var appView = new AppView( { model: appModel } );

// process generated pattern
function generate_models(tree,options) {
	_.each( tree, function(dict) {
		if (dict.type === "branch" || dict.type == "root") {
			appModel.addNode( new BranchModel(dict), options );
		}
		else if (dict.type === "emitter") {
			appModel.addNode( new EmitterModel(dict), options );
		}
	}, this);
}

function generate_generator_models(list,options) {
	_.each( list, function(dict) {
		appModel.addGenerator( new GeneratorModel(dict), options );
	}, this);
}

function publishAppModel() {
	var message = { toFeelers: appModel.toJSON() };
	send_data(message);
}

function requestLastSync() {
	var message = { toFeelers: {sync:"get"} };
	send_data(message);
}

function restoreFromSync(sync) {
    appModel.get("generators").reset();
	appModel.resetGenerators();
	generate_generator_models(sync.generators, {silent:true});
	appModel.resetNodes();
    generate_models( sync.nodes, {silent:true} );
	appView.render();
}

function popSnapshot() {
	var snapshot = snapshotStack.pop();
	if (snapshot) {
		appModel.resetNodes();
		generate_models(snapshot, {silent:true});
		publishSnapshot(snapshot);
	}
	else {
		console.log("snapshot stack empty.");
	}
}

function publishSnapshot(snapshot) {
	var message =  { toFeelers: {nodes:snapshot} };
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
var snapshotStack = [];
var swapTickState = function() { tickState = !tickState; return tickState; };
function message_processor(message) {
	var json = JSON.parse(message);
	switch(json.type) {
		case "snapshot": 
			console.log("snapshot received");
			snapshotStack.push(json.nodes);
			break;
		case "sync": 
			console.log("sync received");
			restoreFromSync(json);
			break;
	}
}

open_interfaceWebSocket("ws://yeux.local:12345/service", message_processor, publishAppModel );
$("#sync").click( publishAppModel );
$("#get-last-sync").click( requestLastSync );
