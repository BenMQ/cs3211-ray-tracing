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

// Calculate the distance from the source of a ray to its intersection with a sphere
//   center x/y/z is the center of the sphere
//   radius is the radius of the sphere
//   source x/y/z is the source of the ray
//   ray x/y/z is the direction of the ray
// Return the distance between source to the point of intersection, or the last argument
// of no intersection is found.
function sphereIntersection(centerx, centery, centerz, radius, sourcex, sourcey, sourcez, rayx, rayy, rayz, ERROR_NO_SUCH_VALUE) {
    var sourceToCenterX = centerx - sourcex;
    var sourceToCenterY = centery - sourcey;
    var sourceToCenterZ = centerz - sourcez;
    var v = dotProduct(sourceToCenterX, sourceToCenterY, sourceToCenterZ, rayx, rayy, rayz);
    var eoDot = dotProduct(sourceToCenterX, sourceToCenterY, sourceToCenterZ, sourceToCenterX, sourceToCenterY, sourceToCenterZ);
    var discriminant = (radius * radius) - eoDot + (v * v);
    if (discriminant < 0) {
        return ERROR_NO_SUCH_VALUE;
    } else {
        return v - Math.sqrt(discriminant);
    }
}
gpu.addFunction(sphereIntersection);

// import vector math library
for (var i = 0; i < vectorExports.length; i ++) {
    gpu.addFunction(vectorExports[i]);
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
            PI: Math.PI, ERROR_NO_SUCH_VALUE: ERROR.NO_SUCH_VALUE
        },
        mode: mode,
    };

    var y = gpu.createKernel(function(Camera,Lights,Objects,Options) {
        var length = 0;

		var antiAliasingX = Options[0];
		var antiAliasingY = Options[1];
		
		// eyeVector is a unit vector that represents the direction of the camera
        var eyeVectorX = Camera[3];
        var eyeVectorY = Camera[4];
        var eyeVectorZ = Camera[5];
        length = vectorLength(eyeVectorX, eyeVectorY, eyeVectorZ);
        eyeVectorX = eyeVectorX / length;
        eyeVectorY = eyeVectorY / length;
        eyeVectorZ = eyeVectorZ / length;


        // vpRight is the unit vector that points to the right of the camera
        var vpRightX = crossProductX(eyeVectorX, eyeVectorY, eyeVectorZ, 0, 1, 0);
        var vpRightY = crossProductY(eyeVectorX, eyeVectorY, eyeVectorZ, 0, 1, 0);
        var vpRightZ = crossProductZ(eyeVectorX, eyeVectorY, eyeVectorZ, 0, 1, 0);
        length = vectorLength(vpRightX, vpRightY, vpRightZ);
        vpRightX = vpRightX / length;
        vpRightY = vpRightY / length;
        vpRightZ = vpRightZ / length;

		// vpUp is the unit vector that points upwards at the camera
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
		var supersamplingWidth = pixelWidth / antiAliasingX;
        var pixelHeight = cameraheight / (this.dimensions.y - 1);
		var supersamplingHeight = pixelHeight / antiAliasingY;

		var xSuperSamplingOffset = 0;
		var ySuperSamplingOffset = 0;
		
		// mix stores the RGB color of all sampled points within a pixel when performing super sampling.
		var mixR = 0;
		var mixG = 0;
		var mixB = 0;
		// super sampling anti-aliasing.
		// Note that in theory, this should be done in parallel (e.g. each thread handle one sample ray)
		// but due to how gpu.js compiles and converts result between js and WebGL, this is much faster 
		while (xSuperSamplingOffset < antiAliasingX) {
			ySuperSamplingOffset = 0;
			while (ySuperSamplingOffset < antiAliasingY) {
				// here we compute the source of the ray that goes out from the view point (viewX/Y/Z)
				// as well as the direction (rayX/Y/Z)
				var viewX = Camera[0];
				var viewY = Camera[1];
				var viewZ = Camera[2];
				
				var xdist = (this.thread.x - 0.5) * pixelWidth - halfWidth + supersamplingWidth * (0.5 + xSuperSamplingOffset);
				var ydist = (this.thread.y - 0.5) * pixelHeight - halfHeight + supersamplingHeight * (0.5 + ySuperSamplingOffset);
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
				rayX = rayX / length;
				rayY = rayY / length;
				rayZ = rayZ / length;

				// maximum level of reflection of light.
				var remaining = 3;
				// for each level of reflection, store their RGB value and specular coefficient separately
				// since we do not have a stack for recursive function call.
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
				// terminate the loop early if either the light goes infinitely without hitting any object,
				// or if the object has a specular coefficient of zero.
				var goesIntoBackground = 0;
				var isSpecular = 1;
				while (remaining > 0 && goesIntoBackground == 0 && isSpecular == 1) {
					remaining = remaining - 1;
					var idx = 1;                                     // index for looking through all the objects
					var nextidx = 1;
					// gpu.js does not support Infinity value, so use a separate flag instead.
					var minDistIsInfinity = 1;
					var minDist = -1;  
					var minIdx = -1; // idx of the object that intersect with the ray

					for (var i=0; i<this.constants.OBJCOUNT; i++ ) {     // Look at all object records
						idx = nextidx;                               // Skip to next record
						nextidx = Objects[idx+1]+idx;                // Pre-compute the beginning of the next record
						if (Objects[idx] == this.constants.SPHERE) { // i.e. if it is a SPHERE... 
							// For each object, check if the ray intersects with it.
							// Keep track of the object that is closest to the camera.
							var distance = sphereIntersection(
								Objects[idx+9], Objects[idx+10], Objects[idx+11],
								Objects[idx+12],
								viewX, viewY, viewZ,
								rayX, rayY, rayZ, this.constants.ERROR_NO_SUCH_VALUE);
							if ((minDistIsInfinity == 1 || distance < minDist) && distance != this.constants.ERROR_NO_SUCH_VALUE && distance > 0 ){
								minDist = distance;
								minIdx = idx;
								minDistIsInfinity = 0;
							}
						} else {
							// other shapes not implemented!
						}
					}
					if (minDist >= 0) {
						goesIntoBackground = 0;
						// pointAtTime is the point of intersection on the object.
						var pointAtTimeX = viewX + rayX * minDist;
						var pointAtTimeY = viewY + rayY * minDist;
						var pointAtTimeZ = viewZ + rayZ * minDist;
						// compute the normal vector on the surface of the object.
						var normalX = pointAtTimeX - Objects[minIdx+9];
						var normalY = pointAtTimeY - Objects[minIdx+10];
						var normalZ = pointAtTimeZ - Objects[minIdx+11];
						length = vectorLength(normalX, normalY, normalZ);
						normalX = normalX / length;
						normalY = normalY / length;
						normalZ = normalZ / length;

						// base is the ambient color of the object
						var baser = Objects[minIdx+2];
						var baseg = Objects[minIdx+3];
						var baseb = Objects[minIdx+4];
						// lambert is the coefficient for Lambertian reflectance
						var lambertR = 0;
						var lambertG = 0;
						var lambertB = 0;
						
						// Compute the color due to lambertian reflectance 
						if (Objects[minIdx+6] > 0) {
							for (var j=0; j<this.constants.LIGHTCOUNT; j++ ) {     // Look at all light records
								// To check if a light source is visible on the object surface is similar to ray/object intersection. 
								// build a ray towards light source from the current point of intersection,
								// and check if the ray can reach the light source.
								var lightrayX = pointAtTimeX - Lights[j*6+1];
								var lightrayY = pointAtTimeY - Lights[j*6+2];
								var lightrayZ = pointAtTimeZ - Lights[j*6+3];
								length = vectorLength(lightrayX, lightrayY, lightrayZ);
								lightrayX = lightrayX / length;
								lightrayY = lightrayY / length;
								lightrayZ = lightrayZ / length;
								var minDistIsInfinity1 = 1;
								var minDist1 = -1;  
								var minIdx1 = -1;
								var nextidx1 = 1;
								var idx1 = 1;
								for (var k=0; k<this.constants.OBJCOUNT; k++ ) {
									idx1 = nextidx1;
									nextidx1 = Objects[idx1+1]+idx1;
									if (Objects[idx1] == this.constants.SPHERE) {
										var distance = sphereIntersection(
											Objects[idx1+9], Objects[idx1+10], Objects[idx1+11],
											Objects[idx1+12],
											Lights[j*6+1], Lights[j*6+2], Lights[j*6+3],
											lightrayX, lightrayY, lightrayZ, this.constants.ERROR_NO_SUCH_VALUE);
										if ((minDistIsInfinity1 == 1 || distance < minDist1) && distance > 0 && distance != this.constants.ERROR_NO_SUCH_VALUE) {
											minDist1 = distance;
											minIdx1 = idx1;
											minDistIsInfinity1 = 0;
										}
									}
								}
								// If the light is visible...
								if (minDistIsInfinity1 == 1 || Math.abs(minDist1 - length) <= 0.005 ) {
									lightrayX =  Lights[j*6+1] - pointAtTimeX;
									lightrayY =  Lights[j*6+2] - pointAtTimeY;
									lightrayZ =  Lights[j*6+3] - pointAtTimeZ;
									length = vectorLength(lightrayX, lightrayY, lightrayZ);
									lightrayX = lightrayX / length;
									lightrayY = lightrayY / length;
									lightrayZ = lightrayZ / length;
									// compute the diffuse lighting amount. A light landing at 90 degress give a contribution of 1.
									var contribution = dotProduct(lightrayX, lightrayY, lightrayZ, normalX, normalY, normalZ);
									if (contribution > 0) {
										lambertR += contribution * Lights[j*6+4];
										lambertG += contribution * Lights[j*6+5];
										lambertB += contribution * Lights[j*6+6];
									}
								}
							}
						}
						lambertR = Math.min(1, lambertR);
						lambertG = Math.min(1, lambertG);
						lambertB = Math.min(1, lambertB);
						// At each reflection level, we compute the color due to ambient lighting 
						// as well as lambertian reflectance. Also store the specular coefficient.
						if (remaining == 0) {
							colorr0 = baser * (lambertR * Objects[minIdx+6] + Objects[minIdx+7]);
							colorg0 = baseg * (lambertG * Objects[minIdx+6] + Objects[minIdx+7]);
							colorb0 = baseb * (lambertB * Objects[minIdx+6] + Objects[minIdx+7]);
							specular0 = Objects[minIdx+5];
						}
						if (remaining == 1) {
							colorr1 = baser * (lambertR * Objects[minIdx+6] + Objects[minIdx+7]);
							colorg1 = baseg * (lambertG * Objects[minIdx+6] + Objects[minIdx+7]);
							colorb1 = baseb * (lambertB * Objects[minIdx+6] + Objects[minIdx+7]);
							specular1 = Objects[minIdx+5];
						}
						if (remaining == 2) {
							colorr2 = baser * (lambertR * Objects[minIdx+6] + Objects[minIdx+7]);
							colorg2 = baseg * (lambertG * Objects[minIdx+6] + Objects[minIdx+7]);
							colorb2 = baseb * (lambertB * Objects[minIdx+6] + Objects[minIdx+7]);
							specular2 = Objects[minIdx+5];
						}
						// Now reflect the incident ray to get the reflected ray and update the vectors.
						if (Objects[minIdx+5] > 0) {
							var tmp = dotProduct(rayX, rayY, rayZ, normalX, normalY, normalZ);
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
					}
				}
				// End of reflection loop.
				// By default, the background color is grey if the ray from camera never hit anything.
				if (goesIntoBackground == 1 && remaining == 2) {
					mixR = mixR + 0.95;
					mixG = mixG + 0.95;
					mixB = mixB + 0.95;
				} else {
					// Otherwise, compute the ambient+diffuse+specular color
					mixR = mixR + colorr2 + specular2 * (colorr1 + specular1 * colorr0); 
					mixG = mixG + colorg2 + specular2 * (colorg1 + specular1 * colorg0);
					mixB = mixB + colorb2 + specular2 * (colorb1 + specular1 * colorb0);
				}
				ySuperSamplingOffset = ySuperSamplingOffset + 1;
			}
			xSuperSamplingOffset = xSuperSamplingOffset + 1;
		}
		// At the end of supersampling, compute the average pixel color over all sampled rays
        mixR = mixR / antiAliasingX / antiAliasingY;
		mixG = mixG / antiAliasingX / antiAliasingY;
		mixB = mixB / antiAliasingX / antiAliasingY;
		this.color(mixR, mixG, mixB);
    }, opt);
    return y;
}

var options = [1,1];
var mykernel = doit("gpu");
var mycode   = doit("cpu");
gl = mykernel(camera,lights,objects,options);
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
        mycode(camera,lights,objects,options);
        var cv = document.getElementsByTagName("canvas")[0];
        var bdy = cv.parentNode;
        var newCanvas = mycode.getCanvas();
        bdy.replaceChild(newCanvas, cv);
    } else {
        mykernel(camera,lights,objects,options);
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
