import {project} from '@deck.gl/core';
import type {_ShaderModule as ShaderModule} from '@deck.gl/core';
import type {Texture2D} from '@luma.gl/webgl';

const vs = `
#ifdef NON_INSTANCED_MODEL
attribute float collidePriorities;
#else
attribute float instanceCollidePriorities;
#endif

uniform bool collide_sort;

vec2 collide_getCoords(vec4 position) {
  vec4 collide_clipspace = project_common_position_to_clipspace(position);
  return (1.0 + collide_clipspace.xy / collide_clipspace.w) / 2.0;
}
`;

const fs = `
uniform sampler2D collide_texture;
uniform bool collide_enabled;
uniform vec2 project_uViewportSize;

float collide_match(vec2 tex, vec3 pickingColor) {
  vec4 collide_pickingColor = texture2D(collide_texture, tex);
  float delta = dot(abs(collide_pickingColor.rgb - pickingColor), vec3(1.0));
  float e = 0.001;
  return step(delta, e);
}

float collide_isInBounds(vec2 texCoords, vec3 pickingColor) {
  if (!collide_enabled) {
    return 1.0;
  }

  // Visibility test, sample area of 5x5 pixels in order to fade in/out.
  // Due to the locality, the lookups will be cached
  // This reduces the flicker present when objects are shown/hidden
  const int N = 2;
  float accumulator = 0.0;
  vec2 step = vec2(1.0 / project_uViewportSize);

  const float floatN = float(N);
  vec2 delta = -floatN * step;
  for(int i = -N; i <= N; i++) {
    delta.x = -step.x * floatN;
    for(int j = -N; j <= N; j++) {
      accumulator += collide_match(texCoords + delta, pickingColor);
      delta.x += step.x;
    }
    delta.y += step.y;
  }

  float W = 2.0 * floatN + 1.0;
  return pow(accumulator / (W * W), 2.2);
}
`;

const inject = {
  'vs:#decl': `
varying vec2 collide_texCoords;
varying vec3 collide_pickingColor;
`,
  'vs:#main-end': `
   vec4 collide_common_position = project_position(vec4(geometry.worldPosition, 1.0));
   collide_texCoords = collide_getCoords(collide_common_position);
   collide_pickingColor = geometry.pickingColor / 255.0;
`,
  'vs:DECKGL_FILTER_GL_POSITION': `
   if (collide_sort) {
     #ifdef NON_INSTANCED_MODEL
     float collidePriority = collidePriorities;
     #else
     float collidePriority = instanceCollidePriorities;
     #endif
     position.z = -0.001 * collidePriority * position.w; // Support range -1000 -> 1000
   }
  `,
  'fs:#decl': `
varying vec2 collide_texCoords;
varying vec3 collide_pickingColor;
`,
  'fs:#main-end': `
  if (collide_enabled) {
    float collide_visible = collide_isInBounds(collide_texCoords, collide_pickingColor);
    gl_FragColor.a *= collide_visible;
    if (collide_visible < 0.0001) discard;
  }
`
};

export default {
  name: 'collide',
  dependencies: [project],
  vs,
  fs,
  inject
} as ShaderModule;
