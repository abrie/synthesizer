function get_maximal_taps(bit_depth) {
	var maximals = {
		"3": [ 3, 2 ],
		"4": [ 4, 3 ],
		"5": [ 5, 3 ],
		"6": [ 6, 5 ],
		"7": [ 7, 6 ],
		"8": [ 8, 6, 5, 4 ],
		"9": [ 9, 5 ],
		"10": [ 10, 7 ],
		"11": [ 11, 9 ],
		"12": [ 12, 6, 4, 1 ],
		"13": [ 13, 4, 3, 1 ],
		"14": [ 14, 5, 3, 1 ],
		"15": [ 15, 14 ],
		"16": [ 16, 15, 13, 4 ]
	};

	return maximals[bit_depth];
}

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

function populate_bit_depthSelect( select, current ) {
	for(var bitDepth = 3; bitDepth <= 16; bitDepth++ ) {
		var option = new Option( bitDepth, bitDepth );
		select[0].add( option );
	}

	select.val(current);
}

function uid() {
	var S4 = function() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	}

	return S4();
}

var tick_count = 0;
var tick_indicator =  $("#tick-indicator");
function process_message(evt) {
 tick_indicator.attr("on", tick_count < PPQN/2);
 tick_count = tick_count >= PPQN+1 ? 0 : ++tick_count;
}

function open_interfaceWebSocket( host ) {
	ws = new WebSocket( host ) ;

	ws.onopen = function()
	{
		$("#connection-status").removeClass("disconnected").addClass("connected").text("");
	};

	ws.onmessage = function (evt) {
		process_message(evt);
	};

	ws.onerror = function (evt) {
		console.log("Websocket onerror:"+evt);
	};

	ws.onclose = function() {
		var retryTimer = window.setTimeout(function() { open_interfaceWebSocket( host ); } , 10000);
		$("#connection-status").removeClass("connected").addClass("disconnected").text("disconnected");
	};
}

function send_data( json ) {
	ws.send( JSON.stringify(json) );
}

function transmit_note_on( channel, note_number ) {
	var data = {"midi" : { "note_on" : { "channel":channel, "note_number":note_number } }};
	send_data( data );
}

function transmit_note_off( channel, note_number ) {
	var data = {"midi" : { "note_off" : { "channel":channel, "note_number":note_number } }};
	send_data( data );
}

function transmit_sequencer_sync( state ) {
	var data = { "sequencer" : { "sync" : state } };
	send_data( data );
}

PianoboardView = Backbone.View.extend( {
	tagName: "div",
	className: "pianoboard",
	pianoboard_template: _.template( $("#pianoboard-template").html() ),
	pianokey_template: _.template( $("#pianokey-template").html() ),
	initialize: function() {
	},
	render: function( attributes ) {
		this.$el.html( this.pianoboard_template() );
		var which_is_it = function(nn) {
			return _.find( [1,3,6,8,10], function(n) { 
				return (nn%12) / n == 1;
			}) ? "black" : "white";
		}

		for( var i = 2*12; i < 7*12; i++ ) {
			var key = this.pianokey_template( {
				"note_number": i,
				"whiteblack": which_is_it(i),
				"state": attributes.pool.indexOf(i)>-1 ? "on" : "off",
			} ); 
			this.$("ul.pianokeys").append( key );
		}

		return this;
	}
});

LFSRModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			"name" : "none",
			"bit_depth" : 4,
			"value" : 1,
			"taps" : get_maximal_taps(4),
			"pool" : []
		};
	},
});

LFSRCollection = Backbone.Collection.extend( { model : LFSRModel } );
var appView = undefined;
LFSRView = Backbone.View.extend( {
	tagName: "li",
	className: "lfsr",
	template: _.template( $("#lfsr-template").html() ),
	initialize: function() {
		this.model.bind('change', this.modelChanged, this);
		this.render();
	},
	events: {
		"change select.bit_depth" : "bit_depthChanged",
		"change input.value" : "valueChanged",
		"change input.pool" : "poolChanged",
	},
	bit_depthChanged: function(e) {
		this.model.set("bit_depth", parseInt( this.bit_depthSelect.val() ));
		this.model.set("taps", get_maximal_taps( this.model.get("bit_depth") ) );
	},
	valueChanged: function(e) {
		this.model.set("value", parseInt( this.valueInput.val() ));
	},
	poolChanged: function(e) {
		var arr = _.map( this.poolInput.val().split(','), function(val) {
			if(val == 0) {
				return 0;
			}
			var parsed = parseNotation(val);
			return parseInt( parsed ) || val;
		});
		this.model.set("pool", arr);
	},
	modelChanged: function() {
		appView.report();
		this.render();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.valueInput = this.$("input.value");
		this.poolInput = this.$("input.pool");
		populate_bit_depthSelect( this.$("select.bit_depth"), this.model.get("bit_depth") );
		this.bit_depthSelect = this.$("select.bit_depth");
		return this;
	}
});

NodeCollection = Backbone.Collection.extend({ });

EmitterModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			type: "emitter",
			pool: []
		};
	}
});

NodeModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			type: "branch",
			pool: new NodeCollection(),
		};
	},
});

dragData = {};
NodeView = Backbone.View.extend( {
	tagname: "li",
    attributes: { "draggable" : true },
	className: "node",
	template: _.template( $("#node-template").html() ),
	initialize: function() {
		this.containedBy = this.options["containedBy"];
		this.instrument = this.options["instrument"];
		this.model.bind('change', this.render);
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("drop",_.bind(this.drop, this));
		_.bindAll(this, "render");
		this.render();
	},
    dragStart: function(e) {
		dragSubject = this.model;
		dragData = { subject: this.model.get("name"), containedBy: this.containedBy, instrument: this.instrument };
	},                      
	dragOver: function(e) {
		return false;
	},
	drop: function(e) {
		console.log( dragData );
		e.preventDefault();
		e.stopPropagation();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.$(".name").html( this.model.get("name") );
		console.log("rendering:",this.model.get("name"));
		this.model.get("pool").each( function(node) {
			console.log("sub:", node.get("name"));
			this.$("ul.pool").append( $("<li>").html( node.get("name") ) );
		},this );

		return this;
	}
});

EmitterView = Backbone.View.extend( {
	tagname: "li",
    attributes: { "draggable" : true },
	className: "emitter",
	template: _.template( $("#emitter-template").html() ),
	initialize: function() {
		this.containedBy = this.options("containedBy");
		this.instrument = this.options("instrument");
		playaround_mouse_down = false;
		this.pianoboardView = new PianoboardView();
		this.playboardView = new PianoboardView();
		this.model.bind('change', this.render);
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("drop",_.bind(this.drop, this));
		_.bindAll(this, "render");
		this.render();
	},
    dragStart: function(e) {
		e.originalEvent.dataTransfer.setData("item", this.model.get("name"));
		e.originalEvent.dataTransfer.setData("type", this.model.get("type"));
		e.originalEvent.dataTransfer.setData("previousContainer", this.containedBy); 
		//e.stopPropagation();
	},                      
	dragOver: function(e) {
		return false;
	},
	drop: function(e) {
		var name = e.originalEvent.dataTransfer.getData("item");
		var type = e.originalEvent.dataTransfer.getData("type");
		var previousContainer = e.originalEvent.dataTransfer.getData("previousContainer");
		this.instrument.model.get("nodes").move(name, previousContainer, this.model.get("name"));
		//id is the element id
		e.preventDefault();
		e.stopPropagation();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		var pool = this.model.get("pool")
		this.$(".programmer").append( this.pianoboardView.render( { pool:pool } ).el );
		this.$(".playaround").append( this.playboardView.render( { pool:[] } ).el );

		return this;
	},
    events: {
        "click button.copy" : "copyPressed",
        "click button.paste" : "pastePressed",
        "click .programmer li.pianokey" : "pianoboard_keyClicked",
        "mousedown .programmer li.pianokey" : "pianoboard_keyDown",
        "mouseup .programmer li.pianokey" : "pianoboard_keyUp",
        "mouseenter .programmer li.pianokey" : "pianoboard_keyEnter",
        "mouseleave .programmer li.pianokey" : "pianoboard_keyLeave",
        "mousedown .playaround li.pianokey" : "playaround_keyDown",
        "mouseup .playaround li.pianokey" : "playaround_keyUp",
        "mouseenter .playaround li.pianokey" : "playaround_keyEnter",
        "mouseleave .playaround li.pianokey" : "playaround_keyLeave",
    },
    
    copyPressed: function() {
		phrase_copyBuffer = this.model.toJSON();
		delete phrase_copyBuffer["name"];
		return true;
	},
	pastePressed: function() {
		var copied_attrs = JSON.parse( JSON.stringify( phrase_copyBuffer ) );
		var lfsrCollection = new LFSRCollection(); 
		var noteLFSR = undefined;
		_.each( copied_attrs["lfsrs"], function(lfsr_attrs) {
			var cloneLFSR = new LFSRModel( lfsr_attrs );
			lfsrCollection.add( cloneLFSR );
			if( lfsr_attrs["name"] == "note" ) {
				noteLFSR = cloneLFSR;
			}
		}, this);
		copied_attrs["lfsrs"] = lfsrCollection;
		this.model.noteLFSR = noteLFSR;
		this.model.set( copied_attrs );
		return true;
	},
	playaround_keyEnter: function(e) {
		var key_el = $(e.currentTarget);
		key_el.addClass("over");
		if( playaround_mouse_down ) {
			key_el.addClass("down");
			var note_number = parseInt( key_el.attr("note_number") );
			var channel = parseInt( this.model.get("lfsrs").where({name:"channel"})[0].get("pool")[0] );
			transmit_note_on( channel, note_number );
		}
		return true;
	},
	playaround_keyLeave: function(e) {
		var key_el = $(e.currentTarget);
		key_el.removeClass("over");
		if( playaround_mouse_down ) {
			key_el.removeClass("down");
			var note_number = parseInt( key_el.attr("note_number") );
			var channel = parseInt( this.model.get("lfsrs").where({name:"channel"})[0].get("pool")[0] );
			transmit_note_off( channel, note_number );
		}
		return true;
	},
	playaround_keyDown: function(e) {
		var key_el = $(e.currentTarget);
		key_el.addClass("down");
		playaround_mouse_down = true;
		var note_number = parseInt( key_el.attr("note_number") );
		var channel = parseInt( this.model.get("lfsrs").where({name:"channel"})[0].get("pool")[0] );
		transmit_note_on( channel, note_number );
		return true;
	},
	playaround_keyUp: function(e) {
		var key_el = $(e.currentTarget);
		key_el.removeClass("down");
		playaround_mouse_down = false;
		var note_number = parseInt( key_el.attr("note_number") );
		var channel = parseInt( this.model.get("lfsrs").where({name:"channel"})[0].get("pool")[0] );
		transmit_note_off( channel, note_number );
		return true;
	},
	pianoboard_keyEnter: function(e) {
		var key_el = $(e.currentTarget);
		key_el.addClass("over");
	},
	pianoboard_keyLeave: function(e) {
		var key_el = $(e.currentTarget);
		key_el.removeClass("over");
	},
	pianoboard_keyDown: function(e) {
		var key_el = $(e.currentTarget);
		key_el.addClass("down");
	},
	pianoboard_keyUp: function(e) {
		var key_el = $(e.currentTarget);
		key_el.removeClass("down");
	},
	pianoboard_keyClicked: function(e) {
		var key_el = $(e.currentTarget);
        var pool = this.model.noteLFSR.get("pool").slice(0);
		var note_number = key_el.attr("note_number");

		var deactivateKey = function() {
			key_el.attr("state","off");
			key_el.removeClass("down");
			key_el.removeClass("over");
			pool = _.reject(pool, function(i) {
				return i == note_number;
			});
		};

		var activateKey = function() {
			key_el.attr("state","on");
			key_el.addClass("down");
			key_el.removeClass("hover");
			pool.push( note_number );
		};

		key_el.attr("state") == "on" ? deactivateKey() : activateKey();
		this.model.noteLFSR.set( "pool", _.map( pool, function(i) {
			return parseInt(i);
		}));
		return true;
	},

                                    
});

InstrumentModel = Backbone.Model.extend( {
	defaults: function() {
		return {
			name: uid(),
			nodes: new NodeCollection(),
		};
	},
	initialize: function() {
		this.get("nodes").add( new NodeModel({name:"root"}));
	}
});

InstrumentView = Backbone.View.extend( {
	tagName: "li",
    className: "instrument",
	template: _.template( $('#instrument-template').html() ),
	initialize: function() {
		this.render();
		this.$el.bind("dragstart",_.bind(this.dragStart, this));
		this.$el.bind("dragover",_.bind(this.dragOver, this));
		this.$el.bind("drop",_.bind(this.drop, this));
	},
	events: {
		"click button.new" : "newNode",
		"click button.emitter" : "newEmitter",
	},
	newNode: function() {
		var node = new NodeModel();
		this.model.get("nodes").add( node );
		this.render();
	},
	newEmitter: function() {
		var node = new EmitterModel();
		this.model.get("nodes").add( node );
		this.render();
	},
    dragStart: function(e) { },                      
	dragOver: function(e) {
		return false;
	},
	drop: function(e) {
		console.log("Instrument drop:",e);
		//id is the element id
		e.preventDefault();
		e.stopPropagation();
	},
	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		this.model.get("nodes").each( function(node) {
			var type = node.get("type");
			if (type === "emitter") {
				var view = new EmitterView({model:node, instrument:this, containedBy:"root"});
				this.$("ul.nodes").append( $("<li>").append( view.render().el ) );
			}
			else if (type === "branch") {
				var view = new NodeView({model:node, instrument:this, containedBy:"root"});
				this.$("ul.nodes").append( $("<li>").append( view.render().el ) );
			}
			
		}, this);
		return this;            
	}
});

InstrumentModelCollection = Backbone.Collection.extend( { model : InstrumentModel } );

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
	debug: function() {
		console.log( JSON.stringify( this.model.toJSON() ) );
	},
	report: function() {
		var message = { update: this.model.toJSON() };
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

open_interfaceWebSocket("ws://yeux.local:12345/service");
$("#sync").click( function() {
	appView.report();
});
