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
    this.belongToId = "";
    //备注
    this.comment = "";
}
PropertyDefinition.input_type_text = 0;
PropertyDefinition.input_type_radio = 1;
PropertyDefinition.input_type_checkbox = 2;
PropertyDefinition.input_type_combo = 3;

/**
 * 获取值方法，针对boolean类型作一定的转换
 * @returns {*}
 */
PropertyDefinition.prototype.getValue = function() {
    if(this.type==="boolean") {
        if(this.value==="true") {
            return true;
        } else if(this.value==="false") {
            return false;
        }
    }
    return this.value;
};


/**
 * 判断是否是引用属性
 * @returns {boolean}
 */
PropertyDefinition.prototype.isRef = function() {
    return this.type.indexOf("ref-")!=-1;
};
/**
 * 判断是否是数据或列表属性
 * @returns {boolean}
 */
PropertyDefinition.prototype.isArrayOrList = function() {
    return this.type.indexOf("array-")!=-1 || this.type.indexOf("list-")!=-1;
};
/**
 * 判断是否是Map属性
 * @returns {boolean}
 */
PropertyDefinition.prototype.isMap = function() {
    return this.type.indexOf("map-")!=-1;
};

/**
 * 设置该属性所属的Bean定义的ID
 * @param _id Bean定义ID
 */
PropertyDefinition.prototype.setBelongToId = function(_id) {
    this.belongToId = _id;
};



/** 下拉列表属性定义 **/
function ComboPropertyDefinition(_name, _value, _type, _selectValues) {
    PropertyDefinition.call(this, _name, _value, _type);
    this.selectValues = _selectValues;
    this.inputType = PropertyDefinition.input_type_combo;
}

//继承自PropertyDefinition
ComboPropertyDefinition.prototype = new PropertyDefinition();


/** 引用属性定义 **/
function RefPropertyDefinition(_name, _value, _type) {
    PropertyDefinition.call(this, _name, _value, _type);
    this.beanDefinitions = [];//可使用的Bean定义
    this.selectedBeanDefinitionType = null; //当前选择的Bean定义类型
    this.resources = null;//可引用的资源
    this.selectedResource = null;//当前选择的资源
    this.valueMode = null;//值类型，选择资源或手动配置
}
//继承自PropertyDefinition
RefPropertyDefinition.prototype = new PropertyDefinition();
RefPropertyDefinition.VALUE_MODE_RESOURCE = "resource";
RefPropertyDefinition.VALUE_MODE_CONFIG = "config";


/**
 * 设置值方法，对当前值模式进行判断
 * @param _value
 */
RefPropertyDefinition.prototype.setValue = function(_value){
    this.value = _value;
    if(this.valueMode==RefPropertyDefinition.VALUE_MODE_CONFIG) {
        this.selectedBeanDefinitionType = _value;
    }
    if(this.valueMode==RefPropertyDefinition.VALUE_MODE_RESOURCE) {
        this.selectedResource = _value;
    }
};

/**
 * 获取引用属性声明的抽象类型
 * @returns {*}
 */
RefPropertyDefinition.prototype.getAbstractType = function(){
    return this.type.split("-")[1];
};

/**
 * 加载该引用属性引用的Bean定义
 */
RefPropertyDefinition.prototype.loadRefBeanDefinitions = function() {
    var className = this.getAbstractType();
    this.resources = ComponentDefinitionLoader.getInstance().getResourcesByClassName(className);
    if(this.resources) {//如果有资源则，选择资源优先
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
 * 更新该引用属性显示的HTML
 * @param _select select元素(jquery)
 */
RefPropertyDefinition.prototype.refreshHtml = function(_select) {
    _select.empty();
    _select.append(this.getOptionsHtml());
    _select.parent().next().remove();
    var html = "";
    html += '<div class="col-sm-3" style="padding: 0;line-height: 34px;padding-right: 15px;">';
    if(this.valueMode===RefPropertyDefinition.VALUE_MODE_RESOURCE) {
        html += '<span>资源选择</span>';
    } else {
        var disabledHtml = this.selectedBeanDefinitionType ? "" : 'disabled="disabled"';
        html += '<button type="button" class="form-control btn btn-default btn-sm '
            +refConfigButtonCssClass+ '" ' +disabledHtml+ '>配置</button>';
    }
    html += '</div>';
    _select.parent().parent().append(html);
};

/**
 * 获取该引用属性的显示option字符串，用于Jquery创建并显示
 * @returns {*}
 */
RefPropertyDefinition.prototype.getOptionsHtml = function() {
    var html = "";
    if(this.valueMode===RefPropertyDefinition.VALUE_MODE_RESOURCE) {//如果是选择资源模式
        html += this.getResourceOptions();
    } else {
        html += this.getConfigOptions();
    }
    return html;
};

/**
 * 获取资源选择Html字符串
 * @returns {string}
 */
RefPropertyDefinition.prototype.getResourceOptions = function() {
    var html = "";
    if(!this.selectedResource) {//如果还没有选择资源，说明是第一次出现
        if(this.required) {
            this.selectedResource = this.resources[0];
        } else {
            this.selectedResource = "";//选择不使用
        }
    } else {//从手动配置切换到选择资源模式
        this.selectedResource = this.resources[0];
    }
    if(!this.required) {
        html += '<option value="">不使用</option>';
    }
    var refProp = this;
    jQuery.each(this.resources, function(_index, _resource){
        if(refProp.selectedResource==_resource) {
            html += '<option selected="selected" value="' +_resource+ '">' +_resource+ '</option>';
        } else {
            html += '<option value="' +_resource+ '">' +_resource+ '</option>';
        }
    });
    html += '<option value="' +manualConfigRefPropValue+ '">手动配置</option>';
    return html;
};

/**
 * 获取手动配置时的Html字符串
 */
RefPropertyDefinition.prototype.getConfigOptions = function() {
    var html = "";
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

/**
 * 返回服务定义相关数据
 * @returns {*}
 */
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
//继承自PropertyDefinition
ArrayOrListPropertyDefinition.prototype = new PropertyDefinition();


/**
 * 清空数据
 */
ArrayOrListPropertyDefinition.prototype.clear = function() {
    this.value = [];
};

/**
 * 添加某值
 * @param _value
 */
ArrayOrListPropertyDefinition.prototype.add = function(_value) {
    this.value.push(_value);
};

/**
 * 移除某个值
 * @param _value
 */
ArrayOrListPropertyDefinition.prototype.remove = function(_value) {
    for(var i in this.value) {
        if(this.value[i]===_value) {
            this.value.splice(i, 1);
        }
    }
};

/**
 * 获取显示字符串
 * @returns {string}
 */
ArrayOrListPropertyDefinition.prototype.getDisplayString = function() {
    return this.value.join(',');
};

/**
 * 返回服务定义相关数据
 * @returns {Array}
 */
ArrayOrListPropertyDefinition.prototype.toServiceDefinition = function() {
    return this.value;
};

//当点击配置数据或列表属性时，更新属性配置表单
ArrayOrListPropertyDefinition.prototype.refreshPropertiesConfigForm = function() {
    var form = getPropsConfigForm(this.belongToId);
    var compId = form.find(':hidden.comp-definition-id-hidden').val();
    var beanId = form.find(':hidden.bean-definition-id-hidden').val();
    var compForm = false;
    if(form.parents('#comp-form-panel').length!==0) {//说明是在组件配置表单中，实际上应该弹框
        compForm = true;
        var formDiv = jQuery('#ref-modal').find('div.props-config-form');
        form = formDiv.find('form');
        if(form.length===0) {
            formDiv.append('<form class="form-horizontal" ></form>');
            form = formDiv.find('form');
        }
    }

    form.empty();

    for(var i in this.value) {
        var html = '<div class="form-group"><div class="col-sm-8">';
        html += '<input type="text" class="form-control array-or-list-element" value="' +this.value[i]+ '"></div>';
        html += '<div class="col-sm-4">';
        html += '<button type="button" class="form-control btn btn-default btn-sm remove-array-or-list-element">移除</button>';
        html += '</div></div>';
        form.append(html);
    }

    form.append(getCompAndBeanIdHiddenHtml(compId, beanId));
    var propNameHtml = '<input type="hidden" class="bean-definition-propname-hidden" value="' +this.name+ '"/>';
    form.append(propNameHtml);
    form.parent().next().hide();//隐藏属性提示框

    var footer = form.parent().parent().find('div.modal-footer');
    if(footer.find('button').length===1) {
        var buttonHtml = '<button type="button" class="btn btn-default add-array-or-list-element">添加</button>';
        if(!compForm) {
            buttonHtml += '<button type="button" class="btn btn-default back-to-prev-bean-definition">返回</button>';
        }
        footer.prepend(buttonHtml);
    }

    if(compForm) {
        $('#ref-modal').modal({
            keyboard: true
        });
    }
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
//继承自PropertyDefinition
MapPropertyDefinition.prototype = new PropertyDefinition();


/**
 * 获取显示字符串
 * @returns {string}
 */
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

/**
 * 返回服务定义相关数据
 * @returns {{}|*}
 */
MapPropertyDefinition.prototype.toServiceDefinition = function() {
    return this.value;
};

/**
 * 清空Map
 */
MapPropertyDefinition.prototype.clear = function() {
    this.value = {};
};

/**
 * 添加一个条目
 * @param _key
 * @param _value
 */
MapPropertyDefinition.prototype.add = function(_key, _value) {
    this.value[_key] = _value;
};

/**
 * 根据key移除一个条目
 * @param _key
 */
MapPropertyDefinition.prototype.remove = function(_key) {
    delete this.value[_key];
};

/**
 * 判断是否为空
 * @returns {boolean}
 */
MapPropertyDefinition.prototype.isEmpty = function() {
    for(var key in this.value) {
        return false;
    }
    return true;
};

//当点击配置Map属性时，更新属性配置表单
MapPropertyDefinition.prototype.refreshPropertiesConfigForm = function() {
    var form = getPropsConfigForm(this.belongToId);
    var compId = form.find(':hidden.comp-definition-id-hidden').val();
    var beanId = form.find(':hidden.bean-definition-id-hidden').val();
    var compForm = false;
    if(form.parents('#comp-form-panel').length!==0) {//说明是在组件配置表单中，实际上应该弹框
        compForm = true;
        var formDiv = jQuery('#ref-modal').find('div.props-config-form');
        form = formDiv.find('form');
        if(form.length===0) {
            formDiv.append('<form class="form-horizontal" ></form>');
            form = formDiv.find('form');
        }
    }
    form.empty();

    /**
     * <div class="form-group">
     *     <div class="col-sm-4">
     *         <input type="text" class="form-control map-entry-key" value=key/>
     *     </div><label class="col-sm-1 control-label">=</label>
     *     <div class="col-sm-4">
     *         <input type="text" class="form-control map-entry-value" value=value/>
     *     </div>
     *     <div class="col-sm-3">
     *         <button type="button" class="form-control btn btn-default btn-sm map-entry">移除</button>
     *     </div>
     *
     */
    for(var key in this.value) {
        var html = '<div class="form-group">';
        html += '<div class="col-sm-4"><input type="text" class="form-control map-entry-key" value="' +key+ '"></div>';
        html += '<label class="col-sm-1 control-label">=</label>';
        html += '<div class="col-sm-4"><input type="text" class="form-control map-entry-value" value="' +this.value[key]+ '"></div>';

        html += '<div class="col-sm-3">';
        html += '<button type="button" class="form-control btn btn-default btn-sm remove-map-entry">移除</button>';
        html += '</div></div>';
        form.append(html);
    }

    form.append(getCompAndBeanIdHiddenHtml(compId, beanId));
    var propNameHtml = '<input type="hidden" class="bean-definition-propname-hidden" value="' +this.name+ '"/>';
    form.append(propNameHtml);
    form.parent().next().hide();//隐藏属性提示框

    var footer = form.parent().parent().find('div.modal-footer');
    if(footer.find('button').length===1) {
        var buttonHtml = '<button type="button" class="btn btn-default add-map-entry">添加</button>';
        if(!compForm) {
            buttonHtml += '<button type="button" class="btn btn-default back-to-prev-bean-definition">返回</button>';
        }
        footer.prepend(buttonHtml);
    }
    if(compForm) {
        $('#ref-modal').modal({
            keyboard: true
        });
    }
};