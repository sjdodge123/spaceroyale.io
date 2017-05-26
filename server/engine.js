exports.broadBase = function(objectArray){
	for (var i = 0; i < objectArray.length; i++) {
  		for (var j = 0; j < objectArray.length; j++) {

    		if(objectArray[i] == objectArray[j]){
    		  continue;
    		}
    		var obj1 = objectArray[i],
    			obj2 = objectArray[j];

    		if(checkDistance(obj1,obj2)){
  				obj1.handleHit(obj2);
  				obj2.handleHit(obj1);
    		}
  		}
  	}
}

function checkDistance(obj1,obj2){
	var distance = Math.sqrt(Math.pow((obj2.x - obj1.x),2) + Math.pow((obj2.y - obj1.y),2));
  distance -= obj1.radius || obj1.width;
  distance -= obj2.radius || obj2.width;

	if(distance <= 0){
		return true;
	}
	return false;
}
