function property(getter, setter) {
	return function(value) {
		if(value == undefined) return getter.call(this);
		else return setter.call(this, value);
	};
}

function event(onAdd, onRemove) {
	onAdd = onAdd == undefined ? null : onAdd;
	onRemove = onRemove == undefined ? null : onRemove;
	var hooks = [];
	var evt = function() {
		var args = [];
		for(var i in arguments)
			args[i] = arguments[i];
		for(var i in hooks)
			hooks[i].apply(this, args);
		return this;
	};
	evt.add = function(hook) {
		if(onAdd != null)
			onAdd.call(this, hook);
		hooks.push(hook);
		return this;
	};
	evt.remove = function(hook) {
		if(onAdd != remove)
			onAdd.call(this, hook);
		for(var i in hooks)
			if(hooks[i] == hook) {
				hooks.splice(i, 1);
				break;
			}
		return this;
	};
	evt.clear = function() {
		hooks = [];
	};
	
	return evt;
}

Raphael.fn.connection = function (_fromCircle, _toCircle, line, bg, removeHook) {
    //在mousemove的过程中也会调用此方法,_fromCircle就会为line
    if (_fromCircle.line && _fromCircle.from && _fromCircle.to) {
        line = _fromCircle;
        _fromCircle = line.from;
        _toCircle = line.to;
    }
    var bb1 = _fromCircle.getBBox(),
        bb2 = _toCircle.getBBox(),
        p = [{x: bb1.x + bb1.width / 2, y: bb1.y - 1},
        {x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height + 1},
        {x: bb1.x - 1, y: bb1.y + bb1.height / 2},
        {x: bb1.x + bb1.width + 1, y: bb1.y + bb1.height / 2},
        {x: bb2.x + bb2.width / 2, y: bb2.y - 1},
        {x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height + 1},
        {x: bb2.x - 1, y: bb2.y + bb2.height / 2},
        {x: bb2.x + bb2.width + 1, y: bb2.y + bb2.height / 2}],
        d = {}, dis = [];
    for (var i = 0; i < 4; i++) {
        for (var j = 4; j < 8; j++) {
            var dx = Math.abs(p[i].x - p[j].x),
                dy = Math.abs(p[i].y - p[j].y);
            if ((i == j - 4) || (((i != 3 && j != 6) || p[i].x < p[j].x) && ((i != 2 && j != 7) || p[i].x > p[j].x) && ((i != 0 && j != 5) || p[i].y > p[j].y) && ((i != 1 && j != 4) || p[i].y < p[j].y))) {
                dis.push(dx + dy);
                d[dis[dis.length - 1]] = [i, j];
            }
        }
    }
    if (dis.length == 0) {
        var res = [0, 4];
    } else {
        res = d[Math.min.apply(Math, dis)];
    }
    var x1 = p[res[0]].x,
        y1 = p[res[0]].y,
        x4 = p[res[1]].x,
        y4 = p[res[1]].y;
    dx = Math.max(Math.abs(x1 - x4) / 2, 10);
    dy = Math.max(Math.abs(y1 - y4) / 2, 10);
    var x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
        y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
        x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
        y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3);
    var path = ["M", x1.toFixed(3), y1.toFixed(3), "C", x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");
    if (line && line.line) {
        line.bg && line.bg.attr({path: path});
        line.line.attr({path: path});
    } else {
        var color = typeof line == "string" ? line : "#000";
        var lineElem = this.path(path);
        var bgElem = (bg && bg.split) ? this.path(path) : null;
        if(removeHook != undefined) {
        	function dblclick(e) {
				(e.originalEvent || e).preventDefault();
	        	removeHook();
	        	lineElem.remove();
	        	if(bgElem != null) {
                    bgElem.remove();
                }
	        }
        	lineElem.dblclick(dblclick);
            lineElem.mouseover(function(){
                this.attr("cursor", "pointer");
            });
        	if(bgElem != null) {
                bgElem.dblclick(dblclick);
            }
      	}
        /*return {
            line: lineElem.attr({stroke: color, fill: "none"}).toBack(),
            bg: bg && bg.split && bgElem.attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3}).toBack(),
            from: _fromCircle,
            to: _toCircle
        };*/
        return new Transition(lineElem.attr({stroke: color, fill: "none"}).toBack(),
            bg && bg.split && bgElem.attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3}).toBack(),
            _fromCircle, _toCircle);
    }
};

Raphael.fn.removeConnection = function(connection) {
	if(connection.line != undefined)
		connection.line.remove();
	if(connection.bg != undefined)
		connection.bg.remove();
};

Raphael.el.xlateText = function() {
	this.translate(this.getBBox().width / 2, 0);
	return this;
};

var connecting = null;
var connectionCallback = null;

var defaultTheme = {
	nodeFill: '#eee', 
	pointInactive: '#fff', 
	pointActive: '#ccc',
	
	connectingFill: '#fff', 
	connectingStroke: '#000', 
	connectingStrokeWidth: '5',
	
	lineFill: 'blue', 
	lineStroke: '#000', 
	lineStrokeWidth: '5'
};

//---------------------------------------------------- ServiceEditor -----------------------------------------------
function ServiceEditor(id, width, height, theme) {
	if(theme == undefined)
		this.theme = defaultTheme;
	else {
		this.theme = {};
		for(k in theme)
			this.theme[k] = theme[k];
		for(k in defaultTheme)
			if(this.theme[k] == undefined)
				this.theme[k] = defaultTheme[k];
	}
	
	this.raphael = Raphael(id, width, height);
	this.nodes = [];
	this.selected = null;
    this.serviceDefinitionData = BeanDefinitionBuilder.buildServiceDefinitionData();
	
}

ServiceEditor.prototype.rigConnections = function(point) {
	var sthis = this;
	point.circle.mousedown(
		function(e) {
			(e.originalEvent || e).preventDefault();
			
			var circle = sthis.raphael.circle(point.circle.attr('cx'), point.circle.attr('cy'), 1);
			if(!point.multi && point.connections.length != 0) {
				var other = point.connections[0];
				beginning = other.circle;
				point.removeConnection(sthis.raphael, other);
				connecting = other;
			} else
				connecting = point;
			var line = sthis.raphael.connection(connecting.circle, circle, sthis.theme.connectingFill, sthis.theme.connectingStroke + '|' + sthis.theme.connectingStrokeWidth);
			var jo = $(sthis.raphael.element);
			var mouseup = function() {
				circle.remove();
				sthis.raphael.removeConnection(line);
				connecting = null;
				connectionCallback = null;
				jo.unbind('mouseup', mouseup);
				jo.unbind('mousemove', mousemove);
			};
			jo.mouseup(mouseup);
			
			var sx = undefined, sy = undefined;
			var mousemove = function(e) {
				if(sx == undefined) {
					sx = e.pageX;
					sy = e.pageY;
				}
				circle.translate(e.pageX - sx, e.pageY - sy);
				sthis.raphael.connection(line);
				sx = e.pageX;
				sy = e.pageY;
			};
			jo.mousemove(mousemove);
			
			connectionCallback = function(cpoint) {
				if(cpoint.dir != connecting.dir && cpoint.parent != connecting.parent)
					connecting.connect(sthis.raphael, cpoint);
			};
		}
	);
	point.circle.mouseup(
		function(e) {
			if(connecting == null) return;
			
			connectionCallback(point);
		}
	);
};

ServiceEditor.prototype.addNode = function(x, y, node) {
    var newId = null;
    if(node.data) {
        if(node.data.id) {//如果ComponentDefinition配置了id属性
            newId = node.data.id + this.nodes.length;
        } else {
            newId = getSimpleClassName(node.data.class) + this.nodes.length;
        }
        node.data.setId(newId);
    }

	var sthis = this;
	this.nodes.push(node);
	
	node.raphael = this.raphael;
	node.parent = this;
	node.focus.add(
		function() {
			if(sthis.selected != null)
				sthis.selected.blur();
			sthis.selected = this;
			this.element.toFront();
			this.element.attr('stroke-width', 3);
		}
	);
	node.blur.add(
		function() {
			sthis.selected = null;
			this.element.attr('stroke-width', 1);
		}
	);
	
	var temp = [];
	ly = y+35;
	mx = 0;

    //绘制输入点
	for(i in node.points) {
		var point = node.points[i];
		if(point.dir == 'out') continue;
		point.circle = circle = this.raphael.circle(x+10, ly, 7.5).attr({stroke: '#000', fill: this.theme.pointInactive}).toFront();
		circle.point = point;
        this.rigConnections(point);
		label = this.raphael.text(x+20, ly, point.label).attr({fill: '#000', 'font-size': 12}).xlateText().toFront();
		bbox = label.getBBox();
		ly += bbox.height + 5;
		if(bbox.width > mx)
			mx = bbox.width;
		temp.push(circle);
		temp.push(label);
	}
	lx = (mx != 0) ? mx + 25 : 0;
	lx += x + 25;
	mx = 0;
	my = ly;
	labels = [];
	ly = y+35;

    //绘制输出点
	for(i in node.points) {
		var point = node.points[i];
		if(point.dir == 'in') continue;
        var textX = x + ComponentNode.WIDTH - 55;
		label = this.raphael.text(textX, ly, point.label).attr({fill: '#000', 'font-size': 12}).xlateText().toFront();
		//label = this.raphael.text(lx, ly, point.label).attr({fill: '#000', 'font-size': 12}).xlateText().toFront();
		label.point = point;
		bbox = label.getBBox();
		ly += bbox.height + 5;
		if(bbox.width > mx)
			mx = bbox.width;
		labels.push(label);
	}
	ly = y+35;
	ex = lx + mx + 10;
	
	var text = this.raphael.text(x+5, y+15, node.title).attr({fill: '#000', 'font-size': 14, 'font-weight': 'bold'}).xlateText();
    bbox = text.getBBox();
	if(ex < bbox.width + 80)
		ex = bbox.width + 80;
	
	for(i in labels) {
		var label = labels[i];
        var circleX = x + ComponentNode.WIDTH - 10;
		//label.Point.circle = circle = this.raphael.circle(ex, ly, 7.5).attr({stroke: '#000', fill: this.theme.pointInactive}).toFront();
		label.point.circle = circle = this.raphael.circle(circleX, ly, 7.5).attr({stroke: '#000', fill: this.theme.pointInactive}).toFront();
		circle.point = point;
        this.rigConnections(label.point);
		bbox = label.getBBox();
		ly += bbox.height + 5;
		temp.push(circle);
		temp.push(label);
	}

	//var rect = this.raphael.rect(x, y, ex+10 - x, Math.max(my, ly) - y, 10).attr({fill: this.theme.nodeFill, 'fill-opacity': 0.9});
	var rect = this.raphael.rect(x, y, ComponentNode.WIDTH, ComponentNode.HEIGHT, 10).attr({fill: this.theme.nodeFill, 'fill-opacity': 0.9, 'cursor': 'pointer'});
    //console.info("width=" + rect.attr('width') + "height=" + rect.attr('height'));
    var set = node.element = this.raphael.set().push(rect, text.toFront());
	for(i in temp)
		set.push(temp[i].toFront());
	
	var suppressSelect = false;
	rect.click(function() {
        if(suppressSelect == true) {
            suppressSelect = false;
            return false;
        }
        if(node.selected) {
            node.blur();
        } else {
            node.focus();
        }
        //更新属性显示
        node.refreshPropertiesConfigForm();
	});
	
	function start() {
		this.cx = this.cy = 0;
		this.moved = false;
		set.animate({'fill-opacity': 0.4}, 250);
	}
	function move(dx, dy) {
		set.translate(dx - this.cx, dy - this.cy);
		this.cx = dx;
		this.cy = dy;
		this.moved = true;
		set.toFront();
		for(i in node.points)
			node.points[i].fixConnections(sthis.raphael);
		sthis.raphael.safari();
	}
	function end() {
        //设置ComponentDefinition的X,Y坐标
        var x = rect.attr("x");
        var y = rect.attr("y");
        node.data.x = x;
        node.data.y = y;

		set.animate({'fill-opacity': 0.9}, 250);
		if(this.moved != false)
			suppressSelect = true;
	}
	rect.drag(move, start, end);
};

//移除节点
ServiceEditor.prototype.removeNode = function(_node) {
    if(_node) {
        if(_node.data.class!=startComponentClass) {
            _node.remove();
        } else {
            alert("开始组件禁止移除");
        }
    } else {
        alert("请选择要移除的组件");
    }
};

//移除选中的节点
ServiceEditor.prototype.removeSelectedComponentNode = function() {
    var node = this.getSelectedComponentNode();
    this.removeNode(node);
};

ServiceEditor.prototype.getNodeByClass = function(_class) {
    for(i in this.nodes) {
        if(this.nodes[i].data.class==_class) {
            return this.nodes[i];
        }
    }
    return null;
};

ServiceEditor.prototype.getNodeById = function(_id) {
    for(i in this.nodes) {
        if(this.nodes[i].data.id===_id) {
            return this.nodes[i];
        }
    }
    return null;
};

//获取选中的节点
ServiceEditor.prototype.getSelectedComponentNode = function() {
    for(var i in this.nodes) {
        var node = this.nodes[i];
        if(node.selected) {
            return node;
        }
    }
    return null;
};


//---------------------------------------------- ComponentNode -----------------------------------------------------
function ComponentNode(id, title) {
	this.id = id;
	this.title = title;
    this.data = null;
	this.points = [];

	this.focus = event().add(function() {
		this.selected = true;
	});
	this.blur = event().add(function() {
		this.selected = false;
	});
	this.connect = event();
	this.disconnect = event();
	this.update = event().add(function() {
		this.selected = false;
	});
    //移除节点
	this.remove = event().add(function() {
		if(this.selected)
			this.blur();
		this.element.remove();
		for(var i in this.points)
			this.points[i].remove(this.raphael);
	});
	this.selected = false;
	
	return true;
}

//组件宽度
ComponentNode.WIDTH = 133;
//组件高度
ComponentNode.HEIGHT = 54;


ComponentNode.prototype.addPoint = function(label, dir, multi) {
	var npoint = this[label] = new Point(this, label, dir, multi);
	this.points.push(npoint);
	return this;
};
ComponentNode.prototype.refreshPropertiesConfigForm = function() {
    var componentDefinition = this.data;
    if(componentDefinition.class!=startComponentClass) {
        componentDefinition.refreshPropertiesConfigForm(componentDefinition.id);
    }
};

ComponentNode.prototype.addRaphaelElement = function(_element) {
    this.raphaelElements.push(_element);
};

ComponentNode.prototype.getTransitionById = function(_transitionId) {
    for(var i in this.points) {
        var point = this.points[i];
        for(var j in point.lines) {
            var transition = point.lines[j];
            if(transition.id===_transitionId) {
                return transition;
            }
        }
    }
    return null;
};


//---------------------------------------------- Point -----------------------------------------------------
/**
 * 图标中的点
 * @param parent 父窗口
 * @param label 标签
 * @param dir 方向
 * @param multi 是否可以连接多次
 * @returns {boolean}
 */
function Point(parent, label, dir, multi) {
	this.parent = parent;
	this.label = label;
	this.dir = dir;
	if(multi == undefined)
		this.multi = dir == 'out';
	else
		this.multi = multi;

    //连接到的其它点
	this.connections = [];
    //连入该点的Transition
	this.lines = [];
	
	return true;
}

Point.prototype.remove = function(raphael) {
	for(var i in this.connections)
		this.connections[i].removeConnection(raphael, this, true);
	for(var i in this.lines)
		raphael.removeConnection(this.lines[i]);
};

/** sub为true是表示是被连接的点 **/
Point.prototype.connect = function(raphael, other, sub) {
    if(this.parent.data.type===ComponentDefinition.TYPE_SOURCE
        && other.parent.data.type===ComponentDefinition.TYPE_SOURCE) {
        alert("源组件不能连接源组件");
        return false;
    }

	var sthis = this;
	var editor = this.parent.parent;
	
	if(sub !== true) {
		if(!this.multi && this.connections.length != 0)
			return false;
		else if(!other.multi && other.connections.length != 0)
			return false;
	}
	
	this.connections.push(other);
	this.circle.attr({fill: editor.theme.pointActive});
	var line = null;
    if(sub !== true) {
		function remove() {
			//sthis.removeConnection(raphael, other);
            other.removeConnection(raphael, sthis);
			raphael.safari();
		}
		
		other.connect(raphael, this, true);
		line = raphael.connection(this.circle, other.circle, editor.theme.lineFill, editor.theme.lineStroke + '|' + editor.theme.lineStrokeWidth, remove);
        line.id = this.parent.data.id + transitionIdSeparator + other.parent.data.id;
        this.lines.push(line);
		other.lines.push(line);
	}
	
	this.parent.connect(this, other);

    //连接完成之后，把前后ComponentDefinition连接起来
    if(sub) {//被连接点
        this.parent.data.addInput(other.parent.data.id);
        if(line) {
            this.parent.data.addTransitionInput(line);
        }
    } else {//连接点
        this.parent.data.addOutput(other.parent.data.id);
        if(line) {
            this.parent.data.addTransitionOutput(line);
        }
    }
	return true;
};

Point.prototype.removeConnection = function(raphael, other, sub) {
    var transition = null;
	var editor = this.parent.parent;
	for(var i in this.connections)
		if(this.connections[i] == other) {
			this.connections.splice(i, 1);
			if(sub !== true) {
                transition = this.lines[i];
				other.removeConnection(raphael, this, true);
				raphael.removeConnection(transition);
			}
			this.lines.splice(i, 1);
			break;
		}
	
	if(this.connections.length == 0)
		this.circle.attr({fill: editor.theme.pointInactive});
	
	this.parent.disconnect(this, other);

    //连接线断开后，断开相互连接的两个ComponentDefinition
    if(sub) {//被断开点
        this.parent.data.removeOutput(other.parent.data.id);
    } else {//断开点
        this.parent.data.removeInput(other.parent.data.id);

        //移除相应的输入与输出
        this.parent.data.removeTransitionInput(transition);
        other.parent.data.removeTransitionOutput(transition);
    }
};

//更新连接线
Point.prototype.fixConnections = function(raphael) {
	for(var i in this.lines)
		raphael.connection(this.lines[i]);
	raphael.safari();
};


//----------------------------------------Transition--------------------------------------------
function Transition(_line, _bg, _fromCircle, _toCircle) {
    this.line = _line;
    this.bg = _bg;
    this.from = _fromCircle;
    this.to = _toCircle;
    this.id = "";//transitionId由相互连接的组件定义ID构成
    this.name = "";
    this.description = "";

    var conn = this;
    if(_line) {//判断是否是执行ExpressionConnection.prototype = new Connection();导致创建
        _line.click(function(){
            conn.refreshPropertiesConfigForm();
        });
    }
}

/**
 * 获取From组件定义ID
 */
Transition.prototype.getFromTargetRef = function() {
    return this.id.split(transitionIdSeparator)[0];
};

/**
 * 获取To组件定义ID
 */
Transition.prototype.getToTargetRef = function() {
    return this.id.split(transitionIdSeparator)[1];
};

/**
 * 刷新配置表单
 */
Transition.prototype.refreshPropertiesConfigForm = function() {
    var form = $('#comp-props-display-form');
    form.empty();
    form.append('<div class="row prop-entry" >' +
        '<input type="hidden" value="' +this.id+ '" id="transition-id-hidden"/></div>');
    var html = '<div class="row prop-entry" ><div class="prop-label">类型：</div>';
    html += '<div class="prop-input"><select id="transition-type-select">' +
        '<option selected="selected" value="' +Transition.TYPE_NORMAL+ '">普通连线</option>' +
        '<option value="' +Transition.TYPE_EXPRESSION+ '">表达式连线</option></select></div></div>';

    html += '<div class="row prop-entry" ><div class="prop-label">下一组件名称：</div>';
    html += '<div class="prop-input"><input name="name" size="28" value="' +this.name+ '"/></div></div>';
    html += '<div class="row prop-entry" ><div class="prop-label">下一组件描述：</div>';
    html += '<div class="prop-input"><input name="description" size="28" value="' +this.description+ '"/></div></div>';

    html += '</div>';
    form.append(html);
};

/**
 * 将普通连线转换为表达式连线
 * @param _scriptLanguage 表达式语语言
 * @param _expression 表达式字符串
 * @returns {ExpressionTransition}
 */
Transition.prototype.toExpression = function(_scriptLanguage, _expression) {
    var expressionTransition = new ExpressionTransition(this.line, this.bg, this.from, this.to);
    expressionTransition.scriptLanguage = _scriptLanguage;
    expressionTransition.expression = _expression;
    expressionTransition.id = this.id;
    return expressionTransition;
};


Transition.TYPE_NORMAL = "normal";
Transition.TYPE_EXPRESSION = "expression";

Transition.prototype.toServiceDefinition = function() {
    var definition = {};
    definition.targetRef = this.getToTargetRef();
    definition.name = this.name;
    definition.description = this.description;
    return definition;
};

function ExpressionTransition(_line, _bg, _fromCircle, _toCircle) {
    Transition.call(this, _line, _bg, _fromCircle, _toCircle);
    this.scriptLanguage = "";
    this.expression = "";
    this.id = "";
    this.name = "";
    this.description = "";

}
ExpressionTransition.prototype = new Transition();

/**
 * 将表达式连线转换为普通连线
 */
ExpressionTransition.prototype.toNormal = function() {
    var transition = new Transition(this.line, this.bg, this.from, this.to);
    transition.id = this.id;
    return transition;
};

/**
 * 刷新配置表单
 */
ExpressionTransition.prototype.refreshPropertiesConfigForm = function() {
    var form = $('#comp-props-display-form');
    form.empty();
    form.append('<div class="row prop-entry" >' +
        '<input type="hidden" value="' +this.id+ '" id="transition-id-hidden"/></div>');
    var html = '<div class="row prop-entry" ><div class="prop-label">类型：</div>';
    html += '<div class="prop-input"><select id="transition-type-select">' +
    '<option value="' +Transition.TYPE_NORMAL+ '">普通连线</option>' +
    '<option selected="selected" value="' +Transition.TYPE_EXPRESSION+ '">表达式连线</option></select></div></div>';

    html += '<div class="row prop-entry" ><div class="prop-label">下一组件名称：</div>';
    html += '<div class="prop-input"><input name="name" size="28" value="' +this.name+ '"/></div></div>';
    html += '<div class="row prop-entry" ><div class="prop-label">下一组件描述：</div>';
    html += '<div class="prop-input"><input name="description" size="28" value="' +this.description+ '"/></div></div>';


    html += '<div class="row prop-entry" ><div class="prop-label">表达式语言：</div>';
    html += '<div class="prop-input"><select name="scriptLanguage">';
    for(var i in expressionLanguages) {
        var lang = expressionLanguages[i];
        if(lang==this.scriptLanguage) {
            html += '<option selected="selected" value="' +lang+ '">' +lang+ '</option>';
        } else {
            html += '<option value="' +lang+ '">' +lang+ '</option>';
        }
    }
    html += '</select></div></div>';

    html += '<div class="row prop-entry" ><div class="prop-label">表达式：</div>';
    html += '<div class="prop-input"><input name="expression" size="28" value="' +this.expression+ '"/></div></div>';

    html += '</div>';
    form.append(html);
};


ExpressionTransition.prototype.toServiceDefinition = function() {
    var definition = Transition.prototype.toServiceDefinition.call(this);
    definition.scriptLanguage = this.scriptLanguage;
    definition.expression = this.expression;
    return definition;
};
