function demo() {
	  var camera = [
      0,1,2,                     // x,y,z coordinates                                                                                   
      4,4,4,                     // Direction normal vector                                                                             
      45                         // field of view : example 45                                                                          
   ];

   var lights = [
      2,                         // number of lights                                                                                    
      200,200,200, 0,1,0,        // light 1, x,y,z location, and rgb colour (green)                                                     
      100,100,100, 1,1,1,        // light 2, x,y,z location, and rgb colour (white)                                                     
   ];

   var objects = [
      2,                                                                             // number of objects                               
      ObjTyp.SPHERE,      13, 1.0,0.0,0.0,0.2,0.7,0.1,1.0, 100,500,500,40,           // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,           
      ObjTyp.SPHERE,      13, 0.0,0.0,1.0,0.2,0.7,0.1,1.0, 200,600,200,20            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,            

   ];
   
   function animate(objects) {
	   
      objects[10] = (objects[10]+2) % 900;
      objects[24] = (objects[24]+2) % 700;
   }
   	return [camera, lights, objects, animate];

} 

function example() {
	var camera = [
		0,1.8,10,                     // x,y,z coordinates
		0,1.2,-10,                     // Direction normal vector
		45                         // field of view : example 45
	];

	var lights = [
		1,                         // number of lights
		-30,-10,20, 1,1,1,        // light 1, x,y,z location, and rgb colour (white)
	];

	var objects = [
		3,                                                                             // number of objects
		ObjTyp.SPHERE,      13, 0.605,0.605,0.605,/*spec*/0.1,0.9,0.0,1.0, -4,2,-1,0.2,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
		ObjTyp.SPHERE,      13, 1.0,1.0,1.0,      /*spec*/0.2,0.7,0.0,1.0, -4,3,-1,0.1,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
		ObjTyp.SPHERE,      13, 0.605,0.781,0.605,/*spec*/0.2,0.7,0.1,1.0, 0,3.5,-3,3,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,

	];
	
	var planet1 = 0,
		planet2 = 0;
		
	function animate(objects) {
		// make one planet spin a little bit faster than the other, just for
		// effect.
		planet1 += 0.025;
		planet2 += 0.05;
		objects[10] = Math.sin(planet1) * 3.5;
		objects[12] = -3 + (Math.cos(planet1) * 3.5);

		objects[23] = Math.sin(planet2) * 4;
		objects[25] = -3 + (Math.cos(planet2) * 4);
	}
	return [camera, lights, objects, animate];
} 

function two_lights() {
	var camera = [
	0,0,10,                     // x,y,z coordinates
	0,0,-10,                     // Direction normal vector
	45                         // field of view : example 45
	];

	var lights = [
		2,                         // number of lights
		-5,10,-2, 1,1,1,        // light 1, x,y,z location, and rgb colour (green)
		5,10,-2, 1,1,1,        // light 1, x,y,z location, and rgb colour (green)
	];

	var objects = [
		2,                                                                             // number of objects
		ObjTyp.SPHERE,      13, 1,1,1,/*spec*/0.2,0.4,0.4,1.0,  0,0,-10,3.5,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
		ObjTyp.SPHERE,      13, 1,0,0,/*spec*/0.0,0.7,0.4,1.0,  0,3,-5,1,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
	];

	return [camera, lights, objects];
}

function colored_lights() {
	var camera = [
	0,0,20,                     // x,y,z coordinates
	0,0,-1,                     // Direction normal vector
	45                         // field of view : example 45
	];

	var lights = [
		3,                         // number of lights
		10,0,10, 1,0,0,        // light 1, x,y,z location, and rgb colour (red)
		-7.07,7.07,10,0,0,1,        // light 1, x,y,z location, and rgb colour (blue)
		-7.07,-7.07,10,0,1,0,        // light 1, x,y,z location, and rgb colour (green)
	];

	var objects = [
		1,                                                                             // number of objects
		ObjTyp.SPHERE,      13, 1,1,1,/*spec*/0.2,0.6,0.2,1.0,  0,0,0,3.5,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
		
	];

	return [camera, lights, objects];
}


function bounces() {
	var camera = [
	0,-40,10,                     // x,y,z coordinates
	0,1,-0.2,                     // Direction normal vector
	45                         // field of view : example 45
	];

	var lights = [
		1,                         // number of lights
		0,-10,15, 1,1,1,        // light 1, x,y,z location, and rgb colour (green)
	];

	var objects = [
		6,                                                                             // number of objects
		ObjTyp.SPHERE,      13, 1,1,1,/*spec*/0.4,0.6,0.2,1.0,  0,0,0,3.5,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
		ObjTyp.SPHERE,      13, 1,0,1,/*spec*/0.4,0.7,0.2,1.0,  4,-5,2,1,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
		ObjTyp.SPHERE,      13, 1,1,0,/*spec*/0.4,0.7,0.2,1.0,  -2,-5,-2,1,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
		ObjTyp.SPHERE,      13, 1,0,0,/*spec*/0.4,0.7,0.2,1.0,  5,0,-4,1,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
		ObjTyp.SPHERE,      13, 0.3,0.3,0.6,/*spec*/0.4,0.7,0.2,1.0,  -5,0,0,1,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
		ObjTyp.SPHERE,      13, 1,1,1,/*spec*/0.05,0.1,0.2,1.0,  0,0,-505,500,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
	];

	return [camera, lights, objects];
}

var SAMPLE_SCENES = {
	'demo': demo,
	'example' : example,
	'two_lights' : two_lights,
	'bounces': bounces,
	'colored_lights': colored_lights,
}