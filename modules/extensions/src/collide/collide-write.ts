import {COORDINATE_SYSTEM, LayerExtension, log} from '@deck.gl/core';
import collide from './shader-module';
import GL from '@luma.gl/constants';

import type {Layer, LayerContext} from '@deck.gl/core';

const defaultProps = {
  getCollidePriority: {type: 'accessor', value: 0},
  collideEnabled: true
};

export type CollideWriteExtensionProps = {
  /**
   * Collision detection is disabled if `collideEnabled` is false.
   */
  collideEnabled?: boolean;
};

/** Allows layers to hide overlapping objects. */
export default class CollideWriteExtension extends LayerExtension {
  static defaultProps = defaultProps;
  static extensionName = 'CollideWriteExtension';

  initializeState(this: Layer<CollideWriteExtensionProps>, context: LayerContext, extension: this) {
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
