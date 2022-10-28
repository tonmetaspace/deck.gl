import {Texture2D} from '@luma.gl/core';
import {readPixelsToArray} from '@luma.gl/core';
import {equals} from '@math.gl/core';
import CollidePass from '../../passes/collide-pass';
import {OPERATION} from '../../lib/constants';
import {getMaskBounds, getMaskViewport} from './utils';
import log from '../../utils/log';

import type {Effect, PreRenderOptions} from '../../lib/effect';
import type Layer from '../../lib/layer';
import type Viewport from '../../viewports/viewport';
import type {MaskBounds} from './utils';
import type {CoordinateSystem} from '../../lib/constants';

type Collide = {
  bounds: MaskBounds;
  coordinateOrigin: [number, number, number];
  coordinateSystem: CoordinateSystem;
};

type Channel = {
  id: string;
  layers: Layer[];
  bounds?: MaskBounds;
  maskBounds?: MaskBounds;
  layerBounds: ([number[], number[]] | null)[];
  coordinateOrigin: [number, number, number];
  coordinateSystem: CoordinateSystem;
};

// Class to manage collide effect
export default class CollideEffect implements Effect {
  id = 'collide-effect';
  props = null;
  useInPicking = true;

  private dummyCollideMap?: Texture2D;
  private collide: Collide | null = null;
  private collidePass?: CollidePass;
  private collideMap?: Texture2D;
  private lastViewport?: Viewport;

  preRender(
    gl: WebGLRenderingContext,
    {layers, layerFilter, viewports, onViewportActive, views}: PreRenderOptions
  ): void {
    if (!this.dummyCollideMap) {
      this.dummyCollideMap = new Texture2D(gl, {
        width: 1,
        height: 1
      });
    }

    const maskLayers = layers.filter(
      l => l.props.visible && l.props.operation === OPERATION.COLLIDE
    );
    if (maskLayers.length === 0) {
      this.collide = null;
      return;
    }

    if (!this.collidePass) {
      this.collidePass = new CollidePass(gl, {id: 'default-mask'});
      this.collideMap = this.collidePass.collideMap;
    }

    // Map layers to channels
    const rootLayer = maskLayers[0].root;
    const channel = {
      id: 'collision-mask',
      coordinateOrigin: rootLayer.props.coordinateOrigin,
      coordinateSystem: rootLayer.props.coordinateSystem,
      layerBounds: maskLayers.map(l => l.getBounds()),
      layers: maskLayers
    };

    // TODO - support multiple views
    const viewport = viewports[0];
    const viewportChanged = !this.lastViewport || !this.lastViewport.equals(viewport);

    this._renderChannel(channel, {
      layerFilter,
      onViewportActive,
      views,
      viewport,
      viewportChanged
    });

    // Debug show FBO contents on screen
    if (true) {
      const color = readPixelsToArray(this.collideMap);
      let canvas = document.getElementById('fbo-canvas') as HTMLCanvasElement;
      const minimap = false;
      if (!canvas) {
        canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.id = 'fbo-canvas';
        canvas.width = this.collideMap.width;
        canvas.height = (minimap ? 2 : 1) * this.collideMap.height;
        canvas.style.zIndex = '100';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.right = '0';
        canvas.style.border = 'blue 1px solid';
        canvas.style.width = '256px';
        canvas.style.transform = 'scaleY(-1)';
        document.body.appendChild(canvas);
      }
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.createImageData(canvas.width, canvas.height);

      // Minimap
      if (minimap) {
        const zoom = 8; // Zoom factor for minimap
        const {width, height} = canvas;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const d = 4 * (x + y * width); // destination pixel
            const s = 4 * (Math.floor(x / zoom) + Math.floor(y / zoom) * width); // source
            imageData.data[d + 0] = color[s + 0];
            imageData.data[d + 1] = color[s + 1];
            imageData.data[d + 2] = color[s + 2];
            imageData.data[d + 3] = color[s + 3];
          }
        }
      }

      // Full map
      const offset = minimap ? color.length : 0;
      for (let i = 0; i < color.length; i += 4) {
        imageData.data[offset + i + 0] = color[i + 0];
        imageData.data[offset + i + 1] = color[i + 1];
        imageData.data[offset + i + 2] = color[i + 2];
        imageData.data[offset + i + 3] = color[i + 3];
      }

      ctx.putImageData(imageData, 0, 0);
    }
  }

  private _renderChannel(
    channelInfo: Channel,
    {
      layerFilter,
      onViewportActive,
      views,
      viewport,
      viewportChanged
    }: {
      layerFilter: PreRenderOptions['layerFilter'];
      onViewportActive: PreRenderOptions['onViewportActive'];
      views: PreRenderOptions['views'];
      viewport: Viewport;
      viewportChanged: boolean;
    }
  ) {
    // For now always rerender
    const maskChanged = true;

    // if (maskChanged || viewportChanged) {
    // Recalculate mask bounds
    this.lastViewport = viewport;

    channelInfo.bounds = getMaskBounds({layers: channelInfo.layers, viewport});

    if (maskChanged) {
      // Rerender mask FBO
      const {collidePass, collideMap} = this;

      const maskViewport = getMaskViewport({
        bounds: channelInfo.bounds,
        viewport,
        width: collideMap.width,
        height: collideMap.height
      });

      channelInfo.maskBounds = maskViewport ? maskViewport.getBounds() : [0, 0, 1, 1];

      // @ts-ignore (2532) This method is only called from preRender where collidePass is defined
      collidePass.render({
        pass: 'collide',
        layers: channelInfo.layers,
        layerFilter,
        viewports: maskViewport ? [maskViewport] : [],
        onViewportActive,
        views,
        moduleParameters: {
          devicePixelRatio: 1
        }
      });
    }
    //}

    if (channelInfo.maskBounds) {
      this.collide = {
        bounds: channelInfo.maskBounds,
        coordinateOrigin: channelInfo.coordinateOrigin,
        coordinateSystem: channelInfo.coordinateSystem
      };
    }
  }

  getModuleParameters(): {
    collideMap: Texture2D;
    collide: Collide | null;
  } {
    return {
      collideMap: this.collide ? this.collideMap : this.dummyCollideMap,
      collide: this.collide
    };
  }

  cleanup(): void {
    if (this.dummyCollideMap) {
      this.dummyCollideMap.delete();
      this.dummyCollideMap = undefined;
    }

    if (this.collidePass) {
      this.collidePass.delete();
      this.collidePass = undefined;
      this.collideMap = undefined;
    }

    this.lastViewport = undefined;
    this.collide = null;
  }
}
