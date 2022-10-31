import {COORDINATE_SYSTEM, LayerExtension, log} from '@deck.gl/core';
import collide from './shader-module';

import type {Layer} from '@deck.gl/core';

const defaultProps = {
  collideEnabled: true
};

export type CollideExtensionProps = {
  /**
   * Collission detection is disabled if `collideEnabled` is false.
   */
  collideEnabled?: boolean;
};

/** Allows layers to hide overlapping objects. */
export default class CollideExtension extends LayerExtension {
  static defaultProps = defaultProps;
  static extensionName = 'CollideExtension';

  getShaders(this: Layer<CollideExtensionProps>): any {
    return {
      modules: [collide]
    };
  }

  /* eslint-disable camelcase */
  draw(this: Layer<CollideExtensionProps>, {uniforms, context, moduleParameters}: any) {
    const {collideEnabled = true} = this.props;
    const {haveCollideLayers} = moduleParameters;
    if (haveCollideLayers && collideEnabled) {
      uniforms.collide_enabled = true;
    } else {
      uniforms.collide_enabled = false;
    }
  }
}
