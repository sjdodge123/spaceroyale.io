var server = null,
    canvas = null,
    canvasContext = null,
    eventLog,
    camera,
    userRegex = null,
    passRegex = null,
    isTouchScreen = false,
    gameNameRegex = null,
    serverShutdownReason = "Error",
    profile = null,

    //Gamevars
    skipAuth = false,
    iAmFiring = false,
    gameRunning = false,
    lastFired = new Date(),
    cooldownRemaining = 0,
    currentWeaponCooldown = 0,
    iAmAlive = true,
    cameraBouncing = false,
    cameraCenterSeed = null,
    cameraBouncingFirstPass = true,
    lastCameraSwap = null,
    recenterCameraTimeout = 5,
    timeOutChecker = null,
    gameStarted = false,
    victory = false,
    shrinkTimeLeft = 60,
    lobbyTimeLeft = 0,
    toastTimer = null,
    toastMessage = null,
    totalPlayers = null,
    myShip = null,
    healthLastFrame = 100,
    newWidth = 0,
    newHeight = 0,
    joystickMovement = null,
    joystickCamera = null,
    mousex,
    mousey,
    moveForward = false,
    moveBackward = false,
    turnLeft = false,
    turnRight = false;

var then = Date.now(),
    dt;


window.onload = function() {
    server = clientConnect();
    pingServer();
    setupPage();
}

function setupPage(){
    $('#nameBox').attr("placeholder","Guest"+getRandomInt(0,999999));
    var skinArray = [];
    skinArray.push({image:'sprites/ship_magenta.svg',value:"#ff00bf"});
    skinArray.push({image:'sprites/ship_blue.svg',value:"#66b3ff"});
    skinArray.push({image:'sprites/ship_red.svg',value:"red"});
    skinArray.push({image:'sprites/ship_green.svg',value:"green"});

    $('#guestSignIn').submit(function () {
        var name;
        if(profile == null){
            name = $('#nameBox').val();
            if(name == ""){
                name = $('#nameBox').attr("placeholder");
            }
        } else{
            name = profile.game_name;
        }
        enterLobby(name,$('#secondSkin').attr('data-selected'));
        return false;
    });

    $('#signInSubmit').click(function(e){
        auth($('#signInUser').val(),$('#signInPass').val());
    });

    $('#signUpSubmit').click(function(e){
        $('#signUpError').hide()
        register($('#signUpUser').val(),
                 $('#signUpPass1').val(),
                 $('#signUpPass2').val(),
                 $('#signUpGameName').val()
            );
    });

    $('#soundControl').click(function(){
        if(gameMuted){
            gameMuted = false;
            resumeAllSounds();
            $('#soundIcon').attr('class','glyphicon glyphicon-volume-up');
            return;
        }
        gameMuted = true;
        stopAllSounds();
        $('#soundIcon').attr('class','glyphicon glyphicon-volume-off');
    });

    //***************************Skin Selection Box*************************************
    $('#leftArrow').hover(function(){
        $(this).css('filter',"brightness(100%)");
    },function(){
        $(this).css('filter',"brightness(80%)");
    }).click(function(e){
        var lastElement = skinArray.splice(skinArray.length-1,1)[0];
        skinArray.unshift(lastElement);
        $("#firstSkin").attr('src',skinArray[0].image).attr('data-selected',skinArray[0].value);
        $("#secondSkin").attr('src',skinArray[1].image).attr('data-selected',skinArray[1].value);
        $("#thirdSkin").attr('src',skinArray[2].image).attr('data-selected',skinArray[2].value);
    });
    $('#rightArrow').hover(function(){
        $(this).css('filter',"brightness(100%)");
    },function(){
        $(this).css('filter',"brightness(80%)");
    }).click(function(){
        var firstElement = skinArray.shift();
        skinArray.push(firstElement);
        $("#firstSkin").attr('src',skinArray[0].image).attr('data-selected',skinArray[0].value);
        $("#secondSkin").attr('src',skinArray[1].image).attr('data-selected',skinArray[1].value);
        $("#thirdSkin").attr('src',skinArray[2].image).attr('data-selected',skinArray[2].value);
    });


    $('#firstSkin').click(function(){
        var lastElement = skinArray.splice(skinArray.length-1,1)[0];
        skinArray.unshift(lastElement);
        $("#firstSkin").attr('src',skinArray[0].image).attr('data-selected',skinArray[0].value);
        $("#secondSkin").attr('src',skinArray[1].image).attr('data-selected',skinArray[1].value);
        $("#thirdSkin").attr('src',skinArray[2].image).attr('data-selected',skinArray[2].value);
    });

    $('#thirdSkin').click(function(){
        var firstElement = skinArray.shift();
        skinArray.push(firstElement);
        $("#firstSkin").attr('src',skinArray[0].image).attr('data-selected',skinArray[0].value);
        $("#secondSkin").attr('src',skinArray[1].image).attr('data-selected',skinArray[1].value);
        $("#thirdSkin").attr('src',skinArray[2].image).attr('data-selected',skinArray[2].value);
    });


    //*******************************************************************************************


    //***************************Toggle for Signup screen*************************************
    $('#signUpCancel').click(function(e){
        $('#signUp').hide();
        $('#signUpError').hide();
        $("#centerContainer").removeClass("disabled");
        $("#centerContainer").addClass("enabled");
    });
    //*******************************************************************************************
    $('#signInUser').keypress(function(e) {
        if(e.which == 13) {
            auth($('#signInUser').val(),$('#signInPass').val());
        }
    });

    $('#signInPass').keypress(function(e) {
        if(e.which == 13) {
            auth($('#signInUser').val(),$('#signInPass').val());
        }
    });

    $('#signUpGameName').keypress(function(e) {
        if(e.which == 13) {
            $('#signUpError').hide()
        register($('#signUpUser').val(),
                 $('#signUpPass1').val(),
                 $('#signUpPass2').val(),
                 $('#signUpGameName').val()
            );
        }
    });

    $('#signInButton').click(function(){
        setTimeout(function() { $('#signInUser').focus() }, 500);
    })
    $('#signUpButton').click(function(){
        setTimeout(function() { $('#signUpUser').focus() }, 500);
    })


    $('#howToPlayHide').click(function(e){
        $('#howToPlayMenu').hide();
    });


    //playSound(backgroundMusic);

    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              function( callback ){
                window.setTimeout(callback, 1000 / 30);
              };
    })();
    window.addEventListener('resize', resize, false);
    canvas = document.getElementById('gameCanvas');
    canvasContext = canvas.getContext('2d');
    canvasContext.imageSmoothingEnabled = true;
    joystickMovement = new Joystick(250,canvas.height-250);
    joystickCamera = new Joystick(canvas.width-250,canvas.height-250);
    isTouchScreen = joystickMovement.touchScreenAvailable();
    resize();
    userRegex = new RegExp('^[a-zA-Z0-9_-]{3,15}$');
    passRegex = new RegExp('^[a-zA-Z0-9_-]{6,20}$');
    gameNameRegex = new RegExp('^[a-zA-Z0-9_-]{3,10}$');
}

function auth(user,pass){
    if(invalidAuth(user,pass)){
        failedToAuth();
        return;
    }
    clientSendAuth(user,pass);
}
function invalidAuth(user,pass){
    if(user == null || user == ""){
        return true;
    }
    if(pass == null || pass == ""){
        return true;
    }
    if(userRegex.test(user) == false){
        return true;
    }
    if(passRegex.test(pass) == false){
        return true;
    }
    return false;
}

function invalidRegister(user,pass1,pass2,gameName){
    if(user == null || user == ""){
        failedToRegister("User is empty");
        return true;
    }
    if(userRegex.test(user) == false){
        failedToRegister("Username is invalid");
        return true;
    }
    if(pass1 == null || pass1 == ""){
        failedToRegister("Password is empty");
        return true;
    }
    if(passRegex.test(pass1) == false){
        failedToRegister("Password is invalid");
        return true;
    }
    if(pass2 == null || pass2 == ""){
        failedToRegister("Please retype password");
        return true;
    }
    if(pass1 !== pass2){
        failedToRegister("Passwords don't match");
        return true;
    }
    if(gameName == null || gameName == ""){
        failedToRegister("Callsign empty");
        return true;
    }
    if(gameNameRegex.test(gameName) == false){
        failedToRegister("Callsign is invalid");
        return true;
    }
    return false;
}

function displayPlayerProfile(player){
    updateProfile(player);
}
function updateProfile(player){
    $('#nameBox').val(player.game_name.trim());
    $('#playerName').html("Welcome back, " + player.game_name.trim());
    $('#playerExp').html("Exp: " + player.total_exp.toString().trim());
    $('#playerKills').html("Kills: " + player.total_kills.toString().trim());
    $('#playerWins').html("Wins: " + player.total_wins.toString().trim());
}

function register(user,pass1,pass2,gameName){
    if(invalidRegister(user,pass1,pass2,gameName)){
        return;
    }
    clientSendReg(user,pass1,gameName);
}


function failedToRegister(error){
    $('#signUpError').show().html(error);
    $("#signUpModal").effect("shake");
}

function failedToAuth(){
    $("#signInModal").effect("shake");
}

function changeToSignout(){
    $('#signUpButton').hide();
    $('#profileLoaded').show();
    $('#nameBox').attr('disabled', 'disabled');
    $('#signInButton').click(function(){
        signOutUser();
    }).attr('data-toggle','').attr('class','btn btn-danger btn-lg').html('Sign out');
}
function changeToSignIn(){
    $('#signUpButton').show();
    $('#profileLoaded').hide();
    $('#nameBox').val('');
    $('#nameBox').removeAttr("disabled");
    $('#signInButton').click(function(){
        setTimeout(function() { $('#signInUser').focus() }, 500);
    }).attr('data-toggle','modal').attr('class','btn btn-info btn-lg').html('Sign in');
}

function signOutUser(){
    server.emit('signout');
}

function showGameOverScreen(cause){
    $('#gameCanvas').off("blur");
    $('#gameCanvas').fadeTo("slow",0.5,function(){
        $('#gameOverCause').html(cause);
        $('#gameOverMenu').show();
        $('#gameOverReturn').click(function(){
            resetGameVariables();
            server.emit('playerLeaveRoom');
            $('#gameOverMenu').hide();
            $('#gameCanvas').css('opacity', '1');
            $('#gameWindow').hide();
            $('#main').show();
            $('#space-footer').show();
        });
    });
}

function goFullScreen(){
    if(canvas.requestFullScreen)
        canvas.requestFullScreen();
    else if(canvas.webkitRequestFullScreen)
        canvas.webkitRequestFullScreen();
    else if(canvas.mozRequestFullScreen)
        canvas.mozRequestFullScreen();
}

function resetGameVariables(){
    clearInterval(timeOutChecker);
    //stopSound(gameStartMusic);
    //playSound(backgroundMusic);
    skipAuth = false;
    gameRunning = false;
    iAmAlive = true;
    iAmFiring = false;
    timeOutChecker = null;
    gameStarted = false;
    victory = false;
    gameRunning = true;
    shrinkTimeLeft = 60;
    lobbyTimeLeft = 0;
    toastTimer = null;
    toastMessage = null;
    totalPlayers = null;
    myShip = null;
    healthLastFrame = 100;
    moveForward = false;
    moveBackward = false;
    turnLeft = false;
    turnRight = false;
    timeSinceLastCom = 0;
    serverTimeoutWait = 5;
    world = null;
    asteroidList = {};
    itemList = {};
    planetList = {};
    playerList = {};
    bulletList = {};
    nebulaList = {};
    tradeShipList = {};
    shipList = {};
    canvas.removeEventListener("mousemove", calcMousePos, false);
    canvas.removeEventListener("mousedown", handleClick, false);
    canvas.addEventListener("mouseup", handleUnClick, false);
    canvas.removeEventListener('touchstart', onTouchStart, false);
    canvas.removeEventListener('touchend', onTouchEnd, false);
    canvas.removeEventListener('touchmove',onTouchMove, false);
    window.removeEventListener("keydown", keyDown, false);
    window.removeEventListener("keyup", keyUp, false);
    window.removeEventListener('contextmenu', function(ev) {
        ev.preventDefault();
        return false;
    }, false);
    $(window).off("blur");
    canvas = document.getElementById('gameCanvas');
    canvasContext = canvas.getContext('2d');
}

function enterLobby(name,color){
    $('#space-footer').hide();
    $('#gameWindow').show();
    $('#howToPlayMenu').show();
    clientSendStart(name,color);
    gameRunning = true;
    $('#main').hide();
    init();
}

function init(){
    timeOutChecker = setInterval(checkForTimeout,1000);
    animloop();
    canvas.addEventListener("mousemove", calcMousePos, false);
    canvas.addEventListener("mousedown", handleClick, false);
    canvas.addEventListener("mouseup", handleUnClick, false);
    canvas.addEventListener('touchstart', onTouchStart, false);
    canvas.addEventListener('touchend', onTouchEnd, false);
    canvas.addEventListener('touchmove', onTouchMove, false);
    window.addEventListener("keydown", keyDown, false);
    window.addEventListener("keyup", keyUp, false);
    window.addEventListener('contextmenu', function(ev) {
        ev.preventDefault();
        return false;
    }, false);

    $(window).blur(function(){
        cancelMovement();
    });

    resize();
}

function resize(){
    var viewport = {width:window.innerWidth,height:window.innerHeight};
    var scaleToFitX = viewport.width / canvas.width;
    var scaleToFitY = viewport.height / canvas.height;
    var currentScreenRatio = viewport.width/viewport.height;
    var optimalRatio = Math.min(scaleToFitX,scaleToFitY);

    if(currentScreenRatio >= 1.77 && currentScreenRatio <= 1.79){
        newWidth = viewport.width;
        newHeight = viewport.height;
    } else{
        newWidth = canvas.width * optimalRatio;
        newHeight = canvas.height * optimalRatio;
    }
    canvas.style.width = newWidth + "px";
    canvas.style.height = newHeight + "px";

    camera = {
        x : canvas.width/2,
        y : canvas.height/2,
        width : canvas.width,
        height : canvas.height,
        color : 'yellow',
        padding: -10,
        left: 0,
        right:0,
        top:0,
        bottom:0,
        xOffset: canvas.width/2,
        yOffset: canvas.height/2,

        centerOnObject : function(object){
           if(object == null){
                return;
           }
           xOffset =  object.x - (canvas.width/2);
           yOffset =  object.y - (canvas.height/2);
        },

        draw : function() {
            canvasContext.beginPath();
            canvasContext.strokeStyle = this.color;
            canvasContext.rect(this.padding,this.padding,this.width-this.padding*2,this.height-this.padding*2);
            canvasContext.stroke();
        },

        inBounds: function(object){
            if(object == null || object == undefined || myShip == null || myShip == undefined){
                return;
            }
            if (object.radius != null){
              var dx = Math.abs(object.x - myShip.x);
              var dy = Math.abs(object.y - myShip.y);

              if (dx > (this.xOffset - this.padding + object.radius)){ return false; }
              if (dy > (this.yOffset - this.padding + object.radius)){ return false; }

              if (dx <= (this.xOffset - this.padding)){
                return true; }
              if (dy <= (this.yOffset - this.padding)){
                return true; }

              var cornerDsq = Math.pow(dx - (this.xOffset - this.padding),2) + Math.pow(dy - (this.yOffset - this.padding),2);

              return (cornerDsq <= Math.pow(object.radius,2));
            }
            else {
              var leftBound = object.x + object.width >= myShip.x - this.xOffset + this.padding;
              var rightBound = object.x - object.width <= myShip.x - this.xOffset + this.width - this.padding;
              var topBound = object.y + object.width >= myShip.y - this.yOffset + this.padding;
              var bottomBound = object.y - object.width <= myShip.y - this.yOffset + this.height - this.padding;

              if(leftBound && rightBound && topBound && bottomBound){
                  return true;
              }
              return false;
            }


        },

        move : function(x,y){
            this.xOffset += x;
            this.yOffset += y;
        }
    }
    eventLog = {
        backgroundColor:'#2a2a2a',
        width:500,
        height:90,
        x: (canvas.width/2)-250,
        y: canvas.height-90,
        textColor:"white",
        textStyle:"17px Verdana",
        textSize:17,
        printList:[],
        listMax:4,
        textX: function(){
            return this.x+10;
        },
        textY:function(){
            return this.y+15;
        },
        addEvent:function(eventmsg){
            if(this.printList.length > this.listMax){
                this.printList.shift();
            }
            this.printList.push(eventmsg);
        }

    }
}

function animloop(){
    if(gameRunning){
        var now = Date.now();
    	dt = now - then;
        gameLoop();

    	then = now;
    	requestAnimFrame(animloop);
    }
}

function gameLoop(){
    recenterCamera();
    if(myShip == null){
        return;
    }
    if(iAmFiring){
        fireGun(mouseX,mouseY);
    }
    updateGameboard();
    drawFlashScreen();
    drawBackground();
    drawRelativeObjects();
    drawHUD();
    checkCooldown();
    checkForDamage()
}

function recenterCamera(){
    if(cameraBouncing){
        var currentTime = new Date();
        if(myShip == null){
            cameraCenterSeed = findAlivePlayerIndex();
        }
        if(lastCameraSwap == null){
            lastCameraSwap = new Date(currentTime);
            lastCameraSwap.setTime(lastCameraSwap.getTime() + recenterCameraTimeout*1000);
        }
        if(currentTime > lastCameraSwap){
            lastCameraSwap = new Date(currentTime);
            lastCameraSwap.setTime(lastCameraSwap.getTime() + recenterCameraTimeout*1000);
            cameraCenterSeed = findAlivePlayerIndex();
            
            cameraBouncingFirstPass = false;
        }
        if(cameraBouncingFirstPass){
            return;
        }
        myID = cameraCenterSeed;
    }
    if(myID != null && shipList != null && shipList[myID] != null){
        myShip = shipList[myID];
        camera.centerOnObject(myShip);
        camera.draw();
    }
}

function findAlivePlayerIndex(){
    var shipCountList = [], index;
    for(var i in shipList){
        if(shipList[i] != null && shipList[i] != undefined){
            shipCountList.push(shipList[i].id);
        }
    }

    index = getRandomInt(0,shipCountList.length-1);
    return shipCountList[index];
}

function cancelMovement(){
    turnLeft = false;
    turnRight = false;
    moveForward = false;
    moveBackward = false;
    server.emit('movement',{turnLeft:false,moveForward:false,turnRight:false,moveBackward:false});
}

function gameStart(){
    //stopSound(backgroundMusic);
    //playSound(gameStartMusic);
    $('#howToPlayMenu').hide();
}

function gameOver(){
    server.emit('movement',{turnLeft:false,moveForward:false,turnRight:false,moveBackward:false});
}

function checkCooldown(){
    cooldownRemaining = currentWeaponCooldown - (Date.now() - lastFired);
    if(cooldownRemaining <= 0){
        cooldownRemaining = 0;
    }
}

function checkForDamage(){
    if(myShip.health < healthLastFrame){
        playSound(takeDamage);
        drawFlashScreen();
    }
    healthLastFrame = myShip.health;
}

function calcMousePos(evt){
    evt.preventDefault();
    var rect = canvas.getBoundingClientRect();
    if(myShip != null){
        mouseX = (((evt.pageX - rect.left)/newWidth)*canvas.width)+ myShip.x - camera.xOffset;
        mouseY = (((evt.pageY - rect.top )/newHeight)*canvas.height) + myShip.y - camera.yOffset;
        server.emit('mousemove',{x:mouseX,y:mouseY});
    }
}

function handleClick(evt){
    if(!iAmFiring){
        iAmFiring = true;
    }
    evt.preventDefault();
}
function handleUnClick(evt){
    if(iAmFiring){
        iAmFiring = false;
    }
}

function fireGun(_x,_y){
    if(iAmAlive){
       server.emit("click",{x:_x,y:_y});
    }
}

function onTouchStart(evt){
    evt.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var touch = evt.changedTouches[0];
    var touchX = (((touch.pageX - rect.left)/newWidth)*canvas.width);
    var touchY = (((touch.pageY - rect.top )/newHeight)*canvas.height);

    if(touchX <= canvas.width/2){
        if(joystickMovement.touchIdx == null){
            joystickMovement.touchIdx = touch.identifier;
            joystickMovement.onDown(touchX,touchY);
        }
    }
    if(touchX >= canvas.width/2) {
        if(joystickCamera.touchIdx == null){
            joystickCamera.touchIdx = touch.identifier;
            joystickCamera.onDown(touchX,touchY);
        }
    }
}
function onTouchEnd(evt){
    var touchList = event.changedTouches;
    for(var i=0;i<touchList.length;i++){
        if(touchList[i].identifier == joystickMovement.touchIdx){
            joystickMovement.touchIdx = null;
            cancelMovement();
            joystickMovement.onUp();
            return;
        }
        if(touchList[i].identifier == joystickCamera.touchIdx){
            joystickCamera.touchIdx = null;

            joystickCamera.onUp();
            return;
        }
    }
}
function onTouchMove(evt){
    evt.preventDefault();
    var touchList = event.changedTouches;
    var rect = canvas.getBoundingClientRect();
    var touch, touchX,touchY;
    for(var i=0;i<touchList.length;i++){
        if(touchList[i].identifier  == joystickCamera.touchIdx){
            touch = touchList[i];
            touchX = (((touch.pageX - rect.left)/newWidth)*canvas.width);
            touchY = (((touch.pageY - rect.top )/newHeight)*canvas.height);
            joystickCamera.onMove(touchX,touchY);


            if(joystickCamera.checkForFire()){
                fireGun(joystickCamera.stickX + myShip.x - camera.xOffset,joystickCamera.stickY+ myShip.y - camera.yOffset);
            }

            server.emit('touchaim',{
                x1:joystickCamera.baseX,
                y1:joystickCamera.baseY,
                x2:joystickCamera.stickX,
                y2:joystickCamera.stickY
            });
        }
        if(touchList[i].identifier  == joystickMovement.touchIdx){
            touch = touchList[i];
            touchX = (((touch.pageX - rect.left)/newWidth)*canvas.width);
            touchY = (((touch.pageY - rect.top )/newHeight)*canvas.height);
            joystickMovement.onMove(touchX,touchY);
            touchMovement();
        }
    }
}

function touchMovement(){
    moveForward = joystickMovement.up();
    moveBackward = joystickMovement.down();
    turnRight = joystickMovement.right();
    turnLeft = joystickMovement.left();
    playThrust();
    server.emit('movement',{turnLeft:turnLeft,moveForward:moveForward,turnRight:turnRight,moveBackward:moveBackward});
}

function keyDown(evt){
    switch(evt.keyCode) {
        case 65: {turnLeft = true; break;} //Left key
        case 37: {turnLeft = true; break;} //Left key
        case 87: {moveForward = true; break;} //Up key
        case 38: {moveForward = true; break;} //Up key
        case 68: {turnRight = true; break;}//Right key
        case 39: {turnRight = true; break;}//Right key
        case 83: {moveBackward = true; break;} //Down key
        case 40: {moveBackward = true; break;} //Down key
    }
    playThrust();
    server.emit('movement',{turnLeft:turnLeft,moveForward:moveForward,turnRight:turnRight,moveBackward:moveBackward});
}

function keyUp(evt){
    switch(evt.keyCode) {
        case 65: {turnLeft = false; break;} //Left key
        case 37: {turnLeft = false; break;} //Left key
        case 87: {moveForward = false; break;} //Up key
        case 38: {moveForward = false; break;} //Up key
        case 68: {turnRight = false; break;}//Right key
        case 39: {turnRight = false; break;}//Right key
        case 83: {moveBackward = false; break;} //Down key
        case 40: {moveBackward = false; break;} //Down key
    }
    stopThrust();
    server.emit('movement',{turnLeft:turnLeft,moveForward:moveForward,turnRight:turnRight,moveBackward:moveBackward});
}
