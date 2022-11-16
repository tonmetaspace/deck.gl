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
uniform bool collide_uActive;
uniform bool collide_uCollideSort;
`,
  inject: {
    'vs:DECKGL_FILTER_GL_POSITION': `
    if (collide_uActive) {
      position.z = 0.01 * geometry.worldPosition.x;
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
