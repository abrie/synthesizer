function open_interfaceWebSocket( host, onMessage, onOpen, onClose ) {
	ws = new WebSocket( host ) ;

	ws.onopen = function() {
		onOpen();
	};

	ws.onmessage = function(evt) {
		onMessage( evt.data );
	};

	ws.onerror = function (evt) {
		console.log("Websocket onerror:"+evt);
	};

	ws.onclose = function() {
		onClose();
		var retryTimer = window.setTimeout(function() {
			open_interfaceWebSocket( host, onMessage, onOpen, onClose );
		} , 1000);
	};
}

function send_data( json ) {
	ws.send( JSON.stringify(json) );
	console.log("publish:", json);
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
