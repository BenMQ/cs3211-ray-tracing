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

        var eyeVectorX = Camera[3];// - Camera[0];
        var eyeVectorY = Camera[4];// - Camera[1];
        var eyeVectorZ = Camera[5];// - Camera[2];
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
		var viewX = Camera[0];
		var viewY = Camera[1];
		var viewZ = Camera[2];
        length = vectorLength(rayX, rayY, rayZ);

        // ray is now a vector from camera for each pixel.
        rayX = rayX / length;
        rayY = rayY / length;
        rayZ = rayZ / length;
		var remaining = 3;
		var colorr0 = 0;
		var colorg0 = 0;
		var colorb0 = 0;
		var specular0 = 0;
		var colorr1 = 0;
		var colorg1 = 0;
		var colorb1 = 0;
		var specular1 = 0;
		var colorr2 = 0;
		var colorg2 = 0;
		var colorb2 = 0;
		var specular2 = 0;
		var goesIntoBackground = 0;
		var isSpecular = 1;
		while (remaining > 0 && goesIntoBackground == 0 && isSpecular == 1) {
			remaining = remaining - 1;
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
						viewX, viewY, viewZ,
						rayX, rayY, rayZ);
					if ((minDistIsInfinity == 1 || distance < minDist) && distance != -9981  && distance > 0 ){
						minDist = distance;
						minIdx = idx;
						minDistIsInfinity = 0;
					}
				}
			}
			if (minDist >= 0) {
				goesIntoBackground = 0;
				// var pointAtTime = Vector.add(ray.point, Vector.scale(ray.vector, dist));
				var pointAtTimeX = viewX + rayX * minDist;
				var pointAtTimeY = viewY + rayY * minDist;
				var pointAtTimeZ = viewZ + rayZ * minDist;
				var normalX = pointAtTimeX - Objects[minIdx+9];
				var normalY = pointAtTimeY - Objects[minIdx+10];
				var normalZ = pointAtTimeZ - Objects[minIdx+11];
				length = vectorLength(normalX, normalY, normalZ);
				normalX = normalX / length;
				normalY = normalY / length;
				normalZ = normalZ / length;

				var baser = Objects[minIdx+2];
				var baseg = Objects[minIdx+3];
				var baseb = Objects[minIdx+4];
				var lambertAmount = 0;
				
				if (Objects[minIdx+6] > 0) {

					for (var j=0; j<this.constants.LIGHTCOUNT; j++ ) {     // Look at all object records
						// idx = idx + 6;
						// var lightX = Lights[idx];
						// var lightY = Lights[idx+1];
						// var lightZ = Lights[idx+2];

						var lightrayX = pointAtTimeX - Lights[j*6+1];
						var lightrayY = pointAtTimeY - Lights[j*6+2];
						var lightrayZ = pointAtTimeZ - Lights[j*6+3];
						length = vectorLength(lightrayX, lightrayY, lightrayZ);
						lightrayX = lightrayX / length;
						lightrayY = lightrayY / length;
						lightrayZ = lightrayZ / length;
						var minDistIsInfinity1 = 1;
						var minDist1 = -1; // -1 for infinity
						var minIdx1 = -1;
						var nextidx1 = 1;
						var idx1 = 1;
						for (var k=0; k<this.constants.OBJCOUNT; k++ ) {
							idx1 = nextidx1;
							nextidx1 = Objects[idx1+1]+idx1;
							if (Objects[idx1] == this.constants.SPHERE) {
								// var centerx = Objects[idx+9];
								// var centery = Objects[idx+10];
								// var centerz = Objects[idx+11];
								// var radius = Objects[idx+12];
								
								var distance = sphereIntersection(
									Objects[idx1+9], Objects[idx1+10], Objects[idx1+11],
									Objects[idx1+12],
									Lights[j*6+1], Lights[j*6+2], Lights[j*6+3],
									lightrayX, lightrayY, lightrayZ);
								if ((minDistIsInfinity1 == 1 || distance < minDist1) && distance > 0 && distance != -9981) {
									minDist1 = distance;
									minIdx1 = idx1;
									minDistIsInfinity1 = 0;
								}
							}
						}
						if (minDistIsInfinity1 == 1 || Math.abs(minDist1 - length) <= 0.005 ) { // light visible
							//       var contribution = Vector.dotProduct(Vector.unitVector(
							// Vector.subtract(lightPoint, pointAtTime)), normal);
							lightrayX =  Lights[j*6+1] - pointAtTimeX;
							lightrayY =  Lights[j*6+2] - pointAtTimeY;
							lightrayZ =  Lights[j*6+3] - pointAtTimeZ;
							length = vectorLength(lightrayX, lightrayY, lightrayZ);
							lightrayX = lightrayX / length;
							lightrayY = lightrayY / length;
							lightrayZ = lightrayZ / length;
							var contribution = dotProduct(lightrayX, lightrayY, lightrayZ, normalX, normalY, normalZ);
							if (contribution > 0) {
								lambertAmount = lambertAmount + contribution;
							}
						}
					}
				}
				lambertAmount = Math.min(1, lambertAmount);
				if (remaining == 0) {
					colorr0 = baser * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]);
					colorg0 = baseg * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]);
					colorb0 = baseb * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]);
					specular0 = Objects[minIdx+5];
				}
				if (remaining == 1) {
					colorr1 = baser * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]);
					colorg1 = baseg * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]);
					colorb1 = baseb * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]);
					specular1 = Objects[minIdx+5];
				}
				if (remaining == 2) {
					colorr2 = baser * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]);
					colorg2 = baseg * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]);
					colorb2 = baseb * (lambertAmount * Objects[minIdx+6] + Objects[minIdx+7]);
					specular2 = Objects[minIdx+5];
				}
				if (Objects[minIdx+5] > 0) {
					var tmp = dotProduct(rayX, rayY, rayZ, normalX, normalY, normalZ);
					// reflect the incident ray and update the vectors.
					rayX = rayX - normalX * tmp * 2;
					rayY = rayY - normalY * tmp * 2;
					rayZ = rayZ - normalZ * tmp * 2;

					viewX = pointAtTimeX;
					viewY = pointAtTimeY;
					viewZ = pointAtTimeZ;
				} else {
					isSpecular = 0;
				}
			} else {
				goesIntoBackground = 1;
				//this.color(0.95,0.95,0.95);                      // By default canvas is light grey
			}
		}
		if (goesIntoBackground == 1 && remaining == 2) {
			// never hit anything
			this.color(0.95, 0.95, 0.95);
		} else {
			this.color(
				colorr2 + specular2 * (colorr1 + specular1 * colorr0), 
				colorg2 + specular2 * (colorg1 + specular1 * colorg0), 
				colorb2 + specular2 * (colorb1 + specular1 * colorb0)
			);
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
    planet1 += 0.025;
    planet2 += 0.05;

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
