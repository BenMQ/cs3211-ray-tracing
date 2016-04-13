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

   ]