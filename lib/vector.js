function dotProduct(ax, ay, az, bx, by, bz) {
    return (ax * bx) + (ay * by) + (az * bz);
}

function crossProductX(ax, ay, az, bx, by, bz) {
    return (ay * bz) - (az * by);
}

function crossProductY(ax, ay, az, bx, by, bz) {
    return (az * bx) - (ax * bz);
}

function crossProductZ(ax, ay, az, bx, by, bz) {
    return (ax * by) - (ay * bx);
}

function vectorLength(x, y, z) {
    return Math.sqrt(dotProduct(x, y, z, x, y, z));
}

function unitVectorX(x, y, z) {
    return x / vectorLength(x, y, z);
}
function unitVectorY(x, y, z) {
    return y / vectorLength(x, y, z);
}
function unitVectorZ(x, y, z) {
    return z / vectorLength(x, y, z);
}

var vectorExports = [dotProduct, vectorLength, crossProductX, crossProductY, crossProductZ, unitVectorX, unitVectorY, unitVectorZ];
var ERROR = {
    NO_SUCH_VALUE: -10000,
}