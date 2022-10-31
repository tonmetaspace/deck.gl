import {Framebuffer, Texture2D, withParameters} from '@luma.gl/core';
import {OPERATION} from '../lib/constants';
import LayersPass from './layers-pass';

import type {LayersPassRenderOptions} from './layers-pass';

type CollidePassRenderOptions = LayersPassRenderOptions & {};

export default class CollidePass extends LayersPass {
  collideMap: Texture2D;
  fbo: Framebuffer;

  constructor(gl, props: {id: string; mapSize?: number}) {
    super(gl, props);

    // HACK!!! should match actual canvas size
    const {mapSize = 876} = props;

    this.collideMap = new Texture2D(gl, {
      width: mapSize,
      height: mapSize,
      parameters: {
        [gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
        [gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
        [gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
        [gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE
      }
    });

    this.fbo = new Framebuffer(gl, {
      id: 'collidemap',
      width: mapSize,
      height: mapSize,
      attachments: {
        [gl.COLOR_ATTACHMENT0]: this.collideMap
      }
    });
  }

  render(options: CollidePassRenderOptions) {
    const gl = this.gl;

    const colorMask = [true, true, true, true];

    return withParameters(
      gl,
      {
        clearColor: [0, 0, 0, 0],
        blend: false,
        colorMask,
        depthTest: false // TODO Perhaps true to allow correct sorting between layers (NEED DEPTH_ATTACHMENT!)
      },
      () => super.render({...options, target: this.fbo, pass: 'collide'})
    );
  }

  shouldDrawLayer(layer) {
    return layer.props.operation === OPERATION.COLLIDE;
  }

  getModuleParameters() {
    // Draw picking colors into collide FBO
    return {pickingActive: 1, pickingAttribute: false, lightSources: {}};
  }

  delete() {
    this.fbo.delete();
    this.collideMap.delete();
  }
}
