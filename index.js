// This file is mainly setup code. For gpu.js code, go to ./js/main.js
$(function() {

var useGPU = 1;
var running = true;

var options = [1,1];
var mykernel = doit("gpu");
var mycode   = doit("cpu");
mykernel(camera,lights,objects,options);
var canvas = mykernel.getCanvas();
$('.container').append(canvas);

var f = document.querySelector("#fps");

$('.render-toggle').click(function() {
	$('.render-toggle').removeClass('active');
	$this = $(this).addClass('active');
	if ($this.text() == "GPU") {
		useGPU = 1;
	} else {
		useGPU = 0;
	}
});

$('#stop').click(function() {
	running = !running;
	if (running) {
		$(this).text("STOP");
		requestAnimationFrame(renderLoop);
	} else {
		$(this).text("Resume");
	}
});

$('.aa-toggle').click(function() {
	$('.aa-toggle').removeClass('active');
	$this = $(this).addClass('active');
	var txt = $this.text().slice(0, 2);
	if (txt == 'No') {
		options = [1, 1];
	} else if (txt == '2x') {
		options = [1, 2];
	} else if (txt == '4x') {
		options = [2, 2];
	} else if (txt == '8x') {
		options = [2, 4];
	}
});

var cameraHandler; // declared here to make it visible to clearInterval.
var panSpeed = 0.1;
var maxSpeed = 5;
$('.pan-toggle').mousedown(function(){
	panSpeed = 0.1;
    cameraHandler = setInterval(handlePan($(this).text()), 10);
}).mouseup(function() {
    clearInterval(cameraHandler);
}).mouseleave(function() {
    clearInterval(cameraHandler);
});

var defaultCamera = camera.slice(0, camera.length);

// compute camera direction
var length = 0;

// eyeVector is a unit vector that represents the direction of the camera
var eyeVectorX = camera[3];
var eyeVectorY = camera[4];
var eyeVectorZ = camera[5];
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

function handlePan(dir) {
    return function() {
		if (dir == "Left") {
			camera[0] -= vpRightX * panSpeed;
			camera[1] -= vpRightY * panSpeed;
			camera[2] -= vpRightZ * panSpeed;
			if (panSpeed < maxSpeed) {
				panSpeed *= 1.1;
			}
		} else if (dir == "Right") {
			camera[0] += vpRightX * panSpeed;
			camera[1] += vpRightY * panSpeed;
			camera[2] += vpRightZ * panSpeed;
			if (panSpeed < maxSpeed) {
				panSpeed *= 1.1;
			}
		} else if (dir == "Up") {
			camera[0] += vpUpX * panSpeed;
			camera[1] += vpUpY * panSpeed;
			camera[2] += vpUpZ * panSpeed;
			if (panSpeed < maxSpeed) {
				panSpeed *= 1.1;
			}
		} else if (dir == "Down") {
			camera[0] -= vpUpX * panSpeed;
			camera[1] -= vpUpY * panSpeed;
			camera[2] -= vpUpZ * panSpeed;
			if (panSpeed < maxSpeed) {
				panSpeed *= 1.1;
			}
		} else if (dir == "In") {
			camera[0] += eyeVectorX * panSpeed;
			camera[1] += eyeVectorY * panSpeed;
			camera[2] += eyeVectorZ * panSpeed;
			if (panSpeed < maxSpeed) {
				panSpeed *= 1.1;
			}
		} else if (dir == "Out") {
			camera[0] -= eyeVectorX * panSpeed;
			camera[1] -= eyeVectorY * panSpeed;
			camera[2] -= eyeVectorZ * panSpeed;
			if (panSpeed < maxSpeed) {
				panSpeed *= 1.1;
			}
		}
	}
}

$('#reset-camera').click(function() { camera = defaultCamera.slice(0, defaultCamera.length);});

var planet1 = 0,
    planet2 = 0;

function renderLoop() {
    f.innerHTML = fps.getFPS();
    if (useGPU === 0) {
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

});
