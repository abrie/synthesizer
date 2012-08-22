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
        this.seedInput = setField(this.$("input.seed"), this.field.seed);
        this.maskInput = setField(this.$("input.mask"), this.field.mask);
		this.poolInput = setField(this.$("input.pool"), this.field.pool);
        this.delegateEvents(this.events);
		return this;            
	}
});

SequentialView = Backbone.View.extend( {
	tagname: "div",
	className: "sequential",
	template: _.template( $("#sequential-template").html() ),
	initialize: function(model,fieldName) {
		console.log("initialize SequentialView. model:",model,"fieldName:",fieldName);
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
        this.stepInput = setField(this.$("input.step"), this.field.step);
		this.poolInput = setField(this.$("input.pool"), this.field.pool);
        this.delegateEvents(this.events);
		return this;            
	}
});

var indexerViews = {lfsr:LFSRWidget, sequential:SequentialView};
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
