// This file is mainly setup code. For gpu.js code, go to ./main.js
$(function() {

var useGPU = 1;
var running = true;


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

$('#scene-select').change(function() {
	changeScene($(this).val());
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


// compute camera direction
var scene_data=[];
var defaultCamera, precomputed;
// eyeVector is a unit vector that represents the direction of the camera
var eyeVectorX, eyeVectorY, eyeVectorZ;

// vpRight is the unit vector that points to the right of the camera
var vpRightX, vpRightY, vpRightZ;

// vpUp is the unit vector that points upwards at the camera
var vpUpX, vpUpY, vpUpZ;

// make a copy of default values 
var default_camera=camera.slice(0, camera.length);
var default_lights=lights.slice(0, lights.length);
var default_objects=objects.slice(0, objects.length);
changeScene('colored_lights');
function changeScene(val) {
	if (SAMPLE_SCENES[val]) {
		scene_data = SAMPLE_SCENES[val]();
				
		camera=scene_data[0].slice(0, scene_data[0].length);
		lights=scene_data[1].slice(0, scene_data[1].length);
		objects=scene_data[2].slice(0, scene_data[2].length);
	} else {
		scene_data = [];
		camera=default_camera.slice(0, default_camera.length);
		lights=default_lights.slice(0, default_lights.length);
		objects=default_objects.slice(0, default_objects.length);
	}	
	mykernel = doit("gpu");
	mycode   = doit("cpu");	
	defaultCamera = camera.slice(0, camera.length);

	precomputed = precompute(camera);
	// eyeVector is a unit vector that represents the direction of the camera
	eyeVectorX = precomputed[0];
	eyeVectorY = precomputed[1];
	eyeVectorZ = precomputed[2];


	// vpRight is the unit vector that points to the right of the camera
	vpRightX = precomputed[3];
	vpRightY = precomputed[4];
	vpRightZ = precomputed[5];

	// vpUp is the unit vector that points upwards at the camera
	vpUpX = precomputed[6];
	vpUpY = precomputed[7];
	vpUpZ = precomputed[8];
}


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


var options = [1,1];
var mykernel = doit("gpu");
var mycode   = doit("cpu");
mykernel(camera,lights,objects,options,precomputed);
var canvas = mykernel.getCanvas();
$('.container').append(canvas);
function renderLoop() {
    f.innerHTML = fps.getFPS();
    if (useGPU === 0) {
        mycode(camera,lights,objects,options,precomputed);
        var cv = document.getElementsByTagName("canvas")[0];
        var bdy = cv.parentNode;
        var newCanvas = mycode.getCanvas();
        bdy.replaceChild(newCanvas, cv);
    } else {
        mykernel(camera,lights,objects,options,precomputed);
        var cv = document.getElementsByTagName("canvas")[0];
        var bdy = cv.parentNode;
        var newCanvas = mykernel.getCanvas();
        bdy.replaceChild(newCanvas, cv);
    }
	if (scene_data[3]) {
		scene_data[3](objects);
	}

    // setTimeout(renderLoop,1);            // Uncomment this line, and comment the next line
    if (running) requestAnimationFrame(renderLoop);     // to see how fast this could run...
}

renderLoop();

});
