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

function newDefaultIndexer() {
    return {
        type: "sequential",
        pool: []
    }
}

function newDefaultRoot(name) {
	return {
		name:name,
		type:'root',
		parameters:{
			rhythm: newDefaultRhythm(),
            indexer: newDefaultIndexer(),
		}, 
		done:false
	};
}

function newDefaultBranch(name) {
	return {
		name:name,
		type:'branch',
		parameters:{
			rhythm: newDefaultRhythm(),
            indexer: newDefaultIndexer(),
		}, 
		done:false
	};
}

function newDefaultEmitter(name) {
	return {
		name: name,
		type: "emitter-note",
		parameters: {
			rhythm: newDefaultRhythm(),
			channel : { type:"lfsr", seed:1, mask:0xC0, pool:[0] },
			note : { type:"lfsr", seed:1, mask:0xC0, pool:[60,64,67,70,72] },
			onVelocity : { type:"lfsr", seed:1, mask:0xC0, pool:[80]},
			offVelocity : { type:"lfsr", seed:1, mask:0xC0, pool:[60]},
			duration :{ type:"lfsr", seed:1, mask:0xC0, pool:[24]}
		},
	};
}

function newDefaultControllerEmitter(name) {
	return {
		name: name,
		type: "emitter-controller",
		parameters: {
			rhythm: newDefaultRhythm(),
			channel : { type:"lfsr", seed:1, mask:0xC0, pool:[0] },
			controller : { type:"lfsr", seed:1, mask:0xC0, pool:[64] },
			value : { type:"lfsr", seed:1, mask:0xC0, pool:[0,64,128]},
			duration :{ type:"lfsr", seed:1, mask:0xC0, pool:[24]}
		},
	};
}

function clone(node) {
	var result = angular.copy(node);
	result.name = uid();
	return result;
}

function cloneInto(source,destination)
{
	var name = destination.name;
	angular.copy(source,destination);
	destination.name = name;
}

function MidiCtrl($scope,$timeout,socketService) {
    $scope.state = {tick:255};
	$scope.number = 64;
	$scope.channel = 1;
	$scope.value = 0;

	$scope.sweepController = function() {
		$timeout( function someWork() {
			var message = {
				toMidi:{
					channel:$scope.channel,
					number:$scope.number,
					value:$scope.value
				}
			};
			socketService.send(message);
			$scope.value = $scope.value+1;
			if($scope.value < 127) {
				$timeout(someWork, 1);
			}
			else {
				$scope.value = 0;
				return;
			}
		},1);
	}

    socketService.subscribe($scope.state);
}

function NodeCtrl($scope,socketService) {
	$scope.nodes = [];
	$scope.indexerTypes = ["lfsr","sequential"];

	$scope.nodeCloneBuffer = undefined;
	$scope.cloneIntoBuffer = function(node) {
		$scope.nodeCloneBuffer = clone(node);
	};
	$scope.cloneFromBuffer = function(node) {
		cloneInto($scope.nodeCloneBuffer,node);
	};
	$scope.cloneDescription = function() {
		if ($scope.nodeCloneBuffer) {
			return $scope.nodeCloneBuffer.name + ":" + $scope.nodeCloneBuffer.type;
		}
		else {
			return "[no clone]";
		}
	}

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
	    node.parameters.indexer.pool.push(newBranch.name);
		$scope.nodes.push(newBranch);
	};

	$scope.addNewEmitterTo = function(node) {
		var newEmitter = newDefaultEmitter(uid());
	    node.parameters.indexer.pool.push(newEmitter.name);
		$scope.nodes.push(newEmitter);
	};

	$scope.addNewControllerEmitterTo = function(node) {
		var newEmitter = newDefaultControllerEmitter(uid());
	    node.parameters.indexer.pool.push(newEmitter.name);
		$scope.nodes.push(newEmitter);
	};

	$scope.emitterName = uid();
	$scope.addEmitter = function() {
		$scope.nodes.push(newDefaultEmitter($scope.emitterName));
		$scope.emitterName = uid();
	};

	var publish = function() {
		var message = {toFeelers:{nodes:$scope.nodes}};
		socketService.send(message);
	};

	$scope.publish = publish; 

	$scope.$watch("nodes", function(newVal,oldVal) { 
		publish();
	},true);
}

function AppControl($scope, socketService) {
	$scope.isSocketConnected = function() {
		return socketService.isConnected();
	};
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
        return [1,3,6,8,10].some( function(n) { 
			return (noteNumber%12) / n === 1;
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
		var newPool = pool.filter( function(i) { return i != noteNumber; } );
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
    .directive('midistatus', function() {
        return {
            restrict: 'E',
			require: 'ngModel',
			replace:true,
			template:'<canvas width=50 height=50>canvas required</canvas>',
            scope: {
                state: '=ngModel',
            },
			link: function (scope, iElement, iAttrs, ngModel) {
				var ctx = iElement[0].getContext("2d");
                ctx.strokeStyle = "rgb(0,0,255)";
                ctx.fillStyle = "rgb(155,155,155)";
                ctx.lineWidth = 1;
                var radPDegree = 2*Math.PI / 360;
                scope.$watch("state", function(newVal,oldVal) {
                    ctx.save();
                    ctx.translate(25,25);
                    ctx.beginPath();
                    ctx.arc(0, 0, 25, 0 , 2 * Math.PI, false);
                    ctx.fill();
                    ctx.closePath();
                    ctx.rotate( radPDegree * newVal.tick % 360 );
                    ctx.beginPath();
                    ctx.moveTo(0,0);
                    ctx.lineTo(25,0);
                    ctx.stroke();
                    ctx.restore();
                },true);
            },
        }
    })
	.directive('visualizer', function() {
		var width=500, height=300;
		var cluster = d3.layout.cluster()
			.size([height, width - 160]);
		var generateTreeData = function(nodes)
		{   
            var pool = nodes.filter( function(n) {
                return n.type === "root"
            }).map( function(n) {
                return n.name
            });

			return {
                name: "anchor",
                pool: pool
            }
		};

		return {
			restrict: 'E',
			scope: {
				nodes: '=ngModel',
			},
			link: function (scope, element, attrs) {
				var layoutRoot = d3.select(element[0])
					.append("svg:svg").attr("width", width).attr("height", height)
					.append("svg:g")
					.attr("class", "container")
					.attr("transform", "translate(40, 0)");
				scope.$watch("nodes", function(newVal,oldVal) {
					layoutRoot.selectAll('*').remove();
					var tree = d3.layout.tree()
						.sort(null)
						.size([height, width-100])
						.children(function(d)
						{
                            if(d.pool.length === 0) {
                                return [];
                            }
                            return d.pool.map( function(name) {
                                return newVal.filter( function(n) {
                                    return n.name === name
                                }).map( function(o) {
                                    var pool = o.parameters.indexer ? 
                                        o.parameters.indexer.pool :
                                        []; 
                                    return {
                                        name:o.name,
                                        pool:pool
                                    };
                                }); 
                            }).reduce( function(a,b) {
                                return a.concat(b)
                            });
						});

					var nodes = tree.nodes(generateTreeData(newVal));
					var links = tree.links(nodes);

					// Edges between nodes as a <path class="link" />
					var link = d3.svg.diagonal()
						.projection(function(d)
						{
							return [d.y, d.x];
						});

					layoutRoot.selectAll("path.link")
						.data(links)
						.enter()
						.append("svg:path")
						.attr("class", "link")
						.attr("d", link);

					/*
					   Nodes as
					   <g class="node">
					   <circle class="node-dot" />
					   <text />
					   </g>
					 */
					var nodeGroup = layoutRoot.selectAll("g.node")
						.data(nodes)
						.enter()
						.append("svg:g")
						.attr("class", "node")
						.attr("transform", function(d)
						{
							return "translate(" + d.y + "," + d.x + ")";
						});

					var options = {nodeRadius:5};
					nodeGroup.append("svg:circle")
						.attr("class", "node-dot")
						.attr("r", options.nodeRadius);

					nodeGroup.append("svg:text")
						.attr("text-anchor", function(d)
						{
							return d.children ? "end" : "start";
						})
						.attr("dx", function(d)
						{
							var gap = 2 * options.nodeRadius;
							return d.children ? -gap : gap;
						})
						.attr("dy", function(d)
						{
							var gap = 2 * options.nodeRadius;
							return d.children ? -gap : 0;
						})
						.text(function(d)
						{
							return d.name;
						});
							  
				},true);
			}
		}
	})
	.factory('socketService', function($rootScope) {
		var connected = false;
		var sendQueue = undefined;

		var websocket_onMessage = function(message) {
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
                case "midi":
                    switch(json.event) {
                        case "tick": $rootScope.$apply( function() { subscribedState.tick+=1; } ); break;
                        case "start": $rootScope.$apply( function() { subscribedState.tick=0; } ); break;
                    }
                    break;
			}
		}

		var websocket_onOpen = function() {
			$rootScope.$apply( function() {
				connected = true;
				if (sendQueue != undefined) {
					send_data(sendQueue);
					sendQueue = undefined;
				}
			});
		}

		function send_data( obj ) {
			ws.send( JSON.stringify(obj) );
		}

		function open_interfaceWebSocket( host, onMessage, onOpen, onClose ) {
			var socket = new WebSocket( host ) ;

			socket.onopen = function() {
				onOpen();
			};

			socket.onmessage = function(evt) {
				onMessage( evt.data );
			};

			socket.onerror = function (evt) {
				console.log("Websocket onerror:"+evt);
			};

			socket.onclose = function() {
				onClose();
			};

			return socket;
		}

		var websocket_onClose = function() {
			$rootScope.$apply( function() {
				connected = false;
			});
			var retryTimer = window.setTimeout(function() {
				ws = open_interfaceWebSocket(
					"ws://yeux.local:12345/service",
					websocket_onMessage,
					websocket_onOpen,
					websocket_onClose);
			} , 1000);
		}

		var ws = open_interfaceWebSocket(
			"ws://yeux.local:12345/service",
			websocket_onMessage,
			websocket_onOpen,
			websocket_onClose);

        var subscribedState = {tick:0};

        return {
			isConnected : function() {
				return connected;
			},
            subscribe: function(state) {
                subscribedState = state;
                subscribedState.tick = 0;
            },
			send : function(message) {
				if (connected) {
					send_data(message);
				}
				else {
					sendQueue = message;
				}
			}
		}
	})
	.directive('array', function () {
		return {
			restrict:'A',
			require: 'ngModel',
			link: function (scope, iElement, iAttrs, modelController) {
				function toArray(text) {
					return inputToArray(text);
				};  

				function fromArray(v) {
					return v.join(",");
				};
				modelController.$parsers.push(toArray);
				modelController.$formatters.push(fromArray);
			}
		}
	})
	.directive('rhythm', function () {
		return {
			restrict:'E',
			replace:true,
			require: 'ngModel',
			scope: { rhythm:'=ngModel'},
			templateUrl:'templateRhythm.html',
			link: function (scope, iElement, iAttrs, ngModel) {
				scope.computeTotalTicks = function(rhythm) {
					return (rhythm.steps-rhythm.pulses) * rhythm.ticksPerStep +
						(rhythm.pulses * rhythm.ticksPerPulse);
				};
				// these scope watches fix the type=number issue
				scope.$watch('rhythm.steps', function() {
					scope.rhythm.steps = parseInt(scope.rhythm.steps);
				}); 
				scope.$watch('rhythm.pulses', function() {
					scope.rhythm.pulses = parseInt(scope.rhythm.pulses);
				}); 
				scope.$watch('rhythm.ticksPerStep', function() {
					scope.rhythm.ticksPerStep = parseInt(scope.rhythm.ticksPerStep);
				}); 
				scope.$watch('rhythm.ticksPerPulse', function() {
					scope.rhythm.ticksPerPulse = parseInt(scope.rhythm.ticksPerPulse);
				}); 
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

