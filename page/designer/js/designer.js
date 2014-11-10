/**
 * Created by zj on 14-10-15.
 */

var contextPath = "/service-designer";
var serviceDefinitionClass = "com.kingyea.camel.runtime.ServiceDefination";
var startComponentClass = "com.kingyea.camel.runtime.component.StartComponent";
var nodeCode = "intranet-switchin";

var resourceMappingUrl = contextPath + "/data/ResourceMapping.json";
var componentRegistryUrl = contextPath + "/data/ComponentRegistry.json";
var refRegistryUrl = contextPath + "/data/RefRegistry.json";
var fragmentRegistryUrl = contextPath + "/data/FragmentRegistry.json";

var manualConfigRefPropValue = "__ref-prop-from-manual-config__";
var resourceRefPropValue = "__ref-prop-from-resource__";
var resourcePropPrefix = "resource-";
var serviceDefinitionId = "serviceDefinition";
var refPropertySeparator = "-";
var transitionIdSeparator = "_to_";
var expressionLanguages = ["ognl", "javascript", "el", "xpath"];
var transitionClass = "com.kingyea.camel.runtime.Transition";
var expressionTransitionClass = "com.kingyea.camel.runtime.ExpressionTransition";

var refConfigButtonCssClass = "ref-config";

var propCssClasses = {
    ref : "ref-prop",
    normal : "normal-prop",
    arrayOrList : "array-or-list-prop",
    map : "map-prop"
};

function ComponentDefinitionLoader() {
    this.loadSuccess = null;
    this.loadRefSuccess = null;
    this.componentRegistry = null;
    this.refMapping = null;
    this.resourceMapping = null;
    this.componentDefinitions = [];
    this.fragmentRegistry = {};
}

ComponentDefinitionLoader.instance = null;
ComponentDefinitionLoader.getInstance = function() {
    if(ComponentDefinitionLoader.instance==null) {
        ComponentDefinitionLoader.instance = new ComponentDefinitionLoader();
    }
    return ComponentDefinitionLoader.instance;
};

ComponentDefinitionLoader.prototype.load = function() {
    var loader = this;
    loader.refMapping = {};
    jQuery.getJSON(refRegistryUrl, function(_registry){
        var count = 0;
        for(var i in _registry) {
            var refUrl = _registry[i];
            jQuery.getJSON(contextPath + refUrl, function(_data){
                jQuery.extend(loader.refMapping, _data);
                count++;
                if(count==_registry.length) {//引用属性加载完毕
                    loader.loadRefSuccess.call(loader);
                }
            });
        }
    });
    jQuery.getJSON(resourceMappingUrl, function(_data){
        loader.resourceMapping = _data;
    });
    //加载代码片段注册表
    jQuery.getJSON(fragmentRegistryUrl, function(_data) {
        if(_data) {
            loader.fragmentRegistry = _data;
        }
    });
};

/** 加载所有组件定义 **/
ComponentDefinitionLoader.prototype.loadComponentDefinitions = function (){
    var loader = this;
    jQuery.getJSON(componentRegistryUrl, function(data){
        loader.componentRegistry = data;
        for(var i in loader.componentRegistry) {
            var entry = loader.componentRegistry[i];
            loader.loadComponentDefinition(entry.url);
        }
    });
};

/** 加载组件定义 **/
ComponentDefinitionLoader.prototype.loadComponentDefinition = function(_url) {
    var loader = this;
    jQuery.getJSON(contextPath + _url, function(data) {
        var builder = new BeanDefinitionBuilder(data, true);
        var componentDefinition = builder.build();
        //console.info(componentDefinition);
        loader.componentDefinitions.push(componentDefinition);
        //如果组件定义与注册表中的数量相等，说明所有组件定义加载完毕
        if(loader.componentDefinitions.length==loader.componentRegistry.length) {
            if(loader.loadSuccess) {
                loader.loadSuccess.call(loader);
            }
        }
    });
};

ComponentDefinitionLoader.prototype.getRefBeanDefinitionDatasByClassName = function(_class) {
    return this.refMapping[_class];
};

ComponentDefinitionLoader.prototype.getComponentDefinitionByClassName = function(_class, _clone) {
    for(var i in this.componentDefinitions) {
        var componentDefinition = this.componentDefinitions[i];
        if(componentDefinition.class==_class) {
            var clonedComponentDefinition = _clone ? jQuery.extend(true, {}, componentDefinition) : componentDefinition;
            return clonedComponentDefinition;
        }
    }
    return null;
};

ComponentDefinitionLoader.prototype.getResourcesByClassName = function(_class) {
    for(var key in this.resourceMapping) {
        if(key===_class) {
            var resources = this.resourceMapping[key];
            return resources.length==0 ? null : resources;
        }
    }
    return null;
};


//-----------------------------------------------------------------------------------------
jQuery(function(){
    var loader = ComponentDefinitionLoader.getInstance();
    loader.loadSuccess = function() {
        initCanvas();
    };
    loader.loadRefSuccess = function() {
        loader.loadComponentDefinitions();
    };
    loader.load();

    handleEvents();
});


var serviceEditor;

var audioTheme = {
    lineStrokeWidth: 5
};

function initCanvas() {
    var loader = ComponentDefinitionLoader.getInstance();
    listComponents(loader.componentDefinitions);

    serviceEditor = new ServiceEditor('audio-graph', 1000, 480, audioTheme);
    var start = new ComponentDefinition(startComponentClass);
    start.type = ComponentDefinition.TYPE_START;
    addNode(5, 200, start);

    //触发编辑服务定义按钮点击事件，显示其属性配置表单
    jQuery('#edit-service-definition-button').trigger('click');
}

function addNode(_x, _y, _componentDefinition) {
    var inputLabel = _componentDefinition.getInputLabel();
    var outputLabel = _componentDefinition.getOutputLabel();
    var name = getSimpleClassName(_componentDefinition.class);

    var node = new ComponentNode(name, name);
    _componentDefinition.x = _x;
    _componentDefinition.y = _y;
    node.data = _componentDefinition;

    if(inputLabel) {//如果长度为0则不添加输入点
        //node.addPoint(inputLabel, 'in');
        node.setInputPoint(inputLabel);
    }
    if(outputLabel) {//如果长度为0则不添加输出点
        //node.addPoint(outputLabel, 'out');
        node.setOutputPoint(outputLabel);
    }
    serviceEditor.addNode(_x, _y, node);
}

function listComponents(_componentDefinitions) {
    _componentDefinitions = _componentDefinitions.sort(function(_definition1, _definition2){
        var class1 = getSimpleClassName(_definition1.class);
        var class2 = getSimpleClassName(_definition2.class);
        return class1.localeCompare(class2);
    });
    for(var i in _componentDefinitions) {
        listComponent(_componentDefinitions[i]);
    }
}

function listComponent(_componentDefinition) {
    //<li class="list-group-item"><span class="badge">新</span>FilePollingComponent</li>
    var className = getSimpleClassName(_componentDefinition.class);
    var ulId = "#" + _componentDefinition.getUlId();
    jQuery(ulId).append('<li class="list-group-item" lang="' +_componentDefinition.class+ '">' +
        '<span class="badge" title="添加组件">&gt;&gt;</span>' +className+ '</li>')
}


function handleEvents() {

    //单击引用属性配置按钮
    jQuery('button.ref-config').live('click', function() {
        var form = jQuery(jQuery(this).parents('form').get(0));
        var compId = form.find(':hidden.comp-definition-id-hidden').val();
        var select = jQuery(this).parent().parent().find('select');
        var propName = select.attr('name');
        var type = select.val();
        var refPropertyDefinition = getPropertyDefinitionByForm(form, propName);
        refPropertyDefinition.selectedBeanDefinitionType = type;//更新引用属性所选择的BeanDefinition类型
        var selectedBeanDefinition = refPropertyDefinition.getSelectedBeanDefinition();
        var beanDefinition = selectedBeanDefinition.definition;//当前选择的BeanDefinition

        jQuery('#ref-modal').find('div.props-config-form').attr('lang', beanDefinition.id);
        beanDefinition.refreshPropertiesConfigForm(compId);
        $('#ref-modal').modal({
            keyboard: true
        });
    });

    //引用属性类型改变
    jQuery('select.ref-bean-definition-select').live('change', function(){
        var propName = jQuery(this).attr('name');
        var refPropertyDefinition = getPropertyDefinitionByForm(propName);
        var value = this.value;
        if(value) {//
            jQuery(this).next('button').attr('disabled', '');//启用配置按钮
            if(value==resourceRefPropValue) {//选择从资源中选择，将资源选择界面调出
                refPropertyDefinition.valueMode = RefPropertyDefinition.VALUE_MODE_RESOURCE;
                var resourceSpan = jQuery(this).parent().prev('span');
                resourceSpan.show();
                resourceSpan.find('select.ref-prop-resource').val(refPropertyDefinition.selectedResource);
                jQuery(this).parent().hide();
            } else {//手动配置
                if(refPropertyDefinition.isRef()) {//如果是引用属性
                    refPropertyDefinition.valueMode = RefPropertyDefinition.VALUE_MODE_CONFIG;
                    refPropertyDefinition.selectedBeanDefinitionType = this.value;
                }
            }
        } else {//选择了不使用该属性
            jQuery(this).next('button').attr('disabled', 'disabled');//禁用配置按钮
        }


    });

    //反回上一层按钮被点击
    jQuery('button.back-to-prev-bean-definition').live('click', function() {
        var form = jQuery(this).parent().siblings('div.props-config-form').find('form');
        var compId = form.find(':hidden.comp-definition-id-hidden').val();
        var currentBeanDefinitionId = form.find(':hidden.bean-definition-id-hidden').val();
        var propName = form.find(':hidden.bean-definition-propname-hidden').val();
        var prevBeanDefinitionId = null;
        if(propName) {//如果有属性名称，说明正在配置的是数据或列表或Map属性
            prevBeanDefinitionId = currentBeanDefinitionId;
        } else {
            //因为下一层BeanDefinition的ID包含了上一层BeanDefinition的ID值，由"-"进行连接
            var lastIndex = currentBeanDefinitionId.lastIndexOf(refPropertySeparator);
            prevBeanDefinitionId = currentBeanDefinitionId.substring(0, lastIndex);
        }
        var preBeanDefinition = getBeanDefinitionByForm(compId, prevBeanDefinitionId);
        jQuery('#ref-modal').find('div.props-config-form').attr('lang', preBeanDefinition.id);
        preBeanDefinition.refreshPropertiesConfigForm(compId);
    });

    /**
     * 普通属性class:normal-prop
     * 数组或列表class:array-or-list-prop
     * Map class:map-prop
     * 引用属性class:ref-prop
     */
    //当普通属性值被修改时
    jQuery('div.props-config-form').find("input.normal-prop[type='text'],select.normal-prop").live('change', function(){
        var form = jQuery(jQuery(this).parents('form').get(0));
        var propName = jQuery(this).attr('name');
        var propertyDefinition = getPropertyDefinitionByForm(form, propName);
        propertyDefinition.value = this.value;
    });

    //属性被点击时，更新该属性提示，排除掉数组或列表与Map属性
    var propClickSelector = ':text:not(.array-or-list-element):not(.map-entry-key):not(.map-entry-value),select';
    jQuery('div.props-config-form').find(propClickSelector).live('click', function(){
        var form = jQuery(jQuery(this).parents('form').get(0));
        var propName = jQuery(this).attr('name');
        var propertyDefinition = getPropertyDefinitionByForm(form, propName);

        var value = "属性名称：" + propName + '\n';
        value += propertyDefinition.comment ? "备注：" + propertyDefinition.comment : "";
        var tipArea = $(this).parents('div.props-config-form').next('div').find('textarea.prop-tip');
        tipArea.val(value);
    });

    //点击编辑服务定义按钮
    jQuery('#edit-service-definition-button').click(function() {
        var serviceDefinition = serviceEditor.serviceDefinitionData;
        setCompPropsConfigFormDivBeanId(serviceDefinition.id);
        serviceDefinition.refreshPropertiesConfigForm(serviceDefinition.id);
    });

    //点击输出服务定义按钮
    jQuery('#output-service-definition-button').click(function(){
        var serviceDefinition = serviceEditor.serviceDefinitionData.toServiceDefinition();
        delete serviceDefinition.class;
        delete serviceDefinition.id;
        serviceDefinition.startComponent = serviceEditor.getNodesByClass(startComponentClass)[0].data.toServiceDefinition();
        serviceDefinition.nodeCode = nodeCode;
        console.info(serviceEditor.nodes);
        console.info(serviceDefinition);
        console.info(JSON.stringify(serviceDefinition));
    });

    jQuery('#upload-service-definition-button').click(function() {
        var url = "http://127.0.0.1:8080/console/service_definition/parse.do?definition=你妹";
        jQuery.post(url, null, function(_data){
            console.info(_data);
        }, 'json');

    });


    //---------------------------------ArrayOrList属性相关事件--------------------------------
    //点击配置数组或列表元素按钮
    jQuery('button.array-or-list-config').live('click', function() {
        var form = jQuery(jQuery(this).parents('form').get(0));
        var propName = jQuery(this).parent().parent().find(':text').attr('name');
        var propertyDefinition = getPropertyDefinitionByForm(form, propName);
        propertyDefinition.refreshPropertiesConfigForm();
    });

    //添加数组或列表元素
    jQuery('button.add-array-or-list-element').live('click', function(){
        var form = jQuery(this).parent().parent().find('form');
        var html = '<div class="form-group"><div class="col-sm-8">';
        html += '<input type="text" class="form-control array-or-list-element" value=""></div>';
        html += '<div class="col-sm-4">';
        html += '<button type="button" class="form-control btn btn-default btn-sm remove-array-or-list-element">移除</button>';
        html += '</div></div>';
        form.append(html);
    });

    //移除数组或列表的一个元素
    jQuery('button.remove-array-or-list-element').live('click', function(){
        var form = jQuery(this).parents('form');
        var propName = form.find(':hidden.bean-definition-propname-hidden').val();
        var propertyDefinition = getPropertyDefinitionByForm(form, propName);
        var value = jQuery(this).prev(':text').val();
        propertyDefinition.remove(value);
        jQuery(this).parent().parent().remove();
    });

    //数组或列表的一个元素值发生改变时
    jQuery(':text.array-or-list-element').live('change', function() {
        var form = jQuery(this).parents('form');
        var propName = form.find(':hidden.bean-definition-propname-hidden').val();
        var propertyDefinition = getPropertyDefinitionByForm(form, propName);
        propertyDefinition.clear();
        form.find(':text.array-or-list-element').each(function(){
            var currentValue = jQuery(this).val();
            if(currentValue) {//空字符串也为false
                propertyDefinition.add(currentValue);
            }
        });
    });


    //---------------------------------Map属性相关事件--------------------------------
    //点击配置Map元素按钮
    jQuery('button.map-config').live('click', function() {
        var form = jQuery(this).parents('form');
        var propName = jQuery(this).parent().parent().find(':text').attr('name');
        var propertyDefinition = getPropertyDefinitionByForm(form, propName);
        propertyDefinition.refreshPropertiesConfigForm();
    });

    //添加Map属性条目元素
    jQuery('button.add-map-entry').live('click', function() {
        var form = jQuery(this).parent().parent().find('form');
        var html = '<div class="form-group">';
        html += '<div class="col-sm-4"><input type="text" class="form-control map-entry-key"></div>';
        html += '<label class="col-sm-1 control-label">=</label>';
        html += '<div class="col-sm-4"><input type="text" class="form-control map-entry-value"></div>';

        html += '<div class="col-sm-3">';
        html += '<button type="button" class="form-control btn btn-default btn-sm remove-map-entry">移除</button>';
        html += '</div></div>';
        form.append(html);
    });

    //移除Map属性的一个条目
    jQuery('button.remove-map-entry').live('click', function() {
        var form = jQuery(this).parents('form');
        var propName = form.find(':hidden.bean-definition-propname-hidden').val();
        var propertyDefinition = getPropertyDefinitionByForm(form, propName);
        var key = jQuery(this).parent().parent().find(':text.map-entry-key').val();
        propertyDefinition.remove(key);
        jQuery(this).parent().parent().remove();
    });

    //Map属性条目发生改变时
    jQuery(':text.map-entry-key,:text.map-entry-value').live('change', function() {
        var form = jQuery(this).parents('form');
        var propName = form.find(':hidden.bean-definition-propname-hidden').val();
        var propertyDefinition = getPropertyDefinitionByForm(form, propName);
        propertyDefinition.clear();
        form.find(':text.map-entry-key').each(function(){
            var currentKey = jQuery(this).val();
            if(currentKey) {//空字符串也为false
                var currentValue = jQuery(this).parent().parent().find(':text.map-entry-value').val();
                propertyDefinition.add(currentKey, currentValue);
            }
        });
    });

    //引用属性选择发生改为时，包括手动配置与选择资源配置
    jQuery('select.ref-prop').live('change', function(){
        var form = jQuery(jQuery(this).parents('form').get(0));
        var propName = jQuery(this).attr('name');
        var refPropertyDefinition = getPropertyDefinitionByForm(form, propName);
        var value = this.value;
        if(value) {//如果不是不使用
            if(value==manualConfigRefPropValue) {//选择了手动配置，将手动配置界面调出
                refPropertyDefinition.valueMode = RefPropertyDefinition.VALUE_MODE_CONFIG;
                refPropertyDefinition.refreshHtml(jQuery(this));
            } else if(value==resourceRefPropValue) {
                refPropertyDefinition.valueMode = RefPropertyDefinition.VALUE_MODE_RESOURCE;
                refPropertyDefinition.refreshHtml(jQuery(this));
            } else {
                refPropertyDefinition.setValue(value);
                jQuery(this).parent().parent().find('button.'+refConfigButtonCssClass).attr('disabled', '');
            }
        } else {//选择不使用，禁用配置button
            if(refPropertyDefinition.valueMode===RefPropertyDefinition.VALUE_MODE_CONFIG) {
                jQuery(this).parent().parent().find('button.'+refConfigButtonCssClass).attr('disabled', 'disabled');
            }
        }


    });


    //处理添加组件
    jQuery('span.badge').live('click', function(){
        var className = jQuery(this).parent().attr('lang');
        var loader = ComponentDefinitionLoader.getInstance();
        addNode(5, 10, loader.getComponentDefinitionByClassName(className, true));
    });

    //处理移除组件
    jQuery('#remove-component-definition-button').click(function(){
        serviceEditor.removeSelectedComponentNode();
    });

    //只有一个字段时，按下回车表单会自动提交
    jQuery('input').live('keydown', function(_event){
        if(_event.keyCode==13) {
            return false;
        }
    });

    //当连线类型改变时
    jQuery('#transition-type-select').live('change', function() {
        //transitionId由相互连接的组件定义ID构成
        var transitionId = jQuery('#transition-id-hidden').val();
        var compIds = transitionId.split(transitionIdSeparator);
        var fromNode = serviceEditor.getNodeById(compIds[0]);
        var toNode = serviceEditor.getNodeById(compIds[1]);
        var transition = fromNode.getTransitionById(transitionId);
        var newTransition = null;
        if(this.value==Transition.TYPE_EXPRESSION) {
            //将普通连线更改为表达式连线
            newTransition = transition.toExpression("ognl", "");
        } else if(this.value==Transition.TYPE_NORMAL) {//将表达式连线更改为普通连线
            if(transition instanceof ExpressionTransition) {
                newTransition = transition.toNormal();
            }
        }
        if(newTransition==null) {//如果新的连线不存在则表达转换出错
            alert("新连线为空");
            return;
        }

        //连线所在点的所有连线
        newTransition.refreshPropertiesConfigForm();

        fromNode.data.addOutput(newTransition, true);
        toNode.data.addInput(newTransition, true);
    });

    //修改连线属性值时
    jQuery('.transition-prop').live('change', function(){
        var propName = jQuery(this).attr("name");
        //transitionId由相互连接的组件定义ID构成
        var transitionId = jQuery('#transition-id-hidden').val();
        var compIds = transitionId.split(transitionIdSeparator);
        var fromNode = serviceEditor.getNodeById(compIds[0]);
        var transition = fromNode.getTransitionById(transitionId);
        transition[propName] = this.value;
    });

    //加载服务定义按钮被点击
    jQuery('#load-service-definition-button').click(function(){
        var url = contextPath + '/data/service/SEND_FILE_SERVICE.json';
        jQuery.getJSON(url, function(_data){
            serviceEditor.reset();
            serviceEditor.restore(_data);
            //触发编辑服务定义按钮点击事件，显示其属性配置表单
            jQuery('#edit-service-definition-button').trigger('click');
        });
    });
}




//---------------------------------------------------工具函数------------------------------------------------
function getSimpleClassName(_class) {
    var lastIndex = _class.lastIndexOf(".");
    return _class.substr(lastIndex+1);
}

function getRefPropertyDefinitionByForm(_propName) {
    var beanDefinitionId = jQuery('#bean-definition-id-hidden').val();
    var compId = jQuery('#comp-definition-id-hidden').val();
    var node = serviceEditor.getNodeById(compId);
    return node.data.getRefPropertyDefinition(beanDefinitionId, _propName);
}

//根据Form表单中的信息，查找属性名称为_propName的属性定义
function getPropertyDefinitionByForm(_form, _propName) {
    var compId = _form.find(':hidden.comp-definition-id-hidden').val();
    if(compId.indexOf(serviceDefinitionId)!=-1) {//判断是否是服务定义
        var serviceDefinition = serviceEditor.serviceDefinitionData;
        return serviceDefinition.getPropertyDefinition(_propName);
    }
    var beanDefinitionId = _form.find(':hidden.bean-definition-id-hidden').val();
    var node = serviceEditor.getNodeById(compId);
    var beanDefinition = node.data.searchById(beanDefinitionId);
    return beanDefinition.getPropertyDefinition(_propName);
}

//根据Form表单中的信息，查找名称为_beanDefinitionId的Bean定义
function getBeanDefinitionByForm(_compId, _beanDefinitionId) {
    var node = serviceEditor.getNodeById(_compId);
    return node.data.searchById(_beanDefinitionId);
}

//获取属性配置div对象(jquery)
//_beanId为当前配置的Bean或组件ID，因为可能存在多个Bean处于配置中
function getPropsConfigDiv(_beanId) {
    var divs = jQuery('div.props-config-form');
    for(var i in divs) {
        if(jQuery(divs[i]).attr('lang')===_beanId) {//用lang属性值标识BeanId
            return jQuery(divs[i]);
        }
    }
    return null;
}

//获取属性配置form对象(jquery)
function getPropsConfigForm(_beanId) {
    var forms = getPropsConfigDiv(_beanId).find("form");
    if(forms.length===0) {
        alert("属性配置表单未找到");
        return null;
    }
    return jQuery(forms.get(0));
}

function getCompAndBeanIdHiddenHtml(_compId, _beanId) {
    var html = '<input type="hidden" class="comp-definition-id-hidden" value="' + _compId;
    html += '" />';
    html += '<input type="hidden" class="bean-definition-id-hidden" value="' + _beanId;//下在配置的Bean ID
    html += '" />';
    return html;
}

/**
 * 加载属性配置表单至DIV中
 * @param _beanId 当前配置的Bean或组件ID，因为可能存在多个Bean处于配置中
 * @param _url 表单URL
 * @param _callback 回调函数
 */
function loadPropsConfigForm(_beanId, _url, _callback) {
    var configDiv = getPropsConfigDiv(_beanId);
    configDiv.empty();
    configDiv.load(_url, function(){
        _callback();
        var beanDefinitionId = configDiv.find(':hidden.bean-definition-id-hidden').val();
        if(beanDefinitionId.split(refPropertySeparator).length>=3) {//超过三层添加返回按钮
            var footer = configDiv.parent().find('div.modal-footer');
            if(footer.find('button.back-to-prev-bean-definition').length==0) {//如果还没有返回按钮则添加，有了就不能重复添加
                var buttonHtml = '<button type="button" class="btn btn-default back-to-prev-bean-definition">返回</button>';
                footer.prepend(buttonHtml);
            }
        } else {
            //移除非最后一个按钮(关闭按钮)，因为前面的操作添加了返回按钮
            configDiv.parent().find('div.modal-footer').find('button:not(:last)').remove();
        }
        configDiv.parent().find('textarea.prop-tip').val("");
    });
}

/**
 * 获取组件属性配置片段URL
 * @param _class 组件或引用组件完整类型
 * @returns {*}
 */
function getComponentFragmentUrl(_class) {
    var loader = ComponentDefinitionLoader.getInstance();
    return loader.fragmentRegistry[_class];
}

/**
 * 设置div.props-config-form的lang属性值
 * @param _beanId
 */
function setCompPropsConfigFormDivBeanId(_beanId) {
    jQuery('#comp-form-panel').find('div.props-config-form').attr('lang', _beanId);
}

