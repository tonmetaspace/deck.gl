import {COORDINATE_SYSTEM, LayerExtension, log} from '@deck.gl/core';
import mask from './shader-module';

import type {Layer} from '@deck.gl/core';

const defaultProps = {
  collideEnabled: true
};

export type CollideExtensionProps = {
  /**
   * Collission detection is disabled if `collideEnabled` is false.
   */
  collideEnabled?: boolean;
  /**
   * controls whether an object is clipped by its anchor (usually defined by an accessor called `getPosition`, e.g. icon, scatterplot) or by its geometry (e.g. path, polygon).
   * If not specified, it is automatically deduced from the layer.
   */
  // TODO remove!!
  maskByInstance?: boolean;
};

/** Allows layers to show/hide objects by a geofence. */
export default class CollideExtension extends LayerExtension {
  static defaultProps = defaultProps;
  static extensionName = 'CollideExtension';

  getShaders(this: Layer<CollideExtensionProps>): any {
    // Infer by geometry if 'maskByInstance' prop isn't explictly set
    let maskByInstance = 'instancePositions' in this.getAttributeManager()!.attributes;
    // Users can override by setting the `maskByInstance` prop
    if ('maskByInstance' in this.props) {
      maskByInstance = Boolean(this.props.maskByInstance);
    }
    this.state.maskByInstance = maskByInstance;

    return {
      modules: [mask]
    };
  }

  /* eslint-disable camelcase */
  draw(this: Layer<CollideExtensionProps>, {uniforms, context, moduleParameters}: any) {
    uniforms.mask_maskByInstance = this.state.maskByInstance;
    const {collideEnabled = true} = this.props;
    const {collide} = moduleParameters;
    const {viewport} = context;
    if (collide && collideEnabled) {
      const {index, bounds, coordinateOrigin: fromCoordinateOrigin} = collide;
      let {coordinateSystem: fromCoordinateSystem} = collide;
      uniforms.mask_enabled = true;
      uniforms.mask_channel = index;

      if (fromCoordinateSystem === COORDINATE_SYSTEM.DEFAULT) {
        fromCoordinateSystem = viewport.isGeospatial
          ? COORDINATE_SYSTEM.LNGLAT
          : COORDINATE_SYSTEM.CARTESIAN;
      }
      const opts = {modelMatrix: null, fromCoordinateOrigin, fromCoordinateSystem};
      const bl = this.projectPosition([bounds[0], bounds[1], 0], opts);
      const tr = this.projectPosition([bounds[2], bounds[3], 0], opts);
      uniforms.mask_bounds = [bl[0], bl[1], tr[0], tr[1]];
    } else {
      uniforms.mask_enabled = false;
    }
  }
}
