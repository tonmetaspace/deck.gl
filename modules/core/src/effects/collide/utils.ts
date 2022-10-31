import {log} from '@deck.gl/core';
import OrthographicView from '../../views/orthographic-view';
import WebMercatorViewport from '../../viewports/web-mercator-viewport';
import {fitBounds} from '@math.gl/web-mercator';

import type Layer from '../../lib/layer';
import type Viewport from '../../viewports/viewport';

export type MaskBounds = [number, number, number, number];

/*
 * Compute viewport to render the mask into, covering the given bounds
 */
export function getMaskViewport({
  bounds,
  viewport,
  width,
  height
}: {
  bounds: MaskBounds;
  viewport: Viewport;
  width: number;
  height: number;
}): Viewport | null {
  if (bounds[2] <= bounds[0] || bounds[3] <= bounds[1]) {
    return null;
  }

  if (viewport.resolution !== undefined) {
    log.warn('CollideExtension is not supported in GlobeView')();
    return null;
  }

  // Single pixel border to prevent mask bleeding at edge of texture
  const padding = 1;
  width -= padding * 2;
  height -= padding * 2;

  if (viewport.isGeospatial) {
    return new WebMercatorViewport({
      ...viewport,
      x: padding,
      y: padding,
      width,
      height
    });
  }
  // TODO code below wrong

  const center = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2, 0];
  const scale = Math.min(
    1048576, // maxZoom of 20: Math.pow(2, 20) = 1048576
    width / (bounds[2] - bounds[0]),
    height / (bounds[3] - bounds[1])
  );

  return new OrthographicView({
    x: padding,
    y: padding
  }).makeViewport({
    width,
    height,
    viewState: {
      target: center,
      zoom: Math.log2(scale)
    }
  });
}
