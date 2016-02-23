function RosManager() {
    this.ros = {};
	this.listener = {};
    this.dataListener = {};
    this.rosTopics = [];
    this.rosServices = [];
	this.rosReceivedMsgs = [];
    
    //this.setup();  
}

RosManager.prototype.setup = function()
{
    var manager = this;
    this.ros = new ROSLIB.Ros();
    this.rosTopics = [];
    this.rosServices = [];
    
    this.ros.on('connection', function() {
        console.log('Connected to websocket server.');
        if(manager.onConnection)
            manager.onConnection();
        
        manager.requestData("-");
    });
    this.ros.on('error', function(error) {
        console.log('Error connecting to websocket server: ', error);
        if(manager.onError)
            manager.onError();
    });
    this.ros.on('close', function() {
        console.log('Connection to websocket server closed.');
        if(manager.onClose)
            manager.onClose();
    });
    
    this.listener = new ROSLIB.Topic({
        ros : this.ros,
        name : '/snap_listener',
        messageType : 'diagnostic_msgs/KeyValue'
    });
    this.dataListener = new ROSLIB.Topic({
        ros : this.ros,
        name : '/snap_xml_listener',
        messageType : 'std_msgs/String'
    });
    
	this.listener.subscribe(function(message) {
		console.log('Received message on ' + this.name + ': ' + message.key);
		IDE_Morph.prototype.droppedText("");
		manager.rosReceivedMsgs[message.key] = message.value;

		world.children.forEach(function (child) {
			var stage = child.stage;
			Process.prototype.doBroadcast(message.value, stage, true);
		});
	});
    
    this.dataListener.subscribe(function(message) {
        world.children.forEach( function(child)
        { 
            if(child instanceof IDE_Morph)
            {
                child.droppedText(message.data);
                //console.log(message.data);
                console.log("Received file");
            }
        });
    });
}

RosManager.prototype.connect = function (onConnection, onClose, onError)
{
	if(this.ros.isConnected)
	{
		this.ros.close();
        return;
	}
	
    this.onConnection = onConnection;
    this.onClose = onClose;
    this.onError = onError;
    this.setup()
	
	this.ros.connect('ws://localhost:9090');
}

RosManager.prototype.isConnected = function(topic)
{
	return this.ros.isConnected;
}

RosManager.prototype.callService = function(name, message, functionHndlr)
{
    try
    {
        var srvClient = this.getService(name);

        var request = new ROSLIB.ServiceRequest({
            request: String(message)
        });

        srvClient.callService(request, functionHndlr);
    }
    catch(e)
    {
        console.log(e);
        return false;
    }
    return true;
}

RosManager.prototype.getService = function(name)
{
    var srvClient = this.rosServices[name];
    if(srvClient == null)
    {
        var parent = this;
        srvClient = new ROSLIB.Service({
            ros : parent.ros,
            name : name,
            servceType : '/StringService'
        });
        parent.rosServices[name] = srvClient;
                    
        this.ros.getServices(
            function(services)
            {
                if(services.indexOf(name) < 0)
                {
                    parent.rosServices[name] = null;
                    throw "error: "+name+" no such service is avaiable";
                }
            }
        );
    }
    return srvClient;
}

RosManager.prototype.getMessage = function(topic, dataType)
{
    if (typeof(dataType) === 'undefined') 
        dataType = "std_msgs/String";
	if(this.rosReceivedMsgs[topic] == null)
	{
		var manager = this;
		this.createTopic(topic, dataType, function(message)
			{
				//console.log('Received string message on ' + this.name + ': ' + message.data);
				manager.rosReceivedMsgs[this.name] = message.data;
			}
		);
		return '';
	}
	return this.rosReceivedMsgs[topic];
}

RosManager.prototype.getMessageStatus = function(topic)
{
	if(this.rosReceivedMsgs[topic] == null)
		return false;
	if(this.rosReceivedMsgs[topic] == "false")
		return false;
	
	return true;
}

RosManager.prototype.getTopic = function(topic)
{
	if(this.rosTopics[topic] == null)
		return null;
	return this.rosTopics[topic];
}

RosManager.prototype.createTopic = function(topic, messageType, listenerFunc)
{
	var rosTopic =
		new ROSLIB.Topic({
			ros : this.ros,
			name : topic,
			messageType : messageType
		});
		
	if(listenerFunc != null)
	{
		rosTopic.subscribe(listenerFunc);
	}
	this.rosTopics[topic] = rosTopic;
	return rosTopic;
}
 
RosManager.prototype.boolMessage = function (topic, message)
{
	var rosTopic = this.getTopic(topic);
	if(rosTopic == null)
		rosTopic = this.createTopic(topic, 'std_msgs/Bool');
		
	var msg = new ROSLIB.Message({data:message});
	rosTopic.publish(msg);
}

RosManager.prototype.stringMessage = function (topic, message)
{
	var rosTopic = this.getTopic(topic);
	if(rosTopic == null)
		rosTopic = this.createTopic(topic, 'std_msgs/String');
		
	var msg = new ROSLIB.Message({data:message});
	rosTopic.publish(msg);
}

RosManager.prototype.floatMessage = function (topic, message)
{
	var rosTopic = this.getTopic(topic);
	if(rosTopic == null)
		rosTopic = this.createTopic(topic, 'std_msgs/Float32');
		
	var msg = new ROSLIB.Message({data:message});
	rosTopic.publish(msg);
}

RosManager.prototype.customMessage = function (topic, message, msgType)
{
    var rosTopic = this.getTopic(topic);
    if(rosTopic == null)
        rosTopic = this.createTopic(topic, msgType);
        console.log(message);
    var msg = new ROSLIB.Message(JSON.parse(message));
    rosTopic.publish(msg);
}

RosManager.prototype.requestData = function (message)
{
    this.stringMessage("/introduce_all", message);
}

RosManager.prototype.terminate = function ()
{
    this.customMessage('/stop_all', '{}', 'std_msgs/Empty');
}
var rosManager;
rosManager = new RosManager();
