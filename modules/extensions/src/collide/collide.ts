import {COORDINATE_SYSTEM, LayerExtension, log, OPERATION} from '@deck.gl/core';
import collide from './shader-module';
import GL from '@luma.gl/constants';

import type {Layer, LayerContext} from '@deck.gl/core';

const defaultProps = {
  getCollidePriority: {type: 'accessor', value: 0},
  collideEnabled: true
};

export type CollideExtensionProps = {
  /**
   * Collision detection is disabled if `collideEnabled` is false.
   */
  collideEnabled?: boolean;
};

/** Allows layers to hide overlapping objects. */
export default class CollideExtension extends LayerExtension {
  static defaultProps = defaultProps;
  static extensionName = 'CollideExtension';

  getShaders(this: Layer<CollideExtensionProps>): any {
    const isWrite = this.props.operation === OPERATION.COLLIDE;
    return isWrite ? {} : {modules: [collide]};
  }

  /* eslint-disable camelcase */
  draw(this: Layer<CollideExtensionProps>, {uniforms, context, moduleParameters}: any) {
    const isWrite = moduleParameters.drawToCollideMap;
    if (isWrite) return;

    const {collideEnabled = true} = this.props;
    const {haveCollideLayers} = moduleParameters;
    if (haveCollideLayers && collideEnabled) {
      uniforms.collide_enabled = true;
    } else {
      uniforms.collide_enabled = false;
    }
  }

  initializeState(this: Layer<CollideExtensionProps>, context: LayerContext, extension: this) {
    const isWrite = this.props.operation === OPERATION.COLLIDE;
    if (!isWrite) return;

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
