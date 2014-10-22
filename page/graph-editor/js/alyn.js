/*
var audioGraph;

var audioTheme = {
	lineStrokeWidth: 5
};

$(document).ready(function() {
	audioGraph = new graphEditor('audio-graph', 1000, 480, audioTheme);
	
	function addNode(x, y, name, inputs, outputs) {
		inputs = inputs.split(',');
		outputs = outputs.split(',');
		var node = new graphNode(name, name);
		
		for(var i in inputs) {
			var input = inputs[i];
			var multi = input.substring(0, 1) == '*';
			if(multi) input = input.substring(1);
			
			node.addPoint(input, 'in', multi);
		}
		for(var i in outputs)
			if(outputs[i] != '')
				node.addPoint(outputs[i], 'out');
		
		audioGraph.addNode(x, y, node);
	}
	addNode(50, 25, 'StartComponent', 'input', 'output');
	addNode(50, 125, 'FilePollingComponent', 'input', 'output');
	addNode(250, 75, 'AddVariableToHeaderComponent', 'input', 'output');
	addNode(450, 75, 'FileTargetComponent', '*input', 'output');
});
*/
