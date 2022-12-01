import {COORDINATE_SYSTEM, LayerExtension, log, OPERATION} from '@deck.gl/core';
import collide from './shader-module';
import GL from '@luma.gl/constants';

import type {Layer, LayerContext} from '@deck.gl/core';

const defaultProps = {
  getCollidePriority: {type: 'accessor', value: 0},
  collideTestProps: {},
  collideGroup: {type: 'string', value: null}
};

export type CollideExtensionProps = {
  /**
   * Props to override when rendering collision map
   */
  collideTestProps?: {};

  /**
   * Collision group this layer belongs to. If it is not set, collision detection is disabled
   */
  collideGroup?: string;
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
    const {collideGroup} = this.props;
    const {drawToCollideMap, collideMaps = {}} = moduleParameters;
    const collideGroups = Object.keys(collideMaps);
    uniforms.collide_enabled = collideGroup && collideGroups.includes(collideGroup);

    if (drawToCollideMap) {
      uniforms.collide_sort = 'getCollidePriority' in this.props;
      uniforms.collide_texture = moduleParameters.dummyCollideMap;
      if (!uniforms.collide_texture) {
        console.log('No collide texture when drawing to collide map');
      } else if (uniforms.collide_texture.width !== 1) {
        console.log('Incorrect collide texture when drawing to collide map');
      }

      // Override any props with those defined in collideTestProps
      // @ts-ignore
      this.props = this.clone(this.props.collideTestProps).props;
    } else {
      uniforms.collide_sort = false;
      uniforms.collide_texture = collideGroup && moduleParameters.collideMaps[collideGroup];
      if (!uniforms.collide_texture) {
        console.log('No collide texture when reading from collide map');
      } else if (uniforms.collide_texture.width === 1) {
        console.log('Incorrect collide texture when reading from collide map');
      }
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
