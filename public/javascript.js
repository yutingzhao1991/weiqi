window.onload = function(){


	//初始化棋盘
	var board = T.g("board");
	var log = T.g("log");
	var judgeFlag = 1;
	var stepCount = 0;
	var endFlag = false;
	var method = 2; //0-程序员模式 1-小白模式 2-联机模式
	var Unit = function(i, j){
		this.dom = T.dom.create("div", {
			className: "unit"
		});
		this.flag = 0; //0为空 1为黑 2为白
		this.life = 4;
		if(i==0 || i==18){
			this.life --;
		}
		if(j==0 || j==18){
			this.life --;
		}
		this.i = i;
		this.j = j;
		var u = this;
		T.on(this.dom, "click", function(e){
				if(method == 0){
					return;
				}
				if(method == 2){
					//联机对战
					if(network.isAction()){
						unitOnClick(u, e);
						network.sendAction({
							i: u.i,
							j: u.j
						});
					}else{
						addInfo("还未到你下子或者还没有连接到对手，请等待");
					}
					return;
				}
				unitOnClick(u, e);
			}
		);
		this.judgeFlag = 0;
	}
	Unit.prototype.addToBoard = function(){
		board.appendChild(this.dom);
	}
	Unit.prototype.removeFlag = function(){
		this.flag = 0;
		T.removeClass(this.dom, "white");
		T.removeClass(this.dom, "black");
	}
	Unit.prototype.addWhiteFlag = function(){
		var dom = this.dom;
		this.flag = 2;
		T.addClass(dom, "white active");
		setTimeout(function () {
			T.removeClass(dom, 'active');
		}, 5000);
	}
	Unit.prototype.addBlackFlag = function(){
		var dom = this.dom;
		this.flag = 1;
		T.addClass(dom, "black active");
		setTimeout(function () {
			T.removeClass(dom, 'active');
		}, 5000);
	}
	Unit.prototype.reset = function(){
		this.flag = 0;
		T.removeClass(this.dom, "white");
		T.removeClass(this.dom, "black");
		this.life = 4;
		if(i==0 || i==18){
			this.life --;
		}
		if(j==0 || j==18){
			this.life --;
		}
	}

    var map = [];

	//网上联机对战部分
	var network = (function(){
		var HOST = location.host;
		var socket = null;
		var id = null;
		var isConnect = false;
		var step = 0;
		socket = io.connect('http://'+HOST);
		var action = false;
		socket.on('notice', function(data){
			addInfo("服务器信息：" + data.info);
		});
		socket.on('chat', function(data){
			addInfo("来自" + data.name + "的信息：" + data.info);
		});

		return {
			//下子
			sendAction: function(data){
				action = false;
				step ++;
				socket.emit("action", data);
			},
			//socket创建
			onCreate: function(callback){
				socket.on('create', function(data){
					id = data.id;
					T.g("playerName").value = "路人"+data.id;
					callback && callback(data);
				});
			},
			//对手下子
			onAction: function(callback){
				socket.on('action', function(data){
					if(data.id == id){
						//自己的步骤
						return;
					}
					if(step+1 != data.step){
						//服务器出现了数据错误同步
						addInfo("出现数据丢失 sorry");
						return;
					}
					step ++;
					action = true;
					callback && callback(data);
				});
			},
			//连接上对手
			onConnect: function(callback){
				socket.on('connectPlayer', function(data){
					isConnect = true;
					if(data.color != "black"){
						addInfo("你是黑棋，轮到你先下子");
						action = true;
					}else{
						addInfo("对方黑棋，轮到对方先下子");
					}
					callback && callback(data);
				});
			},
			//请求对手
			request: function(name){
				if(id == null){
					return;
				}
				step = 0;
				socket.emit("request", {
					name: name
				});
			},
			//是否可以行走
			isAction: function(){
				return action;
			},
			//socket是否已经创建
			isCreate: function(){
				if(id == null){
					return false;
				}else{
					return true;
				}
			},
			//对手是否已经连线,
			isConnect: function(){
				return isConnect;
			},
			chat: function(info){
				socket.emit("chat", {
					info: info
				});
			},
			rename: function(name){
				socket.emit("rename", {
					name: name
				});
			}
		}
	})();

	for(var i=0; i<19; i++){
		var temp = [], t;
		for(var j=0; j<19; j++){
			t = new Unit(i, j);
			t.addToBoard();
			temp.push(t);
		}
		map.push(temp);
	}

	//事件 动作
	var currentFlag = 1;//当前下子的颜色
	function unitOnClick(unit, e, callback){
		if(endFlag){
			addInfo("游戏已经结束！");
			return;
		}
		e = e || {};
		if(e.ctrlKey){
			return;
		}
		if(unit.flag != 0){
			return;
		}
		if(currentFlag == 1){
			unit.addBlackFlag();
		}else{
			unit.addWhiteFlag();
		}
		changeRound();

		operateAround(unit, function(temp){
			temp.life --;
		});

		var lifeFlag = false;
		if(isAlive(unit)){
			lifeFlag = true;
		}

		var clearFlag = false;
		operateAround(unit, function(temp){
			if(temp.flag!=unit.flag && !isAlive(temp)){
				removeAreaByPoint(temp);
				clearFlag = true;
			}
		})

		if(!lifeFlag && clearFlag){
			removeAreaByPoint(unit);
		}

		if(!lifeFlag && !clearFlag){
			//违规下法  不能自杀
			addInfo("违规下法  不能自杀");
			unit.removeFlag();
			operateAround(unit, function(temp){
				temp.life ++;
			});
			changeRound();
			return;
		}

		stepCount ++;
		if(stepCount > 182*2){
			addInfo("游戏结束！");
			endFlag = true;
		}
	}

	function changeRound(){
		if(currentFlag == 1){
			currentFlag = 2;
			T.addClass(board, "whiteRound");
			T.removeClass(board, "blackRound");
		}else{
			currentFlag = 1;
			T.removeClass(board, "whiteRound");
			T.addClass(board, "blackRound");
		}
	}

	//棋盘分析方法
	function operateAround(unit, callback){
		var temp;
		temp = getLeftUnit(unit);
		if(temp){
			callback(temp);
		}
		temp = getRightUnit(unit);
		if(temp){
			callback(temp);
		}
		temp = getUpUnit(unit);
		if(temp){
			callback(temp);
		}
		temp = getDownUnit(unit);
		if(temp){
			callback(temp);
		}
	}


	function isAliveStep(unit){
		if(unit.judgeFlag == judgeFlag){
			return false;
		}
		unit.judgeFlag = judgeFlag;
		if(unit.life <= 0){
			var aliveFlag = false;
			operateAround(unit, function(t){
				if(aliveFlag){
					return;
				}
				if(t.flag==unit.flag && isAliveStep(t)){
					aliveFlag = true;
				}
			});
			return aliveFlag;
		}else{
			return true;
		}
	}
	function isAlive(unit){
		if(unit.flag == 0){
			return true;
		}
		judgeFlag ++;
		return isAliveStep(unit);
	}

	function removeAreaByPointStep(unit){
		unit.judgeFlag = judgeFlag;
		operateAround(unit, function(t){
			if(t.judgeFlag != judgeFlag){
				if(t.flag==unit.flag){
					removeAreaByPointStep(t);
				}
			}
		})

		unit.removeFlag();
		operateAround(unit, function(temp){
			temp.life ++;
		})

	}
	function removeAreaByPoint(unit){
		if(unit.flag != 0){
			judgeFlag++;
			removeAreaByPointStep(unit);
		}else{
			return true;
		}
		return true;
	}

	function getUpUnit(unit){
		if(unit.j>0){
			return map[unit.i][unit.j-1];
		}else{
			return null;
		}
	}

	function getDownUnit(unit){
		if(unit.j < 18){
			return map[unit.i][unit.j+1];
		}else{
			return null;
		}
	}

	function getLeftUnit(unit){
		if(unit.i > 0){
			return map[unit.i-1][unit.j];
		}else{
			return null;
		}
	}

	function getRightUnit(unit){
		if(unit.i < 18){
			return map[unit.i+1][unit.j];
		}else{
			return null;
		}
	}

	//AI
	var blackAI, whiteAI;
	var blackAIcode = T.g("blackAIcode");
	var whiteAIcode = T.g("whiteAIcode");
	T.on("loadBlackAI", "click", function(){
		try{
			eval(blackAIcode.value);
			addInfo("加载成功");
		}catch(e){
			addInfo("不合法的AI");
		}
	});
	T.on("loadWhiteAI", "click", function(){
		try{
			eval(whiteAIcode.value);
			addInfo("加载成功");
		}catch(e){
			addInfo("不合法的AI");
		}
	});
	T.on("start", "click", function(){
		endFlag = false;
		if(method == 0){
			runAI();
		}else{
			addInfo("请调整到程序员模式使用AI对战");
		}
	});
	function runAI(){
		if(endFlag){
			return;
		}
		var s;
		if(currentFlag == 1){
			s = blackAI({
				currentFlag: currentFlag
				,map: map
			});
		}else{
			s = whiteAI({
				currentFlag: currentFlag
				,map: map
			});
		}
		if(s){
			unitOnClick(map[s.i][s.j]);
		}
		setTimeout(function(){
			runAI();
		},100);
	}

	//功能区
	T.on("reset", "click", function(){
		judgeFlag = 1;
		stepCount = 0;
		if(method == 0){
			endFlag = true;
		}else{
			endFlag = false;
		}
		for(var i=0; i<19; i++){
			for(var j=0; j<19; j++){
				map[i][j].reset();
			}
		}
		currentFlag = 1;
	});

	//点击请求对战对手
	T.on("requestEnemy", "click", function(){
		if(method != 2){
			addInfo("请选择多人对战模式");
			return ;
		}
		if(!network.isCreate()){
			addInfo("还未成功连接上服务器，请稍后再试！");
			return ;
		}
		for(var i=0; i<19; i++){
			for(var j=0; j<19; j++){
				map[i][j].reset();
			}
		}
		currentFlag = 1;
		addInfo("请求已经发出，请等待!");
		network.request(T.g("playerName").value);
	})
	T.on("method0", "click", function(e){
		if(network.isConnect()){
			addInfo("您正在多人对战中，该模式选择操作无效");
			return;
		}
		method = 0;
	});
	T.on("method1", "click", function(){
		if(network.isConnect()){
			addInfo("您正在多人对战中，该模式选择操作无效");
			return;
		}
		method = 1;
	});
	T.on("method2", "click", function(){
		method = 2;
	});
	T.on("chatBtn", "click", function(){
		var info = T.g("chatInput").value;
		if(!info || info == ""){
			addInfo("您没有输入任何聊天信息");
			return;
		}else{
			network.chat(info);
		}
	});
	T.on("playerRename", "click", function(){
		network.rename(T.g("playerName").value);
	});


	//联机对战事件监听
	network.onAction(function(data){
		unitOnClick(map[data.i][data.j]);
	});
	network.onCreate();
	network.onConnect(function(data){
		addInfo("已经连接上对手" + data.name);
	});

	function addInfo(text){
		log.innerHTML += T.encodeHTML(text) + "</br>"
	}

}