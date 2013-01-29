head.js(
    './nextgen/bundle/lin.js',
    './nextgen/bundle/mousetrap.js'
);
function Sprite(init) {
    var x,
        y,
        canv,
        ctx,
        acts,
        act,
        oldact,
        orient = 1,
        meta_orient= 1,
        stage_ctx,
        anim_delay = 0.25,
        micro_t = 0,
        frame = 0,
        y_speed_fac = 0.45,
        x_speed_fac = 0.7,
        key_lock = false,
        name,
        frames = 0;

        var role = {
            walk_speed: 2,
            health: 100
        };

        acts = init.acts;
        canv = init.canv;
        act = init.act;
        x = init.x || 100;
        y = init.y || 100;
        name = init.name || '???';
        this.name = name;
        that = this;

        ctx = canv.getContext('2d');

        function draw() {
            var rect = acts[act][frame],
            sx = rect[0],
            sy = rect[1],
            sw = rect[2],
            sh = rect[3],
            dx = rect[4]-255+x,
            dy = rect[5]-255+y;
            stage_ctx.save();
            stage_ctx.translate(x,0);
            stage_ctx.scale(orient, 1);
            stage_ctx.translate(-x,0);
            stage_ctx.drawImage(canv,
                sx, sy, sw, sh, dx, dy, sw, sh);
            stage_ctx.restore();
            //stage_ctx.strokeStyle = 'white';
            //stage_ctx.lineWidth = 1;
            //stage_ctx.strokeText(name, x-10, y-sh-8);
        }

        function setAnim(a) {
            if(act!=a){
                oldact = act;
                act = a;
                frame = 0;
            }
        }

        function controller(keys) {
            if(key_lock){
            
            }else{
                if(!keys){
                    return;
                }
                if(keys.left||keys.right||keys.up||keys.down){
                    var x_fac = 1;
                    if(keys.up){
                        setAnim('walk');
                        y-= role.walk_speed * y_speed_fac;
                        x_fac = x_speed_fac;
                    }else if(keys.down){
                        setAnim('walk');
                        y+= role.walk_speed * y_speed_fac;
                        x_fac = x_speed_fac;
                    }
                    if(keys.left){
                        setAnim('walk');
                        x-= role.walk_speed * x_fac;
                        orient = -meta_orient;

                    }else if(keys.right){
                        setAnim('walk');
                        x+= role.walk_speed * x_fac;
                        orient = meta_orient;

                    }
                }else{
                    setAnim('idle');
                }

                if(keys.B){
                    key_lock = true;
                    setAnim('punch');
                }else if(keys.A){
                    key_lock = true;
                    setAnim('jump');
                }
            
            }
        }

        this.setXY = function(xx, yy) {
            x = xx;
            y = yy;
        }
        this.getY = function() {
            return y;
        }
        this.getX = function() {
            return x;
        }

        this.run = function(keys) {
            controller(keys);
            draw();
            if(micro_t >= 1){
                frame++;
                if(frame >= acts[act].length){
                    frame = 0;
                    key_lock = false;
                }
                micro_t = 0;
            }
            micro_t += anim_delay;
        }

        this.update = function(obj) {
            stage_ctx = obj.stage_ctx;
        }
    
}

function Stage(init) {
    var canv = document.createElement('canvas');
    var obj_list = [];
    var intv = 1000/30;
    var timer = setInterval(update, intv);
    var play = false;
    var keys = {};
    var keyPool = {};
    var oldkeys = {};
    var username;
    var wsock;
    var online = false;
    var sheetCanvPool = {};
    var playerPool = {};


    var codec = new Codec();

    canv.width = init.width;
    canv.height = init.height;
    var that = this;

    canv.onmousedown = function(e){
        var x = e.offsetX,
            y = e.offsetY;

        obj_list.forEach(function(e){
            var ex = e.getX(),
                ey = e.getY();
            if(x<ex-30||x>ex+30||y>ey||y<ey-70){
            }else{
                username = e.name;
            }
        });
    
    }

    var container = document.getElementById(init.container);
    container.appendChild(canv);

    var ctx = canv.getContext('2d');
    ctx.webkitImageSmoothingEnabled = false;
    cctx = ctx;

    this.setUsername = function(name){
        username = name;
    }
    this.add = function(obj){
        obj.update({stage_ctx:ctx});
        obj_list.push(obj);
    }
    this.start = function(){
        play = true;
    }

    this.addPlayer = function(name, imgsrc){
        wsock.send('join', name, imgsrc);
    }

    this.ws_send = function(cmd){
        wsock.send(cmd);
    }

    function draw() {
        ctx.clearRect(0,0,canv.width,canv.height);
    }

    function update() {
        if(play){
            if(online){
                wsock.send('update');
            }
            draw();

            obj_list.sort(function(a,b){return a.getY()-b.getY()});

            for (var i = 0, len = obj_list.length; i < len; i++) {
                var sprite = obj_list[i];
                sprite.run(keyPool[sprite.name]);
            }
        }
    }

    window.onkeydown = function(e){
        switch (String.fromCharCode(e.keyCode)) {
            case 'A':
                keys.left = true;
                break;
            case 'S':
                keys.down = true;
                break;
            case 'D':
                keys.right = true;
                break;
            case 'W':
                keys.up = true;
                break;
            case 'J':
                keys.B = true;
                break;
            case 'K':
                keys.A = true;
                break;
            default:
        }
    
    }
    window.onkeyup = function(e){
        switch (String.fromCharCode(e.keyCode)) {
            case 'A':
                keys.left = false;
                break;
            case 'S':
                keys.down = false;
                break;
            case 'D':
                keys.right = false;
                break;
            case 'W':
                keys.up = false;
                break;
            case 'J':
                keys.B = false;
                break;
            case 'K':
                keys.A = false;
                break;
            default:
        }
    }
    function loadAvatar(name, imgsrc, initX, initY){

        function newPlayer(name, stage, playerPool, sheet_anv, acts) {

            function mess2sprite(acts) {
                var out = {};
                for (var i in acts) {
                    var act = acts[i];
                    out[i] = (act.map(function(e){
                        var f = e[0];
                        return f;
                    }));
                }
                return out;
            }
            var character = new Sprite({
                canv: sheet_anv,
                act: 'idle',
                acts: mess2sprite(acts),
                name: name,
                x: initX,
                y: initY
            });

            playerPool[name] = character;
            stage.add(character);
        }

        if(sheetCanvPool[imgsrc]){
            var acts = sheetCanvPool[imgsrc][1];
            var sheetCanv = sheetCanvPool[imgsrc][0];
            newPlayer(name, that, playerPool, sheetCanv, acts);
            return;
        }

        var img = new Image();
        img.onload = function() {
            var sheetCanv = document.createElement('canvas');
            sheetCanv.width = img.width;
            sheetCanv.height = img.height;
            var ctx = sheetCanv.getContext('2d');
            ctx.drawImage(img, 0, 0);
            var acts = codec.decode({imgCanv:sheetCanv, img:img});

            newPlayer(name, that, playerPool, sheetCanv, acts);
            sheetCanvPool[imgsrc] = [sheetCanv, acts];
        }
        img.onprogress = function(e) {
            console.log((e.loaded/e.total)*100+'%');
        }
        img.onloadstart = function(e) {
            console.log((e.loaded/e.total)*100+'%');
        }

        img.src = imgsrc;
    }

    function wsConnect(){
        wsock = lin.socket.open('ws://10.42.0.71:9999/', {
            onrecv: function(recvobj){
                var stat = recvobj.status;

                function handleSuccess(cmd) {
                    switch (cmd) {
                        case 'update':
                            keyPool = recvobj.content;
                        break;
                        case 'join':
                            lin.notification('Join success');
                            var content = recvobj.content;
                            for (var i in content) {
                                if(playerPool[i]){
                                }else{
                                    var ctn = content[i];
                                    loadAvatar(i, ctn.img, ctn.x, ctn.y);
                                }
                            };
                        break;
                        case 'sync':
                            var content = recvobj.content;
                            for (var i in content) {
                                var p = playerPool[i];
                                if(p){
                                    var ctn = content[i];
                                    p.setXY(ctn.x, ctn.y);
                                }
                            };
                        break;
                        case 'load_state':
                            var content = recvobj.content;
                            var players = content.players;
                            var imgs = content.imgs;
                            for (var i in players) {
                                var p = playerPool[i];
                                var remote_p = players[i];
                                if(p){
                                    p.setXY(remote_p.x, remote_p.y);
                                }else{
                                    var img = imgs[i];
                                    loadAvatar(i, img.img, remote_p.x, remote_p.y);
                                }
                            };
                        break;
                        case 'save_state':
                            lin.notification('Save success');
                        break;
                    }
                }

                function handleFail(cmd) {
                    lin.notification(cmd+' failed');
                }

                switch (stat) {
                    case 'success':
                        handleSuccess(recvobj.cmd);
                    break;
                    case 'fail':
                        handleFail(recvobj.cmd);
                    break;
                }
            },
            onsend: function() {
                var cmd = arguments[0];
                var arg1 = arguments[1];
                var arg2 = arguments[2];

                switch (cmd) {
                    case 'update':
                        var sendkey = {};
                        if(username){
                            var player = playerPool[username];
                            keys.x = player.getX();
                            keys.y = player.getY();
                            sendkey[username] = keys;
                        }
                        return {
                        cmd:'update',
                        content: sendkey
                    };
                    break;
                    case 'join':
                        var players = {};

                        players[arg1] = {
                            img:arg2
                        };
                        return {
                        cmd:'join',
                        content: players
                    };
                    break;
                    case 'sync':
                        return {
                        cmd:'sync',
                        content: ''
                    };
                    break;
                    case 'save_state':
                        return {
                        cmd:'save_state',
                        content: ''
                    };
                    break;
                    case 'load_state':
                        return {
                        cmd:'load_state',
                        content: ''
                    };
                    break;
                }},
            onopen: function(e) {
                online = true;
            },
            onerror: function(){
                online = false;
            }
        });
    }
    wsConnect();
}

window.onload = function() {

    var clist = [
        "amazoness.png",
        "ArcadeDenjinMakai2Zeldia.png",
        "aska.png",
        "axel111.png",
        "blaze111.png",
        "cammy.png",
        "carolbrenda11.png",
        "chunli.png",
        "daisy.png",
        "electra11111.png",
        "enemy13.png",
        "enemy14.png",
        "Hanna_Dundee.png",
        "honey.png",
        "iyo.png",
        "kurokishi.png",
        "mademoisellelady11.png",
        "Poison.png",
        "robots1.png",
        "shiva1111.png",
        "yasha11.png",
        "ycina.png"
    ];

    var stage = new Stage({
        width:800,
        height:500,
        container:'container'
    });

    stage.start();

    var text = document.getElementById('text'),
        bu_join = document.getElementById('bu_join'),
        bu_sync = document.getElementById('bu_sync'),
        bu_save = document.getElementById('bu_save'),
        bu_load = document.getElementById('bu_load'),
        select = document.getElementById('select');

    select.innerHTML = lin.dom.ht.selectOpts(clist);


    bu_join.onclick=function(){
        var prefix = 'assets/uploads/original/'
        stage.addPlayer(select.value, prefix+select.value);
    }
    bu_sync.onclick=function(){
        stage.ws_send('sync');
    }
    bu_save.onclick=function(){
        stage.ws_send('save_state');
    }
    bu_load.onclick=function(){
        stage.ws_send('load_state');
    }

}

function Codec() {
    var sheetObj;
    var sheetCanv;
    var header = "spc";
    var idx = 0;
    var pixIdx = 0;
    var frameIdx = 0;

    var headerLen = header.length;
    var codec_canv = document.createElement('canvas');
    var outCanv = document.createElement('canvas');
    var lengths;

    var ctx;
    
    var data;

    var numToChar = String.fromCharCode;

    function decode (sheetObj) {
        var sheetCanv = sheetObj.imgCanv;
        var sheetImg = sheetObj.img;
        idx=0;
        pixIdx=0;
        ctx = sheetCanv.getContext('2d');
        var metaImgData = ctx.getImageData(0,0,sheetCanv.width,sheetCanv.height);
        data = metaImgData.data;
        var hd = getChars();
        var out, actLen, actName, arr, aNum, r;
        if(header!==hd){//err no header
            return;
        }
        var type = getChars();

        out={};
        actLen=getActionsNum();

        for (var j = 0; j < actLen; j++) {
            actName = getActionSection();
            arr = [];
            out[actName] = arr;
            aNum = getActionsNum()
            for (var i = 0; i < aNum; i++) {
                arr.push([getRect()]);
            };
        };

        lengths = getActionsLength(out);
        var w = sheetCanv.width;
        var h = Math.ceil(lengths[0]/w);
        sheetCanv.height -= h;
        ctx.clearRect(0,0,w,h);
        ctx.drawImage(sheetImg,0,-h);

        return out;
    }

    function getActionsLength(actions) {
        var pixlen = 2;
        var actionNum = 0;
        for(var i in actions){
            pixlen+=5;//name+len
            pixlen+=actions[i].length*3;//rect
            actionNum++;
        }
        return [pixlen,actionNum];
    }

    function setRect (r) {//3 pixels
        var x = r[0],
            y = r[1],
            w = r[2],
            h = r[3],
            ox = r[4],
            oy = r[5],
            hx = x>>8,
            lx = x&255,
            hy = y>>8,
            ly = y&255,
            hw = w>>2,
            lw = w&3,
            hh = h>>4,
            lh = h&15,
            hox = ox>>6,
            lox = ox&63,
            hoy = oy>>8,
            loy = oy&255;

            data[idx] = hx;
            data[idx+1] = lx;
            data[idx+2] = hy;

            data[idx+4] = ly;
            data[idx+5] = hw;
            data[idx+6] = (lw<<6)|hh;

            data[idx+8] = (lh<<4)|hox;
            data[idx+9] = (lox<<2)|hoy;
            data[idx+10] = loy;

            pixIdx+=3;
            idx = pixIdx<<2;
    }
    function getRect () {
        var hx = data[idx],
            lx = data[idx+1],
            hy = data[idx+2],

            ly = data[idx+4],
            hw = data[idx+5],
            lw = data[idx+6]>>6,
            hh = data[idx+6]&63,

            lh = data[idx+8]>>4,
            hox= data[idx+8]&15,
            lox= data[idx+9]>>2,
            hoy= data[idx+9]&3,
            loy= data[idx+10],
            
            x = (hx<<8)|lx,
            y = (hy<<8)|ly,
            w = (hw<<2)|lw,
            h = (hh<<4)|lh,
            ox= (hox<<6)|lox,
            oy= (hoy<<8)|loy;

            pixIdx+=3;
            idx = pixIdx<<2;
            return [x,y,w,h,ox,oy];
    }

    function setActionSection(name) {//4 pixel
        for (var i = 0; i < 3; i++) {
            data[idx+i]=name.charCodeAt(i);
            data[idx+4+i]=name.charCodeAt(i+3);
            data[idx+8+i]=name.charCodeAt(i+6);
            data[idx+12+i]=name.charCodeAt(i+9);
        };
        pixIdx+=4;
        idx = pixIdx<<2;
    }

    function getActionSection() {
        var out='';
        var end = idx+16;
        for (var i = idx; i < end; i+=4) {
            var k = data[i];
            if(k===0)break;
            out+=numToChar(k);
            k = data[i+1];
            if(k===0)break;
            out+=numToChar(k);
            k = data[i+2];
            if(k===0)break;
            out+=numToChar(k);
        };
        pixIdx+=4;
        idx = pixIdx<<2;
        return out;
    }

    var getFrameIdx = function () {
        return frameIdx;
    }

    var checkHeader = function (input) {
        return input === header;
    }

    var setChars = function (chars) {//first pixel carries the header
        for (var i = 0; i < 3; i++) {
            data[idx+i] = chars.charCodeAt(i);
        };
        pixIdx++;
        idx = pixIdx<<2;
    }

    var setActionsNum = function (len) {//1 pixel
        var a = len >> 16,
        b = (len >> 8) - (a << 8);
        c = len - (a << 16) - (b << 8);
        data[idx] = a;
        data[idx + 1] = b;
        data[idx + 2] = c;
        pixIdx++;
        idx = pixIdx<<2;
    }
    var getChars = function () {
        var out = '';
        for (var i = 0; i < 3; i++) {
            out += numToChar(data[idx+i]);
        };
        pixIdx++;
        idx = pixIdx<<2;
        return out;
    }
    var getActionsNum = function () {
        var out = (data[idx] << 16) + (data[idx + 1] << 8) + data[idx + 2];
        pixIdx++;
        idx = pixIdx<<2;
        return out;
    }

    this.decode = decode;
}

function pnt(info) {
    console.log(info);
}
