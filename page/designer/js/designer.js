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
    //console.info(loader.componentDefinitions);

    serviceEditor = new ServiceEditor('audio-graph', 1000, 480, audioTheme);

    function addNode(x, y, name, inputs, outputs, componentDefinition) {
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
        componentDefinition.x = x;
        componentDefinition.y = y;
        node.data = componentDefinition;

        for(var i in inputs) {
            var input = inputs[i];
            var multi = input.substring(0, 1) == '*';
            if(multi) input = input.substring(1);

            node.addPoint(input, 'in', multi);
        }
        for(var i in outputs)
            if(outputs[i] != '')
                node.addPoint(outputs[i], 'out');

        serviceEditor.addNode(x, y, node);
    }
    var className = "com.kingyea.esb.components.file.jnotify.FileNotifyComponent";
    addNode(10, 10, 'FileNotifyComponent', 'input', 'output', loader.getComponentDefinitionByClassName(className, true));
    className = "com.kingyea.esb.components.file.FileTargetComponent";
    addNode(250, 75, 'FileTargetComponent', 'input', '', loader.getComponentDefinitionByClassName(className, true));
    //className = "com.kingyea.esb.components.file.FileTargetComponent";
    //addNode(450, 75, 'FileTargetComponent', 'input', '', loader.getComponentDefinitionByClassName(className, true));

    className = "com.kingyea.esb.components.gateway.MulticastComponent";
    addNode(450, 235, 'MulticastComponent', '*input', 'output', loader.getComponentDefinitionByClassName(className, true));


    var start = new ComponentDefinition(startComponentClass);
    addNode(5, 200, 'StartComponent', '', 'output', start);

    //触发编辑服务定义按钮点击事件，显示其属性配置表单
    $('#edit-service-definition-button').trigger('click');
}


function handleEvents() {
    //单击引用属性配置按钮
    $('button.ref-config').live('click', function() {
        //console.info(serviceEditor);
        /*var beanDefinitionId = $(this).attr('lang');
        var select = $($(this).prev('select').get(0));
        var propName = select.attr('name');
        var type = select.val();
        var className = $('#comp-definition-class-hidden').val();
        //console.info(propName + "," + type + "," + className + "," + beanDefinitionId);

        var node = serviceEditor.getNodeByClass(className);

        if(node) {
            var componentDefinition = node.data;
            console.info(componentDefinition);
            //console.info("beanDefinitionId=" + beanDefinitionId + ",propName=" + propName);
            var refPropertyDefinition = componentDefinition.getRefPropertyDefinition(beanDefinitionId, propName);
            refPropertyDefinition.selectedBeanDefinitionType = type;//更新引用属性所选择的BeanDefinition类型
            var selectedBeanDefinition = refPropertyDefinition.getSelectedBeanDefinition();

            var beanDefinition = selectedBeanDefinition.definition;//当前选择的BeanDefinition
            //console.info(beanDefinition);
            beanDefinition.refreshPropertiesConfigForm(className, refPropertyDefinition.belongToId);
        } else {
            alert('类名为:' + className + "节点未找到");
        }*/


        var select = $($(this).prev('select').get(0));
        var propName = select.attr('name');
        var type = select.val();
        var className = $('#comp-definition-class-hidden').val();
        var refPropertyDefinition = getRefPropertyDefinitionByForm(propName);
        refPropertyDefinition.selectedBeanDefinitionType = type;//更新引用属性所选择的BeanDefinition类型
        var selectedBeanDefinition = refPropertyDefinition.getSelectedBeanDefinition();

        var beanDefinition = selectedBeanDefinition.definition;//当前选择的BeanDefinition
        beanDefinition.refreshPropertiesConfigForm(className, refPropertyDefinition.belongToId);
    });

    //引用属性类型改变
    $('select.ref-bean-definition-select').live('change', function(){
        var propName = $(this).attr('name');
        var refPropertyDefinition = getRefPropertyDefinitionByForm(propName);
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
        var className = $('#comp-definition-class-hidden').val();
        var node = serviceEditor.getNodeByClass(className);
        if(node) {
            //preBeanDefinition为feedbackStrategy引用中的一个可选BeanDefinition
            var preBeanDefinition = node.data.searchById(prevBeanDefinitionId);

            //因为下一层BeanDefinition的ID包含了上一层BeanDefinition的ID值，由"-"进行连接
            var lastIndex = preBeanDefinition.id.lastIndexOf("-");
            var belongToId = preBeanDefinition.id.substring(0, lastIndex);
            preBeanDefinition.refreshPropertiesConfigForm(className, belongToId);
        } else {
            alert('类名为:' + className + "节点未找到");
        }
    });

    //当普通属性值被修改时
    $('#comp-props-display-form').find("input.bean-prop[type='text'],select.normal-prop").live('change', function(){
        /*var currentBeanDefinitionId = $('#bean-definition-id-hidden').val();
        var className = $('#comp-definition-class-hidden').val();
        var node = serviceEditor.getNodeByClass(className);
        var propName = $(this).attr('name');
        if(node) {
            var beanDefinition = node.data.searchById(currentBeanDefinitionId);
            var propertyDefinition = beanDefinition.getPropertyDefinition(propName);
            propertyDefinition.value = this.value;
        } else {
            //检查是否是ServiceDefination
            if(className==serviceDefinitionClass) {
                beanDefinition = serviceEditor.serviceDefinitionData;
                propertyDefinition = beanDefinition.getPropertyDefinition(propName);
                propertyDefinition.value = this.value;
            } else {
                alert('类名为:' + className + "节点未找到");
            }
        }*/
        var propName = $(this).attr('name');
        var className = $('#comp-definition-class-hidden').val();
        //检查是否是ServiceDefination
        if(className==serviceDefinitionClass) {
            beanDefinition = serviceEditor.serviceDefinitionData;
            propertyDefinition = beanDefinition.getPropertyDefinition(propName);
            propertyDefinition.value = this.value;
            return;
        }
        var currentBeanDefinitionId = $('#bean-definition-id-hidden').val();
        var node = serviceEditor.getNodeByClass(className);
        var beanDefinition = node.data.searchById(currentBeanDefinitionId);
        var propertyDefinition = beanDefinition.getPropertyDefinition(propName);
        propertyDefinition.value = this.value;


    });

    //点击编辑服务定义按钮
    $('#edit-service-definition-button').click(function() {
        var serviceDefinition = serviceEditor.serviceDefinitionData;
        serviceDefinition.refreshPropertiesConfigForm(serviceDefinition.class);
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
        var beanDefinitionId = $(this).attr('lang');
        var input = $($(this).prev('input').get(0));
        var propName = input.attr('name');
        var value = input.val();
        var className = $('#comp-definition-class-hidden').val();
        //console.info(propName + "," + value + "," + className + "," + beanDefinitionId);

        var node = serviceEditor.getNodeByClass(className);
        if(node) {
            var componentDefinition = node.data;
            var propertyDefinition = componentDefinition.getArrayOrListPropertyDefinition(beanDefinitionId, propName);

            var form = $('#comp-props-display-form');
            form.empty();
            form.append('<div class="row prop-entry" >' +
                '<input type="hidden" name="compDefinitionClass" value="' +className+ '" id="comp-definition-class-hidden"/></div>');
            form.append('<div class="row prop-entry" >' +
                '<input type="hidden" name="beanDefinitionId" value="' +beanDefinitionId+ '" id="bean-definition-id-hidden"/></div>');
            form.append('<div class="row prop-entry" >' +
                '<input type="hidden" name="beanDefinitionPropName" value="' +propName+ '" id="bean-definition-propname-hidden"/></div>');
            if(propertyDefinition.value.length==0) {
                form.append('<div class="row prop-entry" >' +
                    '<input class="array-or-list-element"/><button type="button" class="remove-array-or-list-element">移除</button></div>');
            } else {
                for(var i in propertyDefinition.value) {
                    var element = propertyDefinition.value[i];
                    form.append('<div class="row prop-entry" >' +
                        '<input class="array-or-list-element"  value="' +element+ '"/>' +
                        '<button type="button" class="remove-array-or-list-element">移除</button></div>');
                }
            }
            form.append('<div class="row prop-entry"><button type="button" id="add-array-or-list-element-button">添加</button>' +
                '<button type="button" id="back-to-prev-bean-definition-button" lang="' +beanDefinitionId+ '">返回</button></div>');
        } else {
            alert('类名为:' + className + "节点未找到");
        }

    });

    //添加数组或列表元素
    $('#add-array-or-list-element-button').live('click', function(){
        $(this).parent().before('<div class="row prop-entry"><input class="array-or-list-element"/>' +
            '<button type="button" class="remove-array-or-list-element">移除</button></div>')
    });

    //移除数组或列表的一个元素
    $('button.remove-array-or-list-element').live('click', function(){
        var beanDefinitionId = $('#bean-definition-id-hidden').val();
        var propName = $('#bean-definition-propname-hidden').val();
        var className = $('#comp-definition-class-hidden').val();

        var node = serviceEditor.getNodeByClass(className);
        if(node) {
            var componentDefinition = node.data;
            var propertyDefinition = componentDefinition.getArrayOrListPropertyDefinition(beanDefinitionId, propName);
            var value = $(this).prev(':text').val();
            propertyDefinition.remove(value);
        } else {
            alert('类名为:' + className + "节点未找到");
        }

        $(this).parent().remove();

    });

    //数组或列表的一个元素值发生改变时
    $(':text.array-or-list-element').live('change', function() {
        var beanDefinitionId = $('#bean-definition-id-hidden').val();
        var propName = $('#bean-definition-propname-hidden').val();
        var className = $('#comp-definition-class-hidden').val();

        var node = serviceEditor.getNodeByClass(className);
        if(node) {
            var componentDefinition = node.data;
            var propertyDefinition = componentDefinition.getArrayOrListPropertyDefinition(beanDefinitionId, propName);
            console.info(propertyDefinition);
            propertyDefinition.clear();
            $('#comp-props-display-form').find(':text.array-or-list-element').each(function(){
                var currentValue = $(this).val();
                if(currentValue) {//空字符串也为false
                    propertyDefinition.add(currentValue);
                }
            });
        } else {
            alert('类名为:' + className + "节点未找到");
        }
    });


    //---------------------------------Map属性相关事件--------------------------------
    //点击配置Map元素按钮
    $('button.map-config').live('click', function() {
        var beanDefinitionId = $(this).attr('lang');
        var input = $($(this).prev('input').get(0));
        var propName = input.attr('name');
        var value = input.val();
        var className = $('#comp-definition-class-hidden').val();
        //console.info(propName + "," + value + "," + className + "," + beanDefinitionId);

        var node = serviceEditor.getNodeByClass(className);
        if(node) {
            var componentDefinition = node.data;
            var propertyDefinition = componentDefinition.getMapPropertyDefinition(beanDefinitionId, propName);
            console.info(propertyDefinition);
            var form = $('#comp-props-display-form');
            form.empty();
            form.append('<div class="row prop-entry" >' +
                '<input type="hidden" name="compDefinitionClass" value="' +className+ '" id="comp-definition-class-hidden"/></div>');
            form.append('<div class="row prop-entry" >' +
                '<input type="hidden" name="beanDefinitionId" value="' +beanDefinitionId+ '" id="bean-definition-id-hidden"/></div>');
            form.append('<div class="row prop-entry" >' +
                '<input type="hidden" name="beanDefinitionPropName" value="' +propName+ '" id="bean-definition-propname-hidden"/></div>');
            if(propertyDefinition.isEmpty()) {
                form.append('<div class="row prop-entry" >' +
                    '<input class="map-entry-key" size="10"/>=<input class="map-entry-value" size="10"/>' +
                    '<button type="button" class="remove-map-entry">移除</button></div>');
            } else {
                for(var key in propertyDefinition.value) {
                    form.append('<div class="row prop-entry" >' +
                        '<input class="map-entry-key" size="10" value="' +key+ '"/>=' +
                        '<input class="map-entry-value" size="10" value="' +propertyDefinition.value[key]+ '"/>' +
                        '<button type="button" class="remove-map-entry">移除</button></div>');
                }
            }
            form.append('<div class="row prop-entry"><button type="button" id="add-map-entry-button">添加</button>' +
                '<button type="button" id="back-to-prev-bean-definition-button" lang="' +beanDefinitionId+ '">返回</button></div>');
        } else {
            alert('类名为:' + className + "节点未找到");
        }
    });

    //添加Map属性条目元素
    $('#add-map-entry-button').live('click', function() {
        $(this).parent().before('<div class="row prop-entry" >' +
            '<input class="map-entry-key" size="10"/>=<input class="map-entry-value" size="10"/>' +
            '<button type="button" class="remove-map-entry">移除</button></div>')
    });

    //移除数组或列表的一个元素
    $('button.remove-map-entry').live('click', function(){
        var beanDefinitionId = $('#bean-definition-id-hidden').val();
        var propName = $('#bean-definition-propname-hidden').val();
        var className = $('#comp-definition-class-hidden').val();

        var node = serviceEditor.getNodeByClass(className);
        if(node) {
            var componentDefinition = node.data;
            var propertyDefinition = componentDefinition.getMapPropertyDefinition(beanDefinitionId, propName);
            var key = $(this).prevAll(':text.map-entry-key').val();
            console.info(key);
            propertyDefinition.remove(key);
        } else {
            alert('类名为:' + className + "节点未找到");
        }

        $(this).parent().remove();

    });

    //数组或列表的一个元素值发生改变时
    $(':text.map-entry-key,:text.map-entry-value').live('change', function() {
        var beanDefinitionId = $('#bean-definition-id-hidden').val();
        var propName = $('#bean-definition-propname-hidden').val();
        var className = $('#comp-definition-class-hidden').val();

        var node = serviceEditor.getNodeByClass(className);
        if(node) {
            var componentDefinition = node.data;
            var propertyDefinition = componentDefinition.getMapPropertyDefinition(beanDefinitionId, propName);
            console.info(propertyDefinition);
            propertyDefinition.clear();
            $('#comp-props-display-form').find(':text.map-entry-key').each(function(){
                var currentKey = $(this).val();
                if(currentKey) {//空字符串也为false
                    var currentValue = $(this).next(':text.map-entry-value').val();
                    propertyDefinition.add(currentKey, currentValue);
                }
            });
        } else {
            alert('类名为:' + className + "节点未找到");
        }
    });

    //当选择资源值改变时
    $('select.ref-prop-resource').live('change', function(){
        var propName = $(this).attr('name');
        var refPropertyDefinition = getRefPropertyDefinitionByForm(propName);
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

}




//---------------------------------------------------工具函数------------------------------------------------
function getSimpleClassName(_class) {
    var lastIndex = _class.lastIndexOf(".");
    return _class.substr(lastIndex+1);
}

function getRefPropertyDefinitionByForm(_propName) {
    var beanDefinitionId = $('#bean-definition-id-hidden').val();
    var className = $('#comp-definition-class-hidden').val();
    var node = serviceEditor.getNodeByClass(className);
    return node.data.getRefPropertyDefinition(beanDefinitionId, _propName);
}

//根据Form表单中的信息，查找属性名称为_propName的属性定义
function getPropertyDefinitionByForm(_propName) {
    var beanDefinitionId = $('#bean-definition-id-hidden').val();
    var className = $('#comp-definition-class-hidden').val();
    var node = serviceEditor.getNodeByClass(className);
    var beanDefinition = node.data.searchById(beanDefinitionId);
    return beanDefinition.getPropertyDefinition(_propName);
}



