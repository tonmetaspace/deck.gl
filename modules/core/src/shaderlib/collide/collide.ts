import picking from '../picking/picking';
import type {ShaderModule} from '../../types/types';

export default {
  name: 'collide-write',
  dependencies: [picking],
  vs: `
#ifdef NON_INSTANCED_MODEL
attribute float collidePriorities;
#else
attribute float instanceCollidePriorities;
#endif

uniform bool collide_sort;
`,
  inject: {
    'vs:DECKGL_FILTER_GL_POSITION': `
    if (collide_sort) {
      #ifdef NON_INSTANCED_MODEL
      float collidePriority = collidePriorities;
      #else
      float collidePriority = instanceCollidePriorities;
      #endif
      position.z = 0.001 * collidePriority * position.w; // Support range -1000 -> 1000
    }
  `
  }
} as ShaderModule;
