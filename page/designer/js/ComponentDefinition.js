/**
 * Created by zj on 14-10-15.
 */
function BeanDefinition(_class) {
    this.class = _class;
    this.propertyDefinitions = [];
    this.id = "";
}

/**
 * 转换成服务定义相关数据
 * @returns {{}}
 */
BeanDefinition.prototype.toServiceDefinition = function() {
    var definition = {};
    definition.class = this.class;
    definition.id = this.id;
    for(var i in this.propertyDefinitions) {
        var propertyDefinition = this.propertyDefinitions[i];
        if(propertyDefinition.isRef()) {//如果是引用属性
            var result = propertyDefinition.toServiceDefinition();
            if(result) {
                definition[propertyDefinition.name] = result;
            }
        } else {
            var value = propertyDefinition.value;
            if(value!=null && value!=undefined && ""!==value) {
                definition[propertyDefinition.name] = value;
            }
        }
    }
    return definition;
};


BeanDefinition.prototype.getPropertyDefinition = function(_name) {
    for(var i in this.propertyDefinitions) {
        if(this.propertyDefinitions[i].name==_name) {
            return this.propertyDefinitions[i];
        }
    }
    return null;
};

BeanDefinition.prototype.addPropertyDefinition = function(_propertyDefinition) {
    //_propertyDefinition.belongToId = this;
    this.propertyDefinitions.push(_propertyDefinition);
};

BeanDefinition.prototype.addPropertyDefinition2 = function(_propertyData) {
    var propertyDefinition = BeanDefinitionBuilder.buildPropertyDefinition(_propertyData, this);
    this.propertyDefinitions.push(propertyDefinition);
};

/**
 * 根据BeanDefinition ID搜索BeanDefinition
 * @param _beanDefinitionId
 * @returns {*}
 */
BeanDefinition.prototype.searchById = function(_beanDefinitionId) {
    if(this.id==_beanDefinitionId) {
        return this;
    }
    return this.getRefPropertyBeanDefinitionById(_beanDefinitionId);
};

/**
 * 根据BeanDefinition ID在当前BeanDefinition的所有引用属性所引用的BeanDefinition查找
 * @param _beanDefinitionId
 */
BeanDefinition.prototype.getRefPropertyBeanDefinitionById = function(_beanDefinitionId) {
    var targetBeanDefinition = null;
    for(var i in this.propertyDefinitions) {
        var propertyDefinition = this.propertyDefinitions[i];
        if(propertyDefinition.type.indexOf("ref-")!=-1) {//该属性为引用属性
            targetBeanDefinition = propertyDefinition.getRefBeanDefinitionById(_beanDefinitionId);
            if(targetBeanDefinition) {//如果有值了，说明已经找到了
                return targetBeanDefinition;
            }
        }
    }
    return targetBeanDefinition;
};

/**
 *  ID为_beanDefinitionId的在BeanDefinition查找名为_name的引用属性
 * @param _beanDefinitionId
 * @param _name
 * @returns {*}
 */
BeanDefinition.prototype.getRefPropertyDefinition = function(_beanDefinitionId, _name) {
    var beanDefinition = this.searchById(_beanDefinitionId);
    if(beanDefinition) {
        for(var i in beanDefinition.propertyDefinitions) {
            var propertyDefinition = beanDefinition.propertyDefinitions[i];
            if(propertyDefinition.type.indexOf("ref-")!=-1) {
                if(propertyDefinition.name==_name) {
                    return propertyDefinition;
                }
            }
        }
    }
    return null;
};

/**
 * 设置BeanDefinition ID 并且联动的将其各属性所属BeanDefinition ID设置好
 * @param _id ID
 */
BeanDefinition.prototype.setId = function(_id) {
    this.id = _id;
    for(var i in this.propertyDefinitions) {
        var propertyDefinition = this.propertyDefinitions[i];
        propertyDefinition.setBelongToId(_id);
    }
};

/**
 * 刷新ComponentDefinition属性配置表单
 * @param _class 当前配置的ComponentDefinition类名
 * @param _belongToId 配置引用属性后，返回到的BeanDefinition ID
 */
BeanDefinition.prototype.refreshPropertiesConfigForm = function(_class, _belongToId) {
    var form = $('#comp-props-display-form');
    form.empty();
    form.append('<div class="row prop-entry" >' +
        '<input type="hidden" name="class" value="' +_class+ '" id="comp-definition-class-hidden"/></div>');
    form.append('<div class="row prop-entry" >' +
        '<input type="hidden" name="class" value="' +this.id+ '" id="bean-definition-id-hidden"/></div>');
    for(var i in this.propertyDefinitions) {
        var propDefinition = this.propertyDefinitions[i];
        form.append(propDefinition.getInputHtml());
    }

    //如果不是组件定义，而且不是ServiceDefination，则是引用属性引用的BeanDefinition
    if(!this.isComponentDefinition() && this.class!=serviceDefinitionClass) {
        //加上返回上一层按钮
        var html = '<div class="row prop-entry" ><button type="button" lang="' +_belongToId+ '"' +
            'id="back-to-prev-bean-definition-button">返回</button></div>';
        form.append(html);
    }
};


/**
 * 判断是否是组件定义
 * @returns {boolean}
 */
BeanDefinition.prototype.isComponentDefinition = function() {
    var comp = false;
    if(this.inputs) {
        comp = true;
    }
    return comp;
};


/**
 * 为当前BeanDefinition的所有属性设置BelongTo属性
 */
BeanDefinition.prototype.assignPropertyBelongTo = function() {
    for(var i in this.propertyDefinitions) {
        var propertyDefinition = this.propertyDefinitions[i];
        propertyDefinition.belongTo = this;
        if(propertyDefinition.isRef()) {//如果是引用属性，则将引用属性的各个可引用的BeanDefinition的属性也设置belongTo属性值
            propertyDefinition.assignRefBeanDefinitionPropertyBelongTo();
        }
    }
};

/**
 * 在BeanDefinition ID为_beanDefinitionId的BeanDefinition中搜寻名这_propName的ArrayOrListPropertyDefinition
 * @param _beanDefinitionId BeanDefinition ID
 * @param _propName 属性名称
 * @returns {*}
 */
BeanDefinition.prototype.getArrayOrListPropertyDefinition = function(_beanDefinitionId, _propName) {
    var beanDefinition = this.searchById(_beanDefinitionId);
    if(beanDefinition) {
        for(var i in beanDefinition.propertyDefinitions) {
            var propertyDefinition = beanDefinition.propertyDefinitions[i];
            if(propertyDefinition.isArrayOrList()) {
                if(propertyDefinition.name==_propName) {
                    return propertyDefinition;
                }
            }
        }
    }
    return null;
};

/**
 * 在BeanDefinition ID为_beanDefinitionId的BeanDefinition中搜寻名这_propName的MapPropertyDefinition
 * @param _beanDefinitionId BeanDefinition ID
 * @param _propName 属性名称
 * @returns {*}
 */
BeanDefinition.prototype.getMapPropertyDefinition = function(_beanDefinitionId, _propName) {
    var beanDefinition = this.searchById(_beanDefinitionId);
    if(beanDefinition) {
        for(var i in beanDefinition.propertyDefinitions) {
            var propertyDefinition = beanDefinition.propertyDefinitions[i];
            if(propertyDefinition.isMap()) {
                if(propertyDefinition.name==_propName) {
                    return propertyDefinition;
                }
            }
        }
    }
    return null;
};


//-------------------------------- ComponentDefinition -------------------------

function ComponentDefinition(_class) {
    BeanDefinition.call(this, _class);
    this.inputs = [];
    this.outputs = [];
    this.x = 0;
    this.y = 0;
}
ComponentDefinition.prototype = new BeanDefinition();

/**
 * 转换成服务定义相关数据
 * @returns {*}
 */
ComponentDefinition.prototype.toServiceDefinition = function() {
    //调用父类方法
    var definition = BeanDefinition.prototype.toServiceDefinition.call(this);
    definition.x = this.x;
    definition.y = this.y;
    definition.outputs = [];

    for(var i in this.outputs) {
        var outoutId = this.outputs[i];
        var transition = {};
        var outputBeanDefinition = serviceEditor.getNodeById(outoutId).data;
        transition.targetRef = outputBeanDefinition.toServiceDefinition();
        definition.outputs.push(transition);
    }
    return definition;
};

ComponentDefinition.prototype.addInput = function(_inputId) {
    //判断_inputId是否已经存在
    if(!this.containsInput(_inputId)) {//不存在才添加
        this.inputs.push(_inputId);
    }
};
//判断_inputId是否已经存在
ComponentDefinition.prototype.containsInput = function(_inputId) {
    for(var i in this.inputs) {
        if(this.inputs[i]===_inputId) {
            return true;
        }
    }
    return false;
};

ComponentDefinition.prototype.addOutput = function(_outputId) {
    //判断_outputId是否已经存在
    if(!this.containsOutput(_outputId)) {//不存在才添加
        this.outputs.push(_outputId);
    }
};

//判断_outputId是否已经存在
ComponentDefinition.prototype.containsOutput = function(_outputId) {
    for(var i in this.outputs) {
        if(this.outputs[i]===_outputId) {
            return true;
        }
    }
    return false;
};
ComponentDefinition.prototype.removeInput = function(_inputId) {
    var newInputs = [];
    for(var i in this.inputs) {
        if(this.inputs[i]!=_inputId) {
            newInputs.push(this.inputs[i]);
        }
    }
    this.inputs = newInputs;
};
ComponentDefinition.prototype.removeOutput = function(_outputId) {
    var newOutputs = [];
    for(var i in this.outputs) {
        if(this.outputs[i]!=_outputId) {
            newOutputs.push(this.outputs[i]);
        }
    }
    this.outputs = newOutputs;
};




//-------------------------------- BeanDefinitionBuilder -------------------------

function BeanDefinitionBuilder(_definitionData, _isComp) {
    this.definitionData = _definitionData;
    this.isComp = _isComp;
}
BeanDefinitionBuilder.prototype.build = function() {
    var className = this.definitionData.bean.class;
    var beanDefinition = new BeanDefinition(className);
    if(this.isComp) {
        beanDefinition = new ComponentDefinition(className);
    }
    beanDefinition.id = this.definitionData.bean.id;
    var properties = this.definitionData.properties;
    for(var i in properties) {
        //var propertyDefinition = BeanDefinitionBuilder.buildPropertyDefinition(properties[i]);
        //beanDefinition.addPropertyDefinition(propertyDefinition);
        beanDefinition.addPropertyDefinition2(properties[i]);
    }

    return beanDefinition;
};

/**
 * 构建属性定义
 * @param _prop 属性定义数据
 * //@param _beanDefinitionId  该属性定久所属的BeanDefinition ID  因为js无法处理循环引用问题
 * @returns {*} 属性定义
 */
BeanDefinitionBuilder.buildPropertyDefinition = function(_prop, _belongTo) {
    var propertyDefinition = null;
    var valueType = _prop.type;
    if(valueType.indexOf("ref-")!=-1) {//如果值类型是引用类型
        propertyDefinition = new RefPropertyDefinition(_prop.name, _prop.value, _prop.type);
    } else if(valueType.indexOf("list-")!=-1 || valueType.indexOf("array-")!=-1){
        propertyDefinition = new ArrayOrListPropertyDefinition(_prop.name, _prop.value, _prop.type);
    } else if(valueType.indexOf("map-")!=-1) {
        propertyDefinition = new MapPropertyDefinition(_prop.name, _prop.value, _prop.type);
    } else if(_prop.inputType==PropertyDefinition.input_type_combo) {
        propertyDefinition = new ComboPropertyDefinition(_prop.name, _prop.value, _prop.type, _prop.selectValues);
    } else {
        propertyDefinition = new PropertyDefinition(_prop.name, _prop.value, _prop.type);
    }
    //propertyDefinition.beanDefinitionId = _beanDefinitionId;
    if(propertyDefinition.loadRefBeanDefinitions) {
        propertyDefinition.loadRefBeanDefinitions();
    }

    if(_prop.required) {
        propertyDefinition.required = _prop.required;
    }
    if(_prop.inputType) {
        propertyDefinition.inputType = _prop.inputType;
    }
    propertyDefinition.desc = _prop.desc;
    return propertyDefinition;
};

BeanDefinitionBuilder.buildServiceDefinitionData = function() {
    var jsonData = {
        "bean" : {
            "id" : "",
            "class" : serviceDefinitionClass
        },
        "properties" : [{
            "name" : "serviceId",
            "value" : "",
            "type" : "string",
            "desc" : "服务ID",
            "required" : true
        }, {
            "name" : "description",
            "value" : "",
            "type" : "string",
            "desc" : "描述"
        }, {
            "name" : "serviceName",
            "value" : "",
            "type" : "string",
            "desc" : "服务名称"
        }, {
            "name" : "vendor",
            "value" : "",
            "type" : "string",
            "desc" : "提供商"
        }, {
            "name" : "businessType",
            "value" : "",
            "type" : "string",
            "desc" : "业务类型"
        }, {
            "name" : "autoStart",
            "value" : false,
            "type" : "boolean",
            "desc" : "自启用",
            "inputType" : 3,
            "selectValues" : [{
                "display" : "是",
                "value" : true
            }, {
                "display" : "否",
                "value" : false
            }]
        }, {
            "name" : "trace",
            "value" : false,
            "type" : "boolean",
            "desc" : "启用跟踪",
            "inputType" : 3,
            "selectValues" : [{
                "display" : "是",
                "value" : true
            }, {
                "display" : "否",
                "value" : false
            }]
        }, {
            "name" : "enableMonitor",
            "value" : true,
            "type" : "boolean",
            "desc" : "路由监控",
            "inputType" : 3,
            "selectValues" : [{
                "display" : "是",
                "value" : true
            }, {
                "display" : "否",
                "value" : false
            }]
        }, {
            "name" : "businessSequence",
            "value" : 1,
            "type" : "int",
            "desc" : "序列号"
        }]
    };

    var builder = new BeanDefinitionBuilder(jsonData, false);
    return builder.build();
};