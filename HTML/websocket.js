function uid() {
	var S4 = function() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	}

	return S4();
}

function open_interfaceWebSocket( host, message_processor, onOpen ) {
	ws = new WebSocket( host ) ;

	ws.onopen = function()
	{
		$("#connection-status").removeClass("disconnected").addClass("connected").text("");
		onOpen();
	};

	ws.onmessage = function (evt) {
		message_processor( evt.data );
	};

	ws.onerror = function (evt) {
		console.log("Websocket onerror:"+evt);
	};

	ws.onclose = function() {
		var retryTimer = window.setTimeout(function() { open_interfaceWebSocket( host ); } , 1000);
		$("#connection-status").removeClass("connected").addClass("disconnected").text("disconnected");
	};
}

function send_data( json ) {
	ws.send( JSON.stringify(json) );
	console.log("publish:", JSON.stringify(json));
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
