import {log} from '@deck.gl/core';
import OrthographicView from '../../views/orthographic-view';
import WebMercatorViewport from '../../viewports/web-mercator-viewport';
import {fitBounds} from '@math.gl/web-mercator';

import type Layer from '../../lib/layer';
import type Viewport from '../../viewports/viewport';

export type MaskBounds = [number, number, number, number];

/*
 * Compute the bounds of the mask in world space, such that it covers an
 * area currently visible (extended by a buffer) or the area of the masking
 * data, whichever is smaller
 */
export function getMaskBounds({
  layers,
  viewport
}: {
  layers: Layer[];
  viewport: Viewport;
}): MaskBounds {
  // HACK always render whole viewport
  const b = viewport.getBounds();
  return b;

  // Try snapping - doesn't look great
  const res = 0.05;
  let w = (b[2] - b[0]) * res;
  let h = (b[3] - b[1]) * res;
  w = parseFloat(w.toPrecision(3));

  b[0] = Math.round(b[0] / w) * w;
  b[2] = b[0] + w / res; // Fewer state changes when panning
  b[1] = Math.round(b[1] / w) * w;
  b[3] = Math.round(b[3] / w) * w;

  return b;
}

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

function _doubleBounds(bounds: MaskBounds): MaskBounds {
  const size = {
    x: bounds[2] - bounds[0],
    y: bounds[3] - bounds[1]
  };
  const center = {
    x: bounds[0] + 0.5 * size.x,
    y: bounds[1] + 0.5 * size.y
  };
  return [center.x - size.x, center.y - size.y, center.x + size.x, center.y + size.y];
}
