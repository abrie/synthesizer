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
	render: function() {
		this.$el.html( this.template() );
		this.$(".name").html( this.fieldName );
        this.seedInput = this.$("input.seed").val(this.field.seed);
        this.maskInput = this.$("input.mask").val(this.field.mask);
		this.poolInput = this.$("input.pool").val(this.field.pool);
        this.delegateEvents(this.events);
		return this;            
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
	render: function() {
		this.$el.html( this.template() );
		this.$(".name").html(this.fieldName);
        this.stepInput = this.$("input.step").val(this.field.step);
		this.poolInput = this.$("input.pool").val(this.field.pool);
        this.delegateEvents(this.events);
		return this;            
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
