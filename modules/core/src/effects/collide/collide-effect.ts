import {Texture2D} from '@luma.gl/core';
import {readPixelsToArray} from '@luma.gl/core';
import {equals} from '@math.gl/core';
import CollidePass from '../../passes/collide-pass';
import {OPERATION} from '../../lib/constants';
import log from '../../utils/log';

import type {Effect, PreRenderOptions} from '../../lib/effect';
import type Layer from '../../lib/layer';
import type Viewport from '../../viewports/viewport';
import type {CoordinateSystem} from '../../lib/constants';

type Channel = {
  id: string;
  layers: Layer[];
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
  private oldChannelInfo: Channel | null = null;
  private haveCollideLayers: Boolean = false;
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
      this.haveCollideLayers = false;
      this.oldChannelInfo = null;
      return;
    }
    this.haveCollideLayers = true;

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
    if (!this.oldChannelInfo) {
      this.oldChannelInfo = channel;
    }

    // TODO - support multiple views
    const viewport = viewports[0];
    const viewportChanged = !this.lastViewport || !this.lastViewport.equals(viewport);

    // Resize framebuffer to match canvas
    // TODO 2X multiplier incorrect?
    this.collidePass.fbo.resize({width: 0.5 * gl.canvas.width, height: 0.5 * gl.canvas.height});

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
      const minimap = true;
      const canvasHeight = (minimap ? 2 : 1) * this.collideMap.height;
      if (!canvas) {
        canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.id = 'fbo-canvas';
        canvas.style.zIndex = '100';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.right = '0';
        canvas.style.border = 'blue 1px solid';
        canvas.style.transform = 'scaleY(-1)';
        document.body.appendChild(canvas);
      }
      if (canvas.width !== this.collideMap.width || canvas.height !== canvasHeight) {
        canvas.width = this.collideMap.width;
        canvas.height = canvasHeight;
        canvas.style.width = `${0.25 * canvas.width}px`; // Fit with 80% width #app
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
    const oldChannelInfo = this.oldChannelInfo;
    if (!oldChannelInfo) {
      return;
    }

    const maskChanged =
      // If a channel is new
      channelInfo === oldChannelInfo ||
      // If sublayers have changed
      oldChannelInfo.layers.length !== channelInfo.layers.length ||
      // If a sublayer's positions have been updated, the cached bounds will change shallowly
      channelInfo.layerBounds.some((b, i) => b !== oldChannelInfo.layerBounds[i]);

    this.oldChannelInfo = channelInfo;

    // console.log('maskChanged', maskChanged, 'viewportChanged', viewportChanged);
    if (maskChanged || viewportChanged) {
      // Recalculate mask bounds
      this.lastViewport = viewport;

      // Rerender mask FBO
      const {collidePass, collideMap} = this;

      // @ts-ignore (2532) This method is only called from preRender where collidePass is defined
      collidePass.render({
        pass: 'collide',
        layers: channelInfo.layers,
        layerFilter,
        viewports: viewport ? [viewport] : [],
        onViewportActive,
        views,
        moduleParameters: {
          devicePixelRatio: 1
        }
      });
    }
  }

  getModuleParameters(): {collideMap: Texture2D; haveCollideLayers: Boolean} {
    return {
      collideMap: this.haveCollideLayers ? this.collideMap : this.dummyCollideMap,
      haveCollideLayers: this.haveCollideLayers
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
    this.haveCollideLayers = false;
    this.oldChannelInfo = null;
  }
}
