import picking from '../picking/picking';
import type {ShaderModule} from '../../types/types';

type CollideModuleSettings = {
  /** Set to true when rendering to off-screen "collision" buffer */
  drawToCollideMap?: boolean;
  /** Set to true when objects should be sorted by the collide_sort attribute */
  collideCollideSort?: boolean;
};

export default {
  name: 'collide-write',
  dependencies: [picking],
  vs: `
#ifdef NON_INSTANCED_MODEL
attribute float collidePriorities;
#else
attribute float instanceCollidePriorities;
#endif

uniform bool collide_uActive;
uniform bool collide_uCollideSort;
`,
  inject: {
    'vs:DECKGL_FILTER_GL_POSITION': `
    if (collide_uActive) {
      #ifdef NON_INSTANCED_MODEL
      float collidePriority = collidePriorities;
      #else
      float collidePriority = instanceCollidePriorities;
      #endif
      position.z = 0.001 * collidePriority * position.w; // Support range -1000 -> 1000
    }
  `
  },
  getUniforms: (opts = {}, context = {}) => {
    // @ts-ignore
    if ('viewport' in opts && opts.drawToCollideMap) {
      // @ts-ignore
      const collide_uActive = Boolean(opts.drawToCollideMap);
      return {collide_uActive: true};
    }
    return {};
  }
} as ShaderModule<CollideModuleSettings>;
