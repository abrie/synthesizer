LFSRView = Backbone.View.extend( {
	tagname: "div",
	className: "lfsr",
	template: _.template( $("#lfsr-template").html() ),
	initialize: function( model, fieldName ) {
		_.bindAll(this, "render");
		this.fieldName = fieldName;
		this.field = model.parameter(fieldName);
	},
	events: {
		"change input.seed" : "parameterChanged",
		"change input.mask" : "parameterChanged",
		"change input.pool" : "parameterChanged",
	},
	parameterChanged: function(e) {
		this.field["seed"] = parseInt( this.seedInput.val() );
		this.field["mask"] = parseInt( this.maskInput.val() );
		this.field["pool"] = inputToArray( this.poolInput );
	},
	render: function() {
		this.$el.html( this.template() );
		this.$(".name").html( this.fieldName );
        this.seedInput = setField(this.$("input.seed"), this.field["seed"]);
        this.maskInput = setField(this.$("input.mask"), this.field["mask"]);
		this.poolInput = setField(this.$("input.pool"), this.field["pool"]);
		return this;            
	}
});

SequentialView = Backbone.View.extend( {
	tagname: "div",
	className: "sequential",
	template: _.template( $("#sequential-template").html() ),
	initialize: function( model, fieldName ) {
		_.bindAll(this, "render");
		this.fieldName = fieldName;
		this.field = model.parameter(fieldName);
	},
	events: {
		"change input.direction" : "parameterChanged",
		"change input.pool" : "parameterChanged",
	},
	parameterChanged: function(e) {
		this.field["step"] = parseInt( this.stepInput.val() );
		this.field["pool"] = inputToArray( this.poolInput );
	},
	render: function() {
		this.$el.html( this.template() );
		this.$(".name").html(this.fieldName);
        this.stepInput = setField(this.$("input.step"), this.field["step"]);
		this.poolInput = setField(this.$("input.pool"), this.field["pool"]);
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
