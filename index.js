window.onload = function() {

var selection = 0;

function change( el ) {
    if ( el.value === "Using CPU" ) {
        selection = 1;
        el.value = "Using GPU";
    } else {
        selection = 0;
        el.value = "Using CPU";
    }
}

var gpu = new GPU();

function dot(ax, ay, az, bx, by, bz) {
    return (ax * bx) + (ay * by) + (az * bz);
}
// center x/y/z is the center of the sphere
// radius is the radius of the sphere
// source x/y/z is the source of the ray
// ray x/y/z is the direction of the ray
function sphereIntersection(centerx, centery, centerz, radius, sourcex, sourcey, sourcez, rayx, rayy, rayz) {

    // var eye_to_center = Vector.subtract(sphere.point, ray.point)
    var eyeToCenterX = centerx - sourcex;
    var eyeToCenterY = centery - sourcey;
    var eyeToCenterZ = centerz - sourcez;
    // v = Vector.dotProduct(eye_to_center, ray.vector)
    var v = dot(eyeToCenterX, eyeToCenterY, eyeToCenterZ, rayx, rayy, rayz);
    // eoDot = Vector.dotProduct(eye_to_center, eye_to_center),
    var eoDot = dot(eyeToCenterX, eyeToCenterY, eyeToCenterZ, eyeToCenterX, eyeToCenterY, eyeToCenterZ);
    var discriminant = (radius * radius) - eoDot + (v * v);
    if (discriminant < 0) {
        return -9981;
    } else {
        return v - Math.sqrt(discriminant);
    }
}
for (var i = 0; i < vectorExports.length; i ++) {
    //console.log(vectorExports[i]);
    gpu.addFunction(vectorExports[i]);
}
gpu.addFunction(dot);

gpu.addFunction(sphereIntersection);

function sphereNormal(centerx, centery, centerz, posx, posy, posz) {
    var x = posx - centerx;
    var y = posy - centery;
    var z = posz - centerz;
    var length = vectorLength(x, y, z);
    x = x / length;
    y = y / length;
    z = z / length;
}

function doit(mode) {
    var opt = {
        dimensions: [800,600],
        debug: true,
        graphical: true,
        safeTextureReadHack: false,
        constants: { OBJCOUNT: objects[0], LIGHTCOUNT: lights[0],
            EMPTY: ObjTyp.EMPTY,    SPHERE: ObjTyp.SPHERE,   CUBOID: ObjTyp.CUBOID,
            CYLINDER: ObjTyp.CYLINDER,   CONE: ObjTyp.CONE,   TRIANGLE: ObjTyp.TRIANGLE,
            PI: Math.PI,
        },
        mode: mode,
    };

    var y = gpu.createKernel(function(Camera,Lights,Objects) {
        var length = 0;
        // var eyeVector = Vector.unitVector(Vector.subtract(cameraVector, cameraPos));

        var eyeVectorX = Camera[3] - Camera[0];
        var eyeVectorY = Camera[4] - Camera[1];
        var eyeVectorZ = Camera[5] - Camera[2];
        length = vectorLength(eyeVectorX, eyeVectorY, eyeVectorZ);

        eyeVectorX = eyeVectorX / length;
        eyeVectorY = eyeVectorY / length;
        eyeVectorZ = eyeVectorZ / length;


        // vpRight = Vector.unitVector(Vector.crossProduct(eyeVector, Vector.UP)),
        var vpRightX = crossProductX(eyeVectorX, eyeVectorY, eyeVectorZ, 0, 1, 0);
        var vpRightY = crossProductY(eyeVectorX, eyeVectorY, eyeVectorZ, 0, 1, 0);
        var vpRightZ = crossProductZ(eyeVectorX, eyeVectorY, eyeVectorZ, 0, 1, 0);
        length = vectorLength(vpRightX, vpRightY, vpRightZ);

        vpRightX = vpRightX / length;
        vpRightY = vpRightY / length;
        vpRightZ = vpRightZ / length;
        // vpUp = Vector.unitVector(Vector.crossProduct(vpRight, eyeVector)),

        var vpUpX = crossProductX(vpRightX, vpRightY, vpRightZ, eyeVectorX, eyeVectorY, eyeVectorZ);
        var vpUpY = crossProductY(vpRightX, vpRightY, vpRightZ, eyeVectorX, eyeVectorY, eyeVectorZ);
        var vpUpZ = crossProductZ(vpRightX, vpRightY, vpRightZ, eyeVectorX, eyeVectorY, eyeVectorZ);
        length = vectorLength(vpUpX, vpUpY, vpUpZ);

        vpUpX = vpUpX / length;
        vpUpY = vpUpY / length;
        vpUpZ = vpUpZ / length;

        // Camera[6] is fov.
        var fov = Camera[6];
        var fovRadians = this.constants.PI * (fov / 2) / 180;
        var heightWidthRatio = this.dimensions.y / this.dimensions.x;
        var halfWidth = Math.tan(fovRadians);
        var halfHeight = heightWidthRatio * halfWidth;
        var camerawidth = halfWidth * 2;
        var cameraheight = halfHeight * 2;
        var pixelWidth = camerawidth / (this.dimensions.x - 1);
        var pixelHeight = cameraheight / (this.dimensions.y - 1);

        // var xcomp = Vector.scale(vpRight, (x * pixelWidth) - halfWidth),
        //     ycomp = Vector.scale(vpUp, (y * pixelHeight) - halfHeight);
        var xdist = this.thread.x * pixelWidth - halfWidth;
        var ydist = this.thread.y * pixelHeight - halfHeight;
        var xcompX = vpRightX * xdist;
        var xcompY = vpRightY * xdist;
        var xcompZ = vpRightZ * xdist;

        var ycompX = vpUpX * ydist;
        var ycompY = vpUpY * ydist;
        var ycompZ = vpUpZ * ydist;

        var rayX = eyeVectorX + xcompX + ycompX;
        var rayY = eyeVectorY + xcompY + ycompY;
        var rayZ = eyeVectorZ + xcompZ + ycompZ;

        length = vectorLength(rayX, rayY, rayZ);

        // ray is now a vector from camera for each pixel.
        rayX = rayX / length;
        rayY = rayY / length;
        rayZ = rayZ / length;

        // if (this.thread.z == 0) {
        //     return rayX;
        // } else if (this.thread.z == 1) {
        //     return rayY;
        // } else {
        //     return rayZ;
        // }
        var idx = 1;                                     // index for looking through all the objects
        var nextidx = 1;
		var minDistIsInfinity = 1;
        var minDist = -1; // -1 for infinity
        var minIdx = -1; // idx of the object that intersect with the ray

        for (var i=0; i<this.constants.OBJCOUNT; i++ ) {     // Look at all object records
            idx = nextidx;                               // Skip to next record
            nextidx = Objects[idx+1]+idx;                // Pre-compute the beginning of the next record
            if (Objects[idx] == this.constants.SPHERE) { // i.e. if it is a SPHERE...
                // var centerx = Objects[idx+9];
                // var centery = Objects[idx+10];
                // var centerz = Objects[idx+11];
                // var radius = Objects[idx+12];
                var distance = sphereIntersection(
                    Objects[idx+9], Objects[idx+10], Objects[idx+11],
                    Objects[idx+12],
                    Camera[0], Camera[1], Camera[2],
                    rayX, rayY, rayZ);
                if ((minDistIsInfinity == 1 || distance < minDist) && distance != -9981 ){
                    minDist = distance;
                    minIdx = idx;
					minDistIsInfinity = 0;
                }
            }
        }
        if (minDist >= 0) {
            // var pointAtTime = Vector.add(ray.point, Vector.scale(ray.vector, dist));
            var pointAtTimeX = Camera[0] + rayX * minDist;
            var pointAtTimeY = Camera[1] + rayY * minDist;
            var pointAtTimeZ = Camera[2] + rayZ * minDist;
            var normalX = pointAtTimeX - Objects[minIdx+9];
            var normalY = pointAtTimeX - Objects[minIdx+10];
            var normalZ = pointAtTimeX - Objects[minIdx+11];
            length = vectorLength(normalX, normalY, normalZ);
            normalX = normalX / length;
            normalY = normalY / length;
            normalZ = normalZ / length;

            var baser =Objects[minIdx+2];
            var baseg =Objects[minIdx+3];
            var baseb =Objects[minIdx+4];
            var lambertAmount = 0;
            if (Objects[minIdx+6] > 0) {

                for (var j=0; j<this.constants.LIGHTCOUNT; j++ ) {     // Look at all object records
                    // idx = idx + 6;
                    // var lightX = Lights[idx];
                    // var lightY = Lights[idx+1];
                    // var lightZ = Lights[idx+2];

					rayX = pointAtTimeX - Lights[j*6+1];
					rayY = pointAtTimeY - Lights[j*6+2];
					rayZ = pointAtTimeZ - Lights[j*6+3];
					length = vectorLength(rayX, rayY, rayZ);
					rayX = rayX / length;
					rayY = rayY / length;
					rayZ = rayZ / length;
					minDistIsInfinity = 1;
                    minDist = -1; // -1 for infinity
                    minIdx = -1;
					nextidx = 1;
                    for (var k=0; k<this.constants.OBJCOUNT; k++ ) {
                        idx = nextidx;
                        nextidx = Objects[idx+1]+idx;
                        if (Objects[idx] == this.constants.SPHERE) {
                            // var centerx = Objects[idx+9];
                            // var centery = Objects[idx+10];
                            // var centerz = Objects[idx+11];
                            // var radius = Objects[idx+12];
                            
                            var distance = sphereIntersection(
                                Objects[idx+9], Objects[idx+10], Objects[idx+11],
                                Objects[idx+12],
                                pointAtTimeX, pointAtTimeY, pointAtTimeZ,
                                rayX, rayY, rayZ);
                            if ((minDistIsInfinity == 1 || distance < minDist) && distance != -9981) {
                                minDist = distance;
                                minIdx = idx;
								minDistIsInfinity = 0;
                            }
                        }
                    }
				if (minDistIsInfinity == 1 || minDist > -0.005 /*&& Math.abs(minDist) - Math.abs(length) > -0.005*/) { // light visible
                        //       var contribution = Vector.dotProduct(Vector.unitVector(
                        // Vector.subtract(lightPoint, pointAtTime)), normal);
                        rayX =  Lights[j*6+1] - pointAtTimeX;
                        rayY =  Lights[j*6+2] - pointAtTimeY;
                        rayZ =  Lights[j*6+3] - pointAtTimeZ;
                        length = vectorLength(rayX, rayY, rayZ);
                        rayX = rayX / length;
                        rayY = rayY / length;
                        rayZ = rayZ / length;
                        var contribution = dotProduct(rayX, rayY, rayZ, normalX, normalY, normalZ);
                        if (contribution > 0) {
                            lambertAmount = lambertAmount + contribution;
                        }
                    }
                }
            }
			
            lambertAmount = Math.min(1, lambertAmount);
            this.color(
                baser * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]),
                baseg * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]),
                baseb * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7])
                );
        } else {
            this.color(0.95,0.95,0.95);                      // By default canvas is light grey
        }
    }, opt);
    return y;
}

var mykernel = doit("gpu");
var mycode   = doit("cpu");
gl = mykernel(camera,lights,objects);
/* return ;
 */var canvas = mykernel.getCanvas();
document.getElementsByTagName('body')[0].appendChild(canvas);

var f = document.querySelector("#fps");
var toggle = document.querySelector("#toggleMode");
var stop = document.querySelector("#stop");
var running = true;

toggle.onclick = function() {return change(this)};

stop.onclick = function() {running = !running; return true};


var planet1 = 0,
    planet2 = 0;

function renderLoop() {
    f.innerHTML = fps.getFPS();
    if (selection === 0) {
        mycode(camera,lights,objects);
        var cv = document.getElementsByTagName("canvas")[0];
        var bdy = cv.parentNode;
        var newCanvas = mycode.getCanvas();
        bdy.replaceChild(newCanvas, cv);
    } else {
        mykernel(camera,lights,objects);
        var cv = document.getElementsByTagName("canvas")[0];
        var bdy = cv.parentNode;
        var newCanvas = mykernel.getCanvas();
        bdy.replaceChild(newCanvas, cv);
    }

    // make one planet spin a little bit faster than the other, just for
    // effect.
    planet1 += 0.1;
    planet2 += 0.2;

    // set the position of each moon with some trig.
    //objects[10] = - Math.cos(planet1) * 4;
    //objects[12] = Math.sin(planet1) * 4 -20;
    objects[10] = Math.sin(planet1) * 3.5;
    objects[12] = -3 + (Math.cos(planet1) * 3.5);

    objects[23] = Math.sin(planet2) * 4;
    objects[25] = -3 + (Math.cos(planet2) * 4);

    // setTimeout(renderLoop,1);            // Uncomment this line, and comment the next line
    if (running) requestAnimationFrame(renderLoop);     // to see how fast this could run...
}

renderLoop();

}
