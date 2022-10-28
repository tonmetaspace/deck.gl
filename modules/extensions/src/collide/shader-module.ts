import {project} from '@deck.gl/core';
import type {_ShaderModule as ShaderModule} from '@deck.gl/core';
import type {Texture2D} from '@luma.gl/webgl';

const vs = `
uniform vec4 mask_bounds;
vec2 mask_getCoords(vec4 position) {
  return (position.xy - mask_bounds.xy) / (mask_bounds.zw - mask_bounds.xy);
}
`;

const fs = `
uniform sampler2D mask_texture;
uniform int mask_channel;
uniform bool mask_enabled;

float match(vec2 tex, vec3 pickingColor) {
  vec4 maskColor = texture2D(mask_texture, tex);
  float delta = distance(maskColor.rgb, pickingColor);
  float e = 0.000001;
  return step(delta, e);
}

float mask_isInBounds(vec2 texCoords, vec3 pickingColor) {
  if (!mask_enabled) {
    return 1.0;
  }

  float O = 0.0;
  vec2 dx = 2.0 * vec2(1.0 / 2048.0, 0.0);
  vec2 dy = dx.yx;
  // Visibility test

  vec2 dd = -2.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  dd = -1.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  dd = 0.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  dd = 1.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  dd = 2.0 * dy;
  O += match(texCoords + 2.0 * dx + dd, pickingColor);
  O += match(texCoords + dx + dd , pickingColor);
  O += match(texCoords + dd, pickingColor);
  O += match(texCoords - dx + dd, pickingColor);
  O += match(texCoords - 2.0 * dx + dd, pickingColor);

  O = O / 25.0;

  return pow(O, 2.2);


  // float maskValue = 1.0;
  // if (mask_channel == 0) {
  //   maskValue = maskColor.r;
  // } else if (mask_channel == 1) {
  //   maskValue = maskColor.g;
  // } else if (mask_channel == 2) {
  //   maskValue = maskColor.b;
  // } else if (mask_channel == 3) {
  //   maskValue = maskColor.a;
  // }
  // return maskValue < 0.5;
}
`;

const inject = {
  'vs:#decl': `
varying vec2 mask_texCoords;
`,
  'vs:#main-end': `
   vec4 mask_common_position = project_position(vec4(geometry.worldPosition, 1.0));
   mask_texCoords = mask_getCoords(mask_common_position);
`,
  'fs:#decl': `
varying vec2 mask_texCoords;
`,
  'fs:#main-end': `
  if (mask_enabled) {
    float mask = mask_isInBounds(mask_texCoords, vPickingColor);

    // Debug: show extent of render target
    // gl_FragColor = vec4(mask_texCoords, 0.0, 1.0);
    // gl_FragColor = texture2D(mask_texture, mask_texCoords);

    // Fade out mask
    gl_FragColor.a *= mask;

    if (mask < 0.01) discard;
  }
`
};

type MaskModuleSettings = {
  collideMap?: Texture2D;
};

/* eslint-disable camelcase */
const getMaskUniforms = (opts?: MaskModuleSettings | {}): Record<string, any> => {
  if (opts && 'collideMap' in opts) {
    return {
      mask_texture: opts.collideMap
    };
  }
  return {};
};

export default {
  name: 'mask',
  dependencies: [project],
  vs,
  fs,
  inject,
  getUniforms: getMaskUniforms
} as ShaderModule<MaskModuleSettings>;
