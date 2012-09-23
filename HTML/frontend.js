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
    attributes: { "draggable" : true },
	className: "emitter",
	template: _.template( $("#template-emitter").html() ),
	initialize: function() {
		this.bind("all", this.render, this);
		this.model.bind("change", this.render, this);
		this.$el.attr("id",this.model.get("name"));
		this.pianoWidget = new PianoWidget({model:this.model});
		this.rhythmWidget = new RhythmWidget( this.model, "rhythm" );
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
		this.$(".widgets > .rhythm").replaceWith( this.rhythmWidget.render().el );
		this.$(".widgets > .note").replaceWith(this.renderView(indexer, "note"));
		this.$(".widgets > .channel").replaceWith(this.renderView(indexer, "channel"));
		this.$(".widgets > .duration").replaceWith(this.renderView(indexer, "duration"));
		this.$(".widgets > .onVelocity").replaceWith(this.renderView(indexer, "onVelocity"));
		this.$(".widgets > .offVelocity").replaceWith(this.renderView(indexer, "offVelocity"));
        
		this.$(".piano").html( this.pianoWidget.render().el );

		return this;            
	}
});
_.extend(EmitterView.prototype, DragDropMixin);

NodeCollection = Backbone.Collection.extend({ });

BranchModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			pool : new NodeCollection(),
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
	add: function(model) {
		this.get("pool").add(model);
		model.containedBy = this;
		model.bind("change", publishAppModel);
		return this;
	},
	remove: function(model) {
		this.get("pool").remove(model);
		model.unbind("change", publishAppModel);
		model.containedBy = undefined;
		return this;
	},
	contains: function(model) {
		return this.get("pool").contains(model);
	},
	parameters: function() {
		return this.get("parameters");
	},
	parameter: function(name) {
		return this.parameters()[name];
	}
});

BranchView = Backbone.View.extend( {
	tagName: "li",
    className: "branch",
	template: _.template( $('#template-branch').html() ),
	initialize: function() {
		console.log("branch initialize");
		_.bindAll(this, "render");
		this.model.get("pool").bind("add", this.render, this);
		this.model.get("pool").bind("remove", this.render, this);
		this.$el.attr("id",this.model.get("name"));
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
	renderView: function(model) {
		var result = undefined;
		var type = model.get("type");
		if (type === "branch") {
			result = new BranchView({model:model});
		}
		else if (type === "emitter") {
			result = new EmitterView({model:model});
		}
		return result.render().el;
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$(".widgets").append( this.rhythmWidget.render().el );

		this.model.get("pool").each( function(model) {
			this.$("> .nodes > ul.nodes").prepend( this.renderView(model) );
		}, this);
		return this;            
	}
});
_.extend(BranchView.prototype, DragDropMixin);

AppModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			branches : new NodeCollection()
		};
	},
	addBranch: function(branch) {
		this.get("branches").add(branch);
		return this;
	}
});

AppView = Backbone.View.extend( {
	el: $("ul#content"),
	initialize: function() {
		this.render();
	},
	addBranch: function( branch ) {
		this.model.addBranch( branch );
		this.render();
		return this;
	},
	render: function() {
		this.$el.empty();
		this.model.get("branches").each( function(branch) {
			var view = new BranchView( { model:branch } );
			this.$el.prepend( view.render().el );
		}, this );
	},
});       

var appModel = new AppModel(); 
var appView = new AppView( { model: appModel } );
$("#new").click( function() {
	var branchModel = new BranchModel();
	branchModel.set("type","root");
	branchModel.bind("change", publishAppModel);
	appView.addBranch( branchModel );
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

open_interfaceWebSocket("ws://yeux.local:12345/service", message_processor );
$("#sync").click( publishAppModel );
