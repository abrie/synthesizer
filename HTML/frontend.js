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
			note : { seed:1, mask:0xC0, pool:[36] },
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
