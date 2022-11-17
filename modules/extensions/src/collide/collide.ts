import {COORDINATE_SYSTEM, LayerExtension, log, OPERATION} from '@deck.gl/core';
import collide from './shader-module';
import GL from '@luma.gl/constants';

import type {Layer, LayerContext} from '@deck.gl/core';

const defaultProps = {
  getCollidePriority: {type: 'accessor', value: 0},
  collideEnabled: true,
  collideTestProps: {}
};

export type CollideExtensionProps = {
  /**
   * Collision detection is disabled if `collideEnabled` is false.
   */
  collideEnabled?: boolean;

  /**
   * Props to override when rendering collision map
   */
  collideTestProps?: {};
};

/** Allows layers to hide overlapping objects. */
export default class CollideExtension extends LayerExtension {
  static defaultProps = defaultProps;
  static extensionName = 'CollideExtension';

  getShaders(this: Layer<CollideExtensionProps>): any {
    return {modules: [collide]};
  }

  /* eslint-disable camelcase */
  draw(this: Layer<CollideExtensionProps>, {uniforms, context, moduleParameters}: any) {
    const {drawToCollideMap, haveCollideLayers} = moduleParameters;
    uniforms.collide_enabled = Boolean(haveCollideLayers);

    if (drawToCollideMap) {
      // To avoid feedback loop forming between Framebuffer and active Texture.
      uniforms.collide_texture = moduleParameters.dummyMap;
      uniforms.collide_sort = 'getCollidePriority' in this.props;

      // Override any props with those defined in collideTestProps
      this.props = {
        // @ts-ignore
        ...this.constructor.defaultProps,
        ...this.props,
        ...this.props.collideTestProps
      };
    } else {
      uniforms.collide_sort = false;
    }
  }

  initializeState(this: Layer<CollideExtensionProps>, context: LayerContext, extension: this) {
    const attributeManager = this.getAttributeManager();
    if (attributeManager && 'getCollidePriority' in this.props) {
      attributeManager.add({
        collidePriorities: {
          size: 1,
          accessor: 'getCollidePriority',
          shaderAttributes: {
            collidePriorities: {divisor: 0},
            instanceCollidePriorities: {divisor: 1}
          }
        }
      });
    }
  }
}
