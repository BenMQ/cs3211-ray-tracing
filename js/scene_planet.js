   var camera = [
      0,0,0,                     // x,y,z coordinates
      0,0,-1,                     // Direction normal vector
      45                         // field of view : example 45
   ];

   var lights = [
      2,                         // number of lights
      200,200,200, 0,1,0,        // light 1, x,y,z location, and rgb colour (green)
      100,100,100, 1,1,1,        // light 2, x,y,z location, and rgb colour (white)
   ];

   var objects = [
      3,                                                                             // number of objects
      ObjTyp.SPHERE,      13, 1.0,0.0,0.0,0.2,0.7,0.1,1.0, -4,0,-20,0.2,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
      ObjTyp.SPHERE,      13, 0.0,0.0,1.0,0.2,0.7,0.1,1.0, 0,0,-15,0.1,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
      ObjTyp.SPHERE,      13, 1.0,0.0,1.0,0.2,0.7,0.1,1.0, 0,0,-20,3,            // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,

   ]