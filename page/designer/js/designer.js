/**
 * Created by zj on 14-10-15.
 */

var contextPath = "/service-designer";
var serviceDefinitionClass = "com.kingyea.camel.runtime.ServiceDefination";
var startComponentClass = "com.kingyea.camel.runtime.component.StartComponent";
var nodeCode = "intranet-switchin";

var refMappingUrl = contextPath + "/data/RefMapping.json";
var resourceMappingUrl = contextPath + "/data/ResourceMapping.json";
var componentRegistryUrl = contextPath + "/data/ComponentRegistry.json";

var manualConfigRefPropValue = "__ref-prop-from-manual-config__";
var resourceRefPropValue = "__ref-prop-from-resource__";
var resourcePropPrefix = "resource-";
var serviceDefinitionId = "serviceDefinition";

function ComponentDefinitionLoader() {
    this.loadSuccess = null;
    this.componentRegistry = null;
    this.refMapping = null;
    this.resourceMapping = null;
    this.componentDefinitions = [];
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
    $.getJSON(refMappingUrl, function(data){
        loader.refMapping = data;
        loader.loadComponentDefinitions();
    });
    $.getJSON(resourceMappingUrl, function(data){
        loader.resourceMapping = data;
    });
};

/** 加载所有组件定义 **/
ComponentDefinitionLoader.prototype.loadComponentDefinitions = function (){
    var loader = this;
    $.getJSON(componentRegistryUrl, function(data){
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
    $.getJSON(contextPath + _url, function(data) {
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
            var clonedComponentDefinition = _clone ? $.extend(true, {}, componentDefinition) : componentDefinition;
            clonedComponentDefinition.assignPropertyBelongTo();
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
$(function(){
    var loader = ComponentDefinitionLoader.getInstance();
    loader.loadSuccess = function() {
        initCanvas();
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
    $('#edit-service-definition-button').trigger('click');
}

function addNode(_x, _y, _componentDefinition) {
    console.info(_componentDefinition);
    var inputs = _componentDefinition.getInputLabel();
    var outputs = _componentDefinition.getOutputLabel();
    var name = getSimpleClassName(_componentDefinition.class);
    if(inputs) {
        inputs = inputs.split(',');
    } else {
        inputs = [];
    }
    if(outputs) {
        outputs = outputs.split(',');
    } else {
        outputs = [];
    }
    var node = new ComponentNode(name, name);
    _componentDefinition.x = _x;
    _componentDefinition.y = _y;
    node.data = _componentDefinition;

    for(var i in inputs) {
        var input = inputs[i];
        var multi = input.substring(0, 1) == '*';
        if(multi) input = input.substring(1);

        node.addPoint(input, 'in', multi);
    }
    for(var i in outputs)
        if(outputs[i] != '')
            node.addPoint(outputs[i], 'out');

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
    $(ulId).append('<li class="list-group-item" lang="' +_componentDefinition.class+ '">' +
        '<span class="badge" title="添加组件">&gt;&gt;</span>' +className+ '</li>')
}


function handleEvents() {
    //单击引用属性配置按钮
    $('button.ref-config').live('click', function() {
        var select = $($(this).prev('select').get(0));
        var propName = select.attr('name');
        var type = select.val();
        var compId = $('#comp-definition-id-hidden').val();
        var refPropertyDefinition = getPropertyDefinitionByForm(propName);
        refPropertyDefinition.selectedBeanDefinitionType = type;//更新引用属性所选择的BeanDefinition类型
        var selectedBeanDefinition = refPropertyDefinition.getSelectedBeanDefinition();

        var beanDefinition = selectedBeanDefinition.definition;//当前选择的BeanDefinition
        beanDefinition.refreshPropertiesConfigForm(compId, refPropertyDefinition.belongToId);
    });

    //引用属性类型改变
    $('select.ref-bean-definition-select').live('change', function(){
        var propName = $(this).attr('name');
        var refPropertyDefinition = getPropertyDefinitionByForm(propName);
        var value = this.value;
        if(value) {//
            $(this).next('button').attr('disabled', '');//启用配置按钮
            if(value==resourceRefPropValue) {//选择从资源中选择，将资源选择界面调出
                refPropertyDefinition.valueMode = RefPropertyDefinition.VALUE_MODE_RESOURCE;
                var resourceSpan = $(this).parent().prev('span');
                resourceSpan.show();
                resourceSpan.find('select.ref-prop-resource').val(refPropertyDefinition.selectedResource);
                $(this).parent().hide();
            } else {//手动配置
                if(refPropertyDefinition.isRef()) {//如果是引用属性
                    refPropertyDefinition.valueMode = RefPropertyDefinition.VALUE_MODE_CONFIG;
                    refPropertyDefinition.selectedBeanDefinitionType = this.value;
                }
            }
        } else {//选择了不使用该属性
            $(this).next('button').attr('disabled', 'disabled');//禁用配置按钮
        }


    });

    //反回上一层按钮被点击
    $('#back-to-prev-bean-definition-button').live('click', function() {
        var prevBeanDefinitionId = $(this).attr('lang');
        var preBeanDefinition = getBeanDefinitionByForm(prevBeanDefinitionId);
        //因为下一层BeanDefinition的ID包含了上一层BeanDefinition的ID值，由"-"进行连接
        var lastIndex = preBeanDefinition.id.lastIndexOf("-");
        var belongToId = preBeanDefinition.id.substring(0, lastIndex);
        var compId = $('#comp-definition-id-hidden').val();
        preBeanDefinition.refreshPropertiesConfigForm(compId, belongToId);
    });

    //当普通属性值被修改时
    $('#comp-props-display-form').find("input.bean-prop[type='text'],select.normal-prop").live('change', function(){
        var propName = $(this).attr('name');
        var compId = $('#comp-definition-id-hidden').val();
        //检查是否是ServiceDefination
        if(compId.indexOf(serviceDefinitionId)!=-1) {
            var serviceDefinition = serviceEditor.serviceDefinitionData;
            var propertyDefinition = serviceDefinition.getPropertyDefinition(propName);
            propertyDefinition.value = this.value;
            return;
        }
        var propertyDefinition = getPropertyDefinitionByForm(propName);
        propertyDefinition.value = this.value;
    });

    //点击编辑服务定义按钮
    $('#edit-service-definition-button').click(function() {
        var serviceDefinition = serviceEditor.serviceDefinitionData;
        serviceDefinition.refreshPropertiesConfigForm(serviceDefinition.id);
    });

    //点击输出服务定义按钮
    $('#output-service-definition-button').click(function(){
        var serviceDefinition = serviceEditor.serviceDefinitionData.toServiceDefinition();
        delete serviceDefinition.class;
        delete serviceDefinition.id;
        serviceDefinition.startComponent = serviceEditor.getNodeByClass(startComponentClass).data.toServiceDefinition();
        serviceDefinition.nodeCode = nodeCode;
        console.info(serviceDefinition);
        console.info(JSON.stringify(serviceDefinition));
    });

    $('#upload-service-definition-button').click(function() {
        var url = "http://127.0.0.1:8080/console/service_definition/parse.do?definition=你妹";
        $.post(url, null, function(_data){
            console.info(_data);
        }, 'json');

    });


    //---------------------------------ArrayOrList属性相关事件--------------------------------
    //点击配置数组或列表元素按钮
    $('button.arrayorlist-config').live('click', function() {
        var input = $($(this).prev('input').get(0));
        var propName = input.attr('name');
        var propertyDefinition = getPropertyDefinitionByForm(propName);
        propertyDefinition.refreshPropertiesConfigForm();
    });

    //添加数组或列表元素
    $('#add-array-or-list-element-button').live('click', function(){
        $(this).parent().before('<div class="row prop-entry"><input class="array-or-list-element"/>' +
            '<button type="button" class="remove-array-or-list-element btn btn-primary btn-xs">移除</button></div>')
    });

    //移除数组或列表的一个元素
    $('button.remove-array-or-list-element').live('click', function(){
        var propName = $('#bean-definition-propname-hidden').val();
        var propertyDefinition = getPropertyDefinitionByForm(propName);
        var value = $(this).prev(':text').val();
        propertyDefinition.remove(value);
        $(this).parent().remove();
    });

    //数组或列表的一个元素值发生改变时
    $(':text.array-or-list-element').live('change', function() {
        var propName = $('#bean-definition-propname-hidden').val();
        var propertyDefinition = getPropertyDefinitionByForm(propName);
        propertyDefinition.clear();
        $('#comp-props-display-form').find(':text.array-or-list-element').each(function(){
            var currentValue = $(this).val();
            if(currentValue) {//空字符串也为false
                propertyDefinition.add(currentValue);
            }
        });
    });


    //---------------------------------Map属性相关事件--------------------------------
    //点击配置Map元素按钮
    $('button.map-config').live('click', function() {
        var input = $($(this).prev('input').get(0));
        var propName = input.attr('name');
        var propertyDefinition = getPropertyDefinitionByForm(propName);
        propertyDefinition.refreshPropertiesConfigForm();
    });

    //添加Map属性条目元素
    $('#add-map-entry-button').live('click', function() {
        $(this).parent().before('<div class="row prop-entry" >' +
            '<input class="map-entry-key" size="10"/>=<input class="map-entry-value" size="10"/>' +
            '<button type="button" class="remove-map-entry btn btn-primary btn-xs">移除</button></div>')
    });

    //移除Map属性的一个条目
    $('button.remove-map-entry').live('click', function(){
        var propName = $('#bean-definition-propname-hidden').val();
        var propertyDefinition = getPropertyDefinitionByForm(propName);
        var key = $(this).prevAll(':text.map-entry-key').val();
        propertyDefinition.remove(key);
        $(this).parent().remove();
        console.info(propertyDefinition);
    });

    //Map属性条目发生改变时
    $(':text.map-entry-key,:text.map-entry-value').live('change', function() {
        var propName = $('#bean-definition-propname-hidden').val();
        var propertyDefinition = getPropertyDefinitionByForm(propName);
        propertyDefinition.clear();
        $('#comp-props-display-form').find(':text.map-entry-key').each(function(){
            var currentKey = $(this).val();
            if(currentKey) {//空字符串也为false
                var currentValue = $(this).next(':text.map-entry-value').val();
                propertyDefinition.add(currentKey, currentValue);
            }
        });
    });

    //当选择资源值改变时
    $('select.ref-prop-resource').live('change', function(){
        var propName = $(this).attr('name');
        var refPropertyDefinition = getPropertyDefinitionByForm(propName);
        var value = this.value;
        if(value==manualConfigRefPropValue) {//选择了手动配置，将手动配置界面调出
            refPropertyDefinition.valueMode = RefPropertyDefinition.VALUE_MODE_CONFIG;
            var configSpan = $(this).parent().next('span');
            configSpan.show();
            configSpan.find('select.ref-bean-definition-select').val(refPropertyDefinition.selectedBeanDefinitionType);
            $(this).parent().hide();
        } else {
            refPropertyDefinition.valueMode = RefPropertyDefinition.VALUE_MODE_RESOURCE;
            refPropertyDefinition.selectedResource = value;
        }
    });


    //处理添加组件
    $('span.badge').live('click', function(){
        var className = $(this).parent().attr('lang');
        var loader = ComponentDefinitionLoader.getInstance();
        addNode(5, 10, loader.getComponentDefinitionByClassName(className, true));
    });

    //处理移除组件
    $('#remove-component-definition-button').click(function(){
        serviceEditor.removeSelectedComponentNode();
    });

    //只有一个字段时，按下回车表单会自动提交
    $('input').live('keydown', function(_event){
        if(_event.keyCode==13) {
            return false;
        }
    });
}




//---------------------------------------------------工具函数------------------------------------------------
function getSimpleClassName(_class) {
    var lastIndex = _class.lastIndexOf(".");
    return _class.substr(lastIndex+1);
}

function getRefPropertyDefinitionByForm(_propName) {
    var beanDefinitionId = $('#bean-definition-id-hidden').val();
    var compId = $('#comp-definition-id-hidden').val();
    var node = serviceEditor.getNodeById(compId);
    return node.data.getRefPropertyDefinition(beanDefinitionId, _propName);
}

//根据Form表单中的信息，查找属性名称为_propName的属性定义
function getPropertyDefinitionByForm(_propName) {
    var beanDefinitionId = $('#bean-definition-id-hidden').val();
    var compId = $('#comp-definition-id-hidden').val();
    var node = serviceEditor.getNodeById(compId);
    var beanDefinition = node.data.searchById(beanDefinitionId);
    return beanDefinition.getPropertyDefinition(_propName);
}

//根据Form表单中的信息，查找名称为_beanDefinitionId的Bean定义
function getBeanDefinitionByForm(_beanDefinitionId) {
    var compId = $('#comp-definition-id-hidden').val();
    var node = serviceEditor.getNodeById(compId);
    return node.data.searchById(_beanDefinitionId);
}



