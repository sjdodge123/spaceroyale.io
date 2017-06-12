"use strict";

function circleOnCircle(circleA, circleB){
    var distsq = getDistanceSq(circleA.x, circleA.y, circleB.x, circleB.y);
    if (distsq <= Math.pow(circleA.radius + circleB.radius, 2)){
        return true;
    }
    return false;
}

function circleOnRect(circleA, rectB){
    var vertices = getRectVertices(rectB);

    if(pointInRect(circleA.x, circleA.y, vertices)){
        return true;
    }
    if(lineIntersectCircle(circleA, vertices[0], vertices[1]) ||
       lineIntersectCircle(circleA, vertices[1], vertices[2]) ||
       lineIntersectCircle(circleA, vertices[2], vertices[3]) ||
       lineIntersectCircle(circleA, vertices[3], vertices[0])){
        return true;
    }

    for (var i = 0; i < vertices.length; i++){
        var distsq = getDistanceSq(circleA.x, circleA.y, vertices[i].x, vertices[i].y);
        if (distsq < Math.pow(circleA.radius, 2)){
            return true;
        }
    }
    return false;
}

function rectOnRect(rectA, rectB){
    var verticesA = getRectVertices(rectA);
    var verticesB = getRectVertices(rectB);

    for (var i = 0; i < verticesA.length; i++){
        if(pointInRect(verticesA[i].x,verticesA[i].y,verticesB)){
            return true;
        }
    }
    for (var i = 0; i < verticesB.length; i++){
        if(pointInRect(verticesB[i].x,verticesB[i].y,verticesA)){
            return true;
        }
    }
    return false;
}
function getRectVertices(rect){
    var vertices = [];
    //set up relative vertices
    var a = {x:-rect.width/2, y: -rect.height/2},
        b = {x:rect.width/2, y: -rect.height/2},
        c = {x:rect.width/2, y: rect.height/2},
        d = {x:-rect.width/2, y: rect.height/2};
    vertices.push(a, b, c, d);
    var cos = Math.cos(rect.angle * Math.PI/180);
    var sin = Math.sin(rect.angle * Math.PI/180);

    var tempX, tempY;
    for (var i = 0; i < vertices.length; i++){
        var vert = vertices[i];
        tempX = vert.x * cos - vert.y * sin;
        tempY = vert.x * sin + vert.y * cos;
        vert.x = rect.x + tempX;
        vert.y = rect.y + tempY;
    }
    return vertices;
}

function pointInRect(x, y, vertices){
    var ap = {x:x-vertices[0].x,y:y-vertices[0].y};
    var ab = {x:vertices[1].x - vertices[0].x, y:vertices[1].y - vertices[0].y};
    var ad = {x:vertices[3].x - vertices[0].x, y:vertices[3].y - vertices[0].y};

	var dotW = dotProduct(ap, ab);
	var dotH = dotProduct(ap, ad);
	if ((0 <= dotW) && (dotW <= dotProduct(ab, ab)) && (0 <= dotH) && (dotH <= dotProduct(ad, ad))){
		return true;
	}
    return false;
}

function lineIntersectCircle(circle, a, b){

    var ap, ab, dirAB, magAB, projMag, perp, perpMag;
    ap = {x: circle.x - a.x, y: circle.y - a.y};
    ab = {x: b.x - a.x, y: b.y - a.y};
    magAB = Math.sqrt(dotProduct(ab,ab));
    dirAB = {x: ab.x/magAB, y: ab.y/magAB};

    projMag = dotProduct(ap, dirAB);

    perp = {x: ap.x - projMag*dirAB.x, y: ap.y - projMag*dirAB.y};
    perpMag = Math.sqrt(dotProduct(perp, perp));
    if ((0 < perpMag) && (perpMag < circle.radius) && (0 <  projMag) && (projMag < magAB)){
        return true;
    }
    return false;
}
function getDistance(x1, y1, x2, y2){
    return Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1, 2));
}

function getDistanceSq(x1, y1, x2, y2){
    return Math.pow(x2-x1,2) + Math.pow(y2-y1, 2);
}

function dotProduct(a, b){
    return a.x * b.x + a.y * b.y;
}
