function newDefaultRhythm() {
	return {
		steps:1,
		pulses:1,
		offset:0,
		ticksPerStep:24,
		ticksPerPulse:24,
		totalTicks:24,
	}
}

function newDefaultRoot(name) {
	return {
		name:name,
		type:'root',
		pool:[],
		parameters:{
			rhythm: newDefaultRhythm(),
		}, 
		done:false
	};
}

function newDefaultBranch(name) {
	return {
		name:name,
		type:'branch',
		pool:[],
		parameters:{
			rhythm: newDefaultRhythm(),
		}, 
		done:false
	};
}

function newDefaultEmitter(name) {
	return {
		name: name,
		type: "emitter",
		parameters: {
			rhythm: newDefaultRhythm(),
			indexer: "lfsr",
			channel : { seed:1, mask:0xC0, pool:[0] },
			note : { seed:1, mask:0xC0, pool:[36,37,38] },
			onVelocity : { seed:1, mask:0xC0, pool:[80]},
			offVelocity : { seed:1, mask:0xC0, pool:[60]},
			duration :{ seed:1, mask:0xC0, pool:[24]}
		},
	};
}

function NodeCtrl($scope) {
	$scope.nodes = [];
	$scope.indexerTypes = ["lfsr","sequential"];

	$scope.rootName = uid();
	$scope.addRoot = function() {
		$scope.nodes.push(newDefaultRoot($scope.rootName));
		$scope.rootName = uid();
	};

	$scope.nodeName = uid();
	$scope.addNode = function() {
		$scope.nodes.push(newDefaultBranch($scope.nodeName));
		$scope.nodeName = uid();
	};

	$scope.addNewNodeTo = function(node) {
		var newBranch = newDefaultBranch(uid());
	    node.pool.push(newBranch.name);
		$scope.nodes.push(newBranch);
	};

	$scope.addNewEmitterTo = function(node) {
		var newEmitter = newDefaultEmitter(uid());
	    node.pool.push(newEmitter.name);
		$scope.nodes.push(newEmitter);
	};

	$scope.emitterName = uid();
	$scope.addEmitter = function() {
		$scope.nodes.push(newDefaultEmitter($scope.emitterName));
		$scope.emitterName = uid();
	};

	$scope.remaining = function() {
		var count = 0;
		angular.forEach($scope.nodes, function(node) {
				count += node.done ? 0 : 1;
				});
		return count;
	};

	$scope.archive = function() {
		var oldNodes = $scope.nodes;
		$scope.nodes = [];
		angular.forEach(oldNodes, function(node) {
				if (!node.done) $scope.nodes.push(node);
				});
	};
}

function SocketControl($scope) {
	$scope.connectionStatus = "disconnected";

	$scope.websocket_onMessage = function(message) {
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

	$scope.websocket_onOpen = function() {
		$scope.$apply( function() {
			$scope.connectionStatus = "connected";
		});
	}

	$scope.websocket_onClose = function()  {
		$scope.$apply( function() {
			$scope.connectionStatus = "disconnected";
		});
	}

	open_interfaceWebSocket(
		"ws://yeux.local:12345/service",
		$scope.websocket_onMessage,
		$scope.websocket_onOpen,
		$scope.websocket_onClose);
}

function drawPiano(canvas,ctx,scope,ngModel,mouseX,mouseY,mouseClicked) {
	var pool = ngModel.$viewValue;
	var width = canvas.width;
	var height = canvas.height;

	var lowestOctave = 1;
	var numberOfOctaves = 8;
	var keysPerOctave = 12;
	var numberOfKeys = keysPerOctave*numberOfOctaves;

	var whiteOrBlackPianokey = function(noteNumber) {
		return _.find( [1,3,6,8,10], function(n) { 
			return (noteNumber%12) / n == 1;
		}) ? "black" : "white";
	};

	var isPianokeyProgrammed = function(noteNumber) {
		var indexInPool = pool.indexOf(noteNumber); 
		 return indexInPool >= 0;
	};

	var getNoteNumberForCoordinate = function(x,y) {
		var keyWidth = width / (numberOfOctaves*7 - lowestOctave*7);
		var midKey = Math.floor( keyWidth / 2 );
		var keyHeight = height;
		var octave = Math.floor( x / (7*keyWidth) );
		var div = Math.floor( x / keyWidth ) - octave*7;
		var mod = Math.floor( x % keyWidth );
		var val = [0,2,4,5,7,9,11][div];
		if (y < keyHeight/2) {
			switch(val) {
				case 0: if (mod>midKey) { val++; }; break;
				case 2: if (mod>midKey) { val++; } else { val--; }; break;
				case 4: if (mod<midKey) { val--; }; break;
				case 5: if (mod>midKey) { val++; }; break;
				case 7: if (mod>midKey) { val++; } else { val--; }; break;
				case 9: if (mod>midKey) { val++; } else { val--; }; break;
				case 11: if (mod<midKey) { val--; } break;
			}
		}

		return val+(octave+lowestOctave)*keysPerOctave;
	};

	var isHoverKey = function(number) {
		return number === getNoteNumberForCoordinate(mouseX,mouseY);
	};

	var addPianokey = function(noteNumber) {
		var newPool = pool.slice();
		newPool.push(noteNumber);
		scope.$apply( function() { ngModel.$setViewValue(newPool); } );
		pool = newPool;
	};

	var removePianokey = function(noteNumber) {
		var newPool = _.filter( pool, function(i) { return i != noteNumber; } );
		scope.$apply( function() { ngModel.$setViewValue(newPool); } );
		pool = newPool;
	};

	if (mouseClicked===true) {
		var kn = getNoteNumberForCoordinate(mouseX,mouseY);  
		if (isPianokeyProgrammed(kn)) {
			removePianokey(kn);
		}
		else
		{
			addPianokey(kn);
		}
	}

	var keyWidth = width / (numberOfOctaves*7-lowestOctave*7);
	var keyHeight = canvas.height;
	ctx.strokeStyle = "#000000";
	var x = 0;
	for( var i = lowestOctave*keysPerOctave; i < numberOfKeys; i++ ) {
		if (whiteOrBlackPianokey(i) === "white") {
			ctx.strokeStyle = "#000000";
			ctx.lineWidth = 1;
			ctx.fillStyle = isPianokeyProgrammed(i) ? "#FF9000" : "#FFFFFF";
			ctx.fillRect(x,0,keyWidth,keyHeight); 
			ctx.strokeRect(x,0,keyWidth,keyHeight);
			if (isHoverKey(i)) {
				ctx.lineWidth = 2;
				ctx.strokeStyle = "#0";
				ctx.strokeRect(x,0,keyWidth,keyHeight);
			}
			x+=keyWidth;  
		}

		if (whiteOrBlackPianokey(i-1) === "black") {
			ctx.strokeStyle = "#000000";
			ctx.lineWidth = 1;
			ctx.fillStyle = isPianokeyProgrammed(i-1) ? "#FF9000" : "#AAAAAA";
			ctx.fillRect(x-keyWidth-keyWidth/2,0,keyWidth,keyHeight/2); 
			ctx.strokeRect(x-keyWidth-keyWidth/2,0,keyWidth,keyHeight/2);
			if (isHoverKey(i-1)) {
				ctx.lineWidth = 2;
				ctx.strokeStyle = "#0";
				ctx.strokeRect(x-keyWidth-keyWidth/2,0,keyWidth,keyHeight/2);
			}
		}
	}
}

angular.module('components', [])
	.directive('array', function () {
		return {
			restrict:'A',
			require: 'ngModel',
			link: function (scope, iElement, iAttrs, ngModel) {
				function toArray(text) {
					console.log("toArray:",text);
					return inputToArray(text);
				};  

				function fromArray(v) {
					console.log("fromArray:",v);
					return v.join(",");
				};
				ngModel.$parsers.push(toArray);
				ngModel.$formatters.push(fromArray);
			}
		}
	})
	.directive('piano', function () {
		return {
			restrict:'E',                 
			replace:true,
			require: 'ngModel',
			template:'<canvas width=700 height=60>canvas required</canvas>',
			link: function (scope, iElement, iAttrs, ngModel) {
				iElement.addClass("pianoCanvas");
				var context = iElement[0].getContext("2d");
				
				ngModel.$render = function() {
					drawPiano(iElement[0],context,scope,ngModel);
				};

				iElement.bind("mousemove",function(e) {
					drawPiano(iElement[0],context,scope,ngModel,e.offsetX,e.offsetY);
				});
				iElement.bind("mouseleave",function(e) {
					drawPiano(iElement[0],context,scope,ngModel);
				});
				iElement.bind("mouseup",function(e) {
					drawPiano(iElement[0],context,scope,ngModel,e.offsetX,e.offsetY,true);
				});
			}
		};
});

angular.module('frontend',['components']);

