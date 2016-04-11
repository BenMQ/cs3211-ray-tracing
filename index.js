window.onload = function() {

var selection = 1;

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

function sqr(x) {
   return x*x;
}
function dist(x1,y1,x2,y2) {
   return Math.sqrt( sqr(x2-x1)+sqr(y2-y1) );
}

// center x/y/z is the center of the sphere
// radius is the radius of the sphere
// source x/y/z is the source of the ray
// ray x/y/z is the direction of the ray
function sphereIntersection(centerx, centery, centerz, radius, sourcex, sourcey, sourcez, rayx, rayy, rayz) {
    function dot(ax, ay, az, bx, by, bz) {
        return (ax * bx) + (ay * by) + (az * bz);
    }
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
        return -1;
    } else {
        return v - Math.sqrt(discriminant);
    }
}

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

gpu.addFunction(sqr);
gpu.addFunction(dist);

for (var i = 0; i < vectorExports.length; i ++) {
    //console.log(vectorExports[i]);
    gpu.addFunction(vectorExports[i]);
}

function doit(mode) {
    var opt = {
        dimensions: [800,600],
        debug: true,
        graphical: true,
        safeTextureReadHack: false,
        constants: { OBJCOUNT: objects[0],
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
        this.color(0.95,0.95,0.95);                      // By default canvas is light grey
        var minDist = -1; // -1 for infinity
        var minIdx = -1; // idx of the object that intersect with the ray

        for (i=0; i<this.constants.OBJCOUNT; i++ ) {     // Look at all object records
            idx = nextidx;                               // Skip to next record
            nextidx = Objects[idx+1]+idx;                // Pre-compute the beginning of the next record
            if (Objects[idx] == this.constants.SPHERE) { // i.e. if it is a SPHERE...
                var centerx = Objects[idx+9];
                var centery = Objects[idx+10];
                var centerz = Objects[idx+11];
                var radius = Objects[idx+12];
                var distance = sphereIntersection(centerx, centery, centerz, radius, Camera[0], Camera[1], Camera[2], rayX, rayY, rayZ);
                if (minDist < 0 || distance < minDist && distance >= 0) {
                    minDist = distance;
                    minIdx = idx;
                }
            }
        }
        if (minDist >= 0) {
            this.color(Objects[minIdx+2],Objects[minIdx+3],Objects[minIdx+4]);
        }
    }, opt);
    return y;
}

var mykernel = doit("gpu");
var mycode   = doit("cpu");
gl = mykernel(camera,lights,objects);
// return ;
var canvas = mykernel.getCanvas();
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
    planet1 += 0.05;
    planet2 += 0.2;

    // set the position of each moon with some trig.
    objects[10] = - Math.cos(planet1) * 4;
    objects[12] = Math.sin(planet1) * 4 -20;

    // objects[22] = Math.sin(planet2) * 4;
    // objects[24] = -3 + (Math.cos(planet2) * 4);

    // setTimeout(renderLoop,1);            // Uncomment this line, and comment the next line
    if (running) requestAnimationFrame(renderLoop);     // to see how fast this could run...
}

renderLoop();

}
