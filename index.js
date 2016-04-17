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
