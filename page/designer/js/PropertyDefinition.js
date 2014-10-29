/**
 * Created by zj on 14-10-15.
 */
/*var Namespace = {};
Namespace.register = function(path){
    var arr = path.split(".");
    var ns = "";
    for(var i=0;i<arr.length;i++){
        if(i>0) ns += ".";
        ns += arr[i];
        eval("if(typeof(" + ns + ") == 'undefined') " + ns + " = new Object();");
    }
};
Namespace.register("com.kingyea.esb");

com.kingyea.esb.Property = function(_name, _value) {
    this.name = _name;
    this.value = _value;
    this.sayHello = function() {
        alert("hello:" + this.name);
    }
};

var p = new com.kingyea.esb.Property("zhangsan", "25");
p.sayHello();*/


/**
 * 属性定义基类
 * @param _name 属性名称
 * @param _value 属性默认值
 * @param _type 属性值类型，如：int, string, boolean, ref-*
 * @constructor
 */
function PropertyDefinition(_name, _value, _type) {
    this.name = _name;
    this.value = _value;
    this.type = _type;
    /** 该属性定义所属的BeanDefinition**/
    this.inputType = PropertyDefinition.input_type_text;
    this.required = false;
    this.desc = null;
    /** 该属性定义所属的BeanDefinition ID, js循环引用出现问题**/
    //在BeanDefinition.setId()方法中设置
    this.belongToId = ""
}
PropertyDefinition.input_type_text = 0;
PropertyDefinition.input_type_radio = 1;
PropertyDefinition.input_type_checkbox = 2;
PropertyDefinition.input_type_combo = 3;

PropertyDefinition.prototype.isRef = function() {
    return this.type.indexOf("ref-")!=-1;
};
PropertyDefinition.prototype.isArrayOrList = function() {
    return this.type.indexOf("array-")!=-1 || this.type.indexOf("list-")!=-1;
};
PropertyDefinition.prototype.isMap = function() {
    return this.type.indexOf("map-")!=-1;
};

PropertyDefinition.prototype.setBelongToId = function(_id) {
    this.belongToId = _id;
};

PropertyDefinition.prototype.getInputLabel = function() {
    var label = this.name;
    if(this.desc) {
        label = this.desc;
    }
    return label;
};
PropertyDefinition.prototype.getInputLabelHtml = function() {
    return '<div class="row prop-entry" ><div class="prop-label">' + this.getInputLabel() + '：</div>';
};
PropertyDefinition.prototype.getInputHtml = function() {
    //<div class="row prop-entry" >
        //<div class="prop-label">目录:</div>
        // <div class="prop-input"><input name="dir" /></div>
    //</div>
    var html = this.getInputLabelHtml();
    html += '<div class="prop-input"><input size="28" class="bean-prop" type="text" name="' +this.name+ '" value="';
    html += this.value +'" /></div></div>';
    return html;
};


/** 下拉列表属性定义 **/
function ComboPropertyDefinition(_name, _value, _type, _selectValues) {
    PropertyDefinition.call(this, _name, _value, _type);
    this.selectValues = _selectValues;
    this.inputType = PropertyDefinition.input_type_combo;
}
ComboPropertyDefinition.prototype = new PropertyDefinition();
ComboPropertyDefinition.prototype.getInputHtml = function() {
    //<div class="row prop-entry" >
        //<div class="prop-label">固定频率:</div>
        //<div class="prop-input">
            //<select name="fixRate">
                //<option value="true">是</option>
                //<option value="false">否</option>
            //</select>
        //</div>*/
    //</div>
    var html = this.getInputLabelHtml();
    html += '<div class="prop-input"><select class="normal-prop" name="' +this.name+ '">';
    for(var i in this.selectValues) {
        var selectValue = this.selectValues[i];
        if(selectValue.value==this.value) {
            html += '<option selected="selected" value="' +selectValue.value+ '">' +selectValue.display+ '</option>';
        } else {
            html += '<option value="' +selectValue.value+ '">' +selectValue.display+ '</option>';
        }
    }
    html += '</select></div></div>';
    return html;
};

/** 引用属性定义 **/
function RefPropertyDefinition(_name, _value, _type) {
    PropertyDefinition.call(this, _name, _value, _type);
    this.beanDefinitions = [];
    this.selectedBeanDefinitionType = null;
    this.resources = null;
    this.selectedResource = null;
    this.valueMode = null;
}
RefPropertyDefinition.prototype = new PropertyDefinition();
RefPropertyDefinition.VALUE_MODE_RESOURCE = "resource";
RefPropertyDefinition.VALUE_MODE_CONFIG = "config";

/**
 * 获取引用属性声明的抽象类型
 * @returns {*}
 */
RefPropertyDefinition.prototype.getAbstractType = function(){
    return this.type.split("-")[1];
};

RefPropertyDefinition.prototype.loadRefBeanDefinitions = function() {
    var className = this.getAbstractType();
    this.resources = ComponentDefinitionLoader.getInstance().getResourcesByClassName(className);
    if(this.resources) {
        this.valueMode = RefPropertyDefinition.VALUE_MODE_RESOURCE;
    } else {
        this.valueMode = RefPropertyDefinition.VALUE_MODE_CONFIG;
    }
    var refDefinitionDatas = ComponentDefinitionLoader.getInstance()
        .getRefBeanDefinitionDatasByClassName(className);
    if(refDefinitionDatas) {
        for(var i in refDefinitionDatas) {
            var refDefinitionData = refDefinitionDatas[i];
            var builder = new BeanDefinitionBuilder(refDefinitionData.definition, false);
            var refBeanDefinition = builder.build();
            this.beanDefinitions.push({
                "type" : refDefinitionData.type,
                "definition" : refBeanDefinition
            });
            if(this.value) {//如果引用属性value存在
                if(refDefinitionData.type===this.value) {//并且value与某一类型相同
                    this.selectedBeanDefinitionType = refDefinitionData.type;//则赋值给当前选择的type
                }
            }
        }

    } else {
        alert("引用属性:" + className + "未找到");
    }
};

/**
 * 获取该引用属性定义当前选择的BeanDefinition
 * @returns {*}
 */
RefPropertyDefinition.prototype.getSelectedBeanDefinition = function() {
    if(this.selectedBeanDefinitionType) {
        for(var i in this.beanDefinitions) {
            if(this.selectedBeanDefinitionType==this.beanDefinitions[i].type) {
                return this.beanDefinitions[i];
            }
        }
    }
    return null;
};


/**
 * 获取该引用属性的显示html字符串，用于Jquery创建并显示
 * @returns {*}
 */
RefPropertyDefinition.prototype.getInputHtml = function() {
    //<div class="row prop-entry" >
        //<div class="prop-label">固定频率:</div>
        //<div class="prop-input">
            //<select name="fixRate">
                //<option value="true">是</option>
                //<option value="false">否</option>
            //</select><button>配置</button>
        //</div>*/
    //</div>
    var html = this.getInputLabelHtml();
    if(this.valueMode===RefPropertyDefinition.VALUE_MODE_RESOURCE) {//如果是选择资源模式
        //如果有资源，优先选择资源，所以隐藏配置
        html += this.getResourceHtml(true);
        html += this.getConfigHtml(false);
    } else {//手动配置模式
        if(this.resources) {//如果有资源
            html += this.getResourceHtml(false);
        }
        html += this.getConfigHtml(true);
    }
    html += '</div></div>';
    return html;
};

/**
 * 获取资源选择Html字符串
 * @param _show 是否显示
 * @returns {string}
 */
RefPropertyDefinition.prototype.getResourceHtml = function(_show) {
    var html = "";
    var spanHtml = _show ? '<span>' : '<span style="display: none;">';
    if(!this.selectedResource) {//如果还没有选择资源，说明是第一次出现
        if(this.required) {
            this.selectedResource = this.resources[0];
        } else {
            this.selectedResource = "";//选择不使用
        }
    }
    html += '<div class="prop-input">' +spanHtml+ '<select style="width: 100px;" class="ref-prop-resource" name="' +this.name+ '">';
    if(!this.required) {
        html += '<option value="">不使用</option>';
    }
    for(var i in this.resources) {
        var resource = this.resources[i];
        if(this.selectedResource==resource) {
            html += '<option selected="selected" value="' +resource+ '">' +resource+ '</option>';
        } else {
            html += '<option value="' +resource+ '">' +resource+ '</option>';
        }
    }
    html += '<option value="' +manualConfigRefPropValue+ '">手动配置</option>';
    html += '</select>选择资源</span>';
    return html;
};

/**
 * 获取手动配置时的Html字符串
 * @param _show 是否显示
 */
RefPropertyDefinition.prototype.getConfigHtml = function(_show) {
    var html = "";
    var spanHtml = _show ? '<span>' : '<span style="display: none;">';
    html += spanHtml + '<select class="ref-bean-definition-select" name="' +this.name+ '" >';
    if(!this.required) {
        if(!this.selectedBeanDefinitionType && !this.resources) {//如果还没有选择引用Bean类型，说明是第一次出现
            this.selectedBeanDefinitionType = "";
        }

        html += '<option value="">不使用</option>';
    }
    for(var i in this.beanDefinitions) {
        var beanDefinition = this.beanDefinitions[i];
        if(this.selectedBeanDefinitionType==beanDefinition.type) {
            html += '<option selected="selected" value="' +beanDefinition.type+ '">' +beanDefinition.type+ '</option>';
        } else {
            html += '<option value="' +beanDefinition.type+ '">' +beanDefinition.type+ '</option>';
        }
    }
    if(this.resources) {//如果有资源则添加一选择资源选项
        html += '<option value="' +resourceRefPropValue+ '">选择资源</option>';
    }
    if(!this.selectedBeanDefinitionType) {//如果选择了不使用
        html += '</select><button disabled="disabled" type="button" class="ref-config btn btn-primary btn-xs" lang="' +this.belongToId+ '">配置</button></span>';
    } else {
        html += '</select><button type="button" class="ref-config btn btn-primary btn-xs" lang="' +this.belongToId+ '">配置</button></span>';
    }
    return html;
};

/**
 * 根据BeanDefinition ID在该引用属性定义中查找BeanDefinition，因为引用属性定义可能继续
 * 引用BeanDefinition，所以要递归
 * @param _beanDefinitionId
 * @returns {*}
 */
RefPropertyDefinition.prototype.getRefBeanDefinitionById = function(_beanDefinitionId) {
    var targetBeanDefinition = null;
    for(var i in this.beanDefinitions) {
        var beanDefinition = this.beanDefinitions[i].definition;
        if(beanDefinition.id==_beanDefinitionId) {
            return beanDefinition;
        }
        targetBeanDefinition = beanDefinition.searchById(_beanDefinitionId);
        if(targetBeanDefinition) {//如果有值了，说明已经找到，则返回
            return targetBeanDefinition;
        }
    }
    return targetBeanDefinition;
};

/**
 * 设置当前引用属性定义所属的BeanDefinition ID
 * @param _id BeanDefinition ID
 */
RefPropertyDefinition.prototype.setBelongToId = function(_id) {
    this.belongToId = _id;
    for(var i in this.beanDefinitions) {
        var beanDefinition = this.beanDefinitions[i].definition;
        beanDefinition.setId(this.belongToId + "-" + getSimpleClassName(beanDefinition.class) + i);
    }
};

RefPropertyDefinition.prototype.toServiceDefinition = function() {
    if(this.valueMode==RefPropertyDefinition.VALUE_MODE_RESOURCE) {//如果是资源模式
        if(this.selectedResource) {//如果选择了资源，没有选择不使用
            return resourcePropPrefix + this.selectedResource;
        }
        return null;
    } else {//手动配置模式
        if(this.selectedBeanDefinitionType) {//如果选择了引用Bean类型，没有选择不使用
            return this.getSelectedBeanDefinition().definition.toServiceDefinition();
        }
        return null;
    }
};




//-----------------------------------------------------------------------------------------------------------------
/** 数组或列表属性定义 **/
function ArrayOrListPropertyDefinition(_name, _value, _type) {
    PropertyDefinition.call(this, _name, _value, _type);
    this.elementType = this.type.split("-")[1];
    this.value = [];
    if(_value && (_value instanceof Array)) {
        this.value = _value;
    }
}
ArrayOrListPropertyDefinition.prototype = new PropertyDefinition();

/**
 * 获取该引用属性的显示html字符串，用于Jquery创建并显示
 * @returns {*}
 */
ArrayOrListPropertyDefinition.prototype.getInputHtml = function() {
    //<div class="row prop-entry" >
        //<div class="prop-label">接收者:</div>
        //<div class="prop-input">
            //<input name="receiver"/>
        //</div><button type="button">添加</button>*/
    //</div>
    var html = this.getInputLabelHtml();
    var displayValue = this.getDisplayString();
    html += '<div class="prop-input"><input readonly="readonly" name="' +this.name+ '" value="' +displayValue+ '"/>';
    html += '<button type="button" class="arrayorlist-config btn btn-primary btn-xs" lang="' +this.belongToId+ '">配置</button></div></div></div>';
    return html;
};

ArrayOrListPropertyDefinition.prototype.clear = function() {
    this.value = [];
};

ArrayOrListPropertyDefinition.prototype.add = function(_value) {
    this.value.push(_value);
};
ArrayOrListPropertyDefinition.prototype.remove = function(_value) {
    var newValues = [];
    for(var i in this.value) {
        if(this.value[i]!==_value) {
            newValues.push(this.value[i]);
        }
    }
    this.value = newValues;
};

ArrayOrListPropertyDefinition.prototype.getDisplayString = function() {
    return this.value.join(',');
};
ArrayOrListPropertyDefinition.prototype.toServiceDefinition = function() {
    return this.value;
};

//当点击配置数据或列表属性时，更新属性配置表单
ArrayOrListPropertyDefinition.prototype.refreshPropertiesConfigForm = function() {
    var beanDefinitionId = $('#bean-definition-id-hidden').val();
    var compId = $('#comp-definition-id-hidden').val();
    var form = $('#comp-props-display-form');
    form.empty();
    form.append('<div class="row prop-entry" ><input type="hidden" name="compDefinitionClass"' +
        ' value="' +compId+ '" id="comp-definition-id-hidden"/></div>');
    form.append('<div class="row prop-entry" ><input type="hidden" name="beanDefinitionId" ' +
        'value="' +beanDefinitionId+ '" id="bean-definition-id-hidden"/></div>');
    form.append('<div class="row prop-entry" ><input type="hidden" name="beanDefinitionPropName" ' +
        'value="' +this.name+ '" id="bean-definition-propname-hidden"/></div>');
    if(this.value.length==0) {
        form.append('<div class="row prop-entry" ><input class="array-or-list-element"/>' +
            '<button type="button" class="remove-array-or-list-element btn btn-primary btn-xs">移除</button></div>');
    } else {
        for(var i in this.value) {
            var element = this.value[i];
            form.append('<div class="row prop-entry" >' +
                '<input class="array-or-list-element"  value="' +element+ '"/>' +
                '<button type="button" class="remove-array-or-list-element">移除</button></div>');
        }
    }
    form.append('<div class="row prop-entry"><button class="btn btn-primary btn-xs" type="button" id="add-array-or-list-element-button">添加</button>' +
        '<button type="button" id="back-to-prev-bean-definition-button" ' +
        'lang="' +beanDefinitionId+ '" class="btn btn-primary btn-xs">返回</button></div>');
};



//-----------------------------------------------------------------------------------------------------------------
/** Map属性定义 **/
function MapPropertyDefinition(_name, _value, _type) {
    PropertyDefinition.call(this, _name, _value, _type);
    var elements = _type.split("-");
    this.keyType = elements[1];
    this.valueType = elements[2];
    this.value = {};
    if(_value && (_value instanceof Object)) {
        this.value = _value;
    }
}
MapPropertyDefinition.prototype = new PropertyDefinition();

/**
 * 获取该引用属性的显示html字符串，用于Jquery创建并显示
 * @returns {*}
 */
MapPropertyDefinition.prototype.getInputHtml = function() {
    //<div class="row prop-entry" >
        //<div class="prop-label">map:</div>
        //<div class="prop-input">
            //<input name="map"/><button type="button">配置</button>
        //</div>
    //</div>
    var html = this.getInputLabelHtml();
    var displayValue = this.getDisplayString();
    html += '<div class="prop-input"><input readonly="readonly" name="' +this.name+ '" value="' +displayValue+ '"/>';
    html += '<button type="button" class="map-config btn btn-primary btn-xs" lang="' +this.belongToId+ '">配置</button></div></div></div>';
    return html;
};
MapPropertyDefinition.prototype.getDisplayString = function() {
    var display = "";
    for(var key in this.value) {
        display += key + "=" + this.value[key] + ",";
    }
    if(display) {
        display = display.substring(0, display.length-1);
    }
    return display;
};
MapPropertyDefinition.prototype.toServiceDefinition = function() {
    return this.value;
};

MapPropertyDefinition.prototype.clear = function() {
    this.value = {};
};

MapPropertyDefinition.prototype.add = function(_key, _value) {
    this.value[_key] = _value;
};
MapPropertyDefinition.prototype.remove = function(_key) {
    delete this.value[_key];
};

MapPropertyDefinition.prototype.isEmpty = function() {
    for(var key in this.value) {
        return false;
    }
    return true;
};

//当点击配置Map属性时，更新属性配置表单
MapPropertyDefinition.prototype.refreshPropertiesConfigForm = function() {
    var beanDefinitionId = $('#bean-definition-id-hidden').val();
    var compId = $('#comp-definition-id-hidden').val();
    var form = $('#comp-props-display-form');
    form.empty();
    form.append('<div class="row prop-entry" ><input type="hidden" name="compDefinitionClass" ' +
        'value="' +compId+ '" id="comp-definition-id-hidden"/></div>');
    form.append('<div class="row prop-entry" ><input type="hidden" name="beanDefinitionId" ' +
        'value="' +beanDefinitionId+ '" id="bean-definition-id-hidden"/></div>');
    form.append('<div class="row prop-entry" ><input type="hidden" name="beanDefinitionPropName" ' +
        'value="' +this.name+ '" id="bean-definition-propname-hidden"/></div>');
    if(this.isEmpty()) {
        form.append('<div class="row prop-entry" >' +
            '<input class="map-entry-key" size="10"/>=<input class="map-entry-value" size="10"/>' +
            '<button type="button" class="remove-map-entry btn btn-primary btn-xs">移除</button></div>');
    } else {
        for(var key in this.value) {
            form.append('<div class="row prop-entry" >' +
                '<input class="map-entry-key" size="10" value="' +key+ '"/>=' +
                '<input class="map-entry-value" size="10" value="' +this.value[key]+ '"/>' +
                '<button type="button" class="remove-map-entry btn btn-primary btn-xs">移除</button></div>');
        }
    }
    form.append('<div class="row prop-entry"><button class="btn btn-primary btn-xs" type="button" id="add-map-entry-button">添加</button>' +
        '<button type="button" id="back-to-prev-bean-definition-button" class="btn btn-primary btn-xs" ' +
        'lang="' +beanDefinitionId+ '">返回</button></div>');
};