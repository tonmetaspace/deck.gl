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
    const {collideEnabled = true} = this.props;
    const {drawToCollideMap, haveCollideLayers} = moduleParameters;
    if (haveCollideLayers && collideEnabled) {
      uniforms.collide_enabled = true;
    } else {
      uniforms.collide_enabled = false;
    }

    if (drawToCollideMap) {
      this.props = {
        // @ts-ignore
        ...this.constructor.defaultProps,
        ...this.props,
        ...this.props.collideTestProps
      };
    }
  }

  initializeState(this: Layer<CollideExtensionProps>, context: LayerContext, extension: this) {
    // TODO disable in normal render
    const attributeManager = this.getAttributeManager();
    if (attributeManager) {
      attributeManager.add({
        collidePriorities: {
          size: 1,
          type: GL.FLOAT,
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
