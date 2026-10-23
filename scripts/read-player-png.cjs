// Read-only decoder for non-interlaced 8-bit RGB/RGBA PNGs; never rewrites image files.
const fs = require('node:fs');
const zlib = require('node:zlib');
exports.readPng = filename => {
  const file = fs.readFileSync(filename), chunks = [];
  const width = file.readUInt32BE(16), height = file.readUInt32BE(20);
  if (file[24] !== 8 || ![2, 6].includes(file[25]) || file[28] !== 0) throw Error('Expected non-interlaced RGB8 or RGBA8 PNG');
  const channels = file[25] === 6 ? 4 : 3;
  for (let at = 8; at < file.length;) {
    const length = file.readUInt32BE(at), type = file.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') chunks.push(file.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks)), stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  const paeth = (a,b,c) => { const p=a+b-c, pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c; };
  for (let y=0;y<height;y++) {
    const filter=raw[y*(stride+1)];
    for(let x=0;x<stride;x++) {
      const at=y*stride+x,a=x>=channels?pixels[at-channels]:0,b=y?pixels[at-stride]:0,c=y&&x>=channels?pixels[at-stride-channels]:0;
      const predict=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];
      if(predict===undefined) throw Error('Invalid PNG filter');
      pixels[at]=(raw[y*(stride+1)+x+1]+predict)&255;
    }
  }
  if (channels === 4) return {width,height,pixels};
  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index++) {
    pixels.copy(rgba, index * 4, index * 3, index * 3 + 3);
    rgba[index * 4 + 3] = 255;
  }
  return {width,height,pixels:rgba};
};
