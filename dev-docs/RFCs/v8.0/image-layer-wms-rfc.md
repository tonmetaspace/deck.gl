# RFC: ImageLayer and WMS support

- **Authors**: Ib Green
- **Date**: Jan 12, 2023
- **Status**: Draft

## Overview

Some services can generate on-demand images that covers an arbitrary specified viewport (rather than set of tiles). WMS services are one of the most common examples of this type of data source and the lack of WMS support in deck.gl is a notable omission.

## WMS Services

A common use case are WMS services, where the service provides a `GetMap` request that returns an image covering a specified viewport, along with some auxillary request types, here listed with the corresponding loaders.gl response parsers:

| **WMS Request**    | **Response Loader**         | **Description**                                                                                                                                                                                                                    |
| ------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GetCapabilities`  | `WMSCapabilitiesLoader`     | Returns parameters about the WMS (such as map image format and WMS version compatibility) and the available layers (map bounding box, coordinate reference systems, URI of the data and whether the layer is mostly opaque or not) |
| `GetMap`           | `ImageLoader`               | returns a map image. Parameters include: width and height of the map, coordinate reference system, rendering style, image format                                                                                                   |
| `GetFeatureInfo`   | `WMSFeatureInfoLoader`      | if a layer is marked as 'queryable' then you can request data about a coordinate of the map image.                                                                                                                                 |
| `DescribeLayer`    | `WMSLayerDescriptionLoader` | gets feature types of the specified layer or layers, which can be further described using WFS or WCS requests. This request is dependent on the Styled Layer Descriptor (SLD) Profile of WMS.                                      |
| `GetLegendGraphic` | `ImageLoader`               | An image of the map's legend, giving a visual guide to map elements.                                                                                                                                                               |

Note that only the `GetCapabilities` and `GetMap` request types are are required to be supported by a WMS server. The response to `GetCapabilities` contains information about which request types are supported


## Issues with Tiling

While a WMS-style image service could be used with the `TileLayer` (with some glue code to make multiple calls to `GetMap` to generate images sized to tile dimensions), the results may not be ideal:

- the performance of running multiple (parallel) queries may not be good.
- if the service is not aware that the image is being tiled, it may do different layout decisions and duplicate labels etc.

Because of this, a new layer, tentatively called the `ImageLayer` is proposed.

## Prior Art

OpenLayers offers an [`ImageLayer` and a sample app](https://openlayers.org/en/latest/examples/wms-image.html)
that handles the single-image WMS visualization scenario.

## ImageLayer High-Level Requirements

In some sense the `ImageLayer` is the simplest possible dynamically loading layer. Just like the `TileLayer` and `Tile3DLayer` it loads new data when the viewport changes.

## Debounce

- Fetching is expensive, so fetches should be debounced (e.g. to avoid fetches happening during pans and zoom). We want PanComplete, ZoomComplete event detection?

### Multiview & Caching

The ImageLayer should support multiview. A question is whether there should be some reuse between views. The simplest solution is of course that each view issues and independent fetch.

At minimum, the current images for all views must be cached, so that views can be quickly redrawn.

### Parameter pass-through

WMS services typically offer a number of layers, and this is specified through one of many parameters, so there must be a way to provide parameters to the underlying (WMS) URL that can be freely mixed with layer generated paramaters.


## Open Issues: Naming

`ImageLayer` is very generic and does not capture the dynamic loading aspect of the layer, and conflicts with other image related use cases. A better name would be nice.

- `WMSLayer` was rejected since we do not want to make this layer WMS specific, as it is easy to generalize.
- `SingleImageLayer`, `SingleTileLayer`, ...
- `GeoImageLayer`, `ViewportImageLayer`, ...


## Appendix: WMS Integration

Given that WMS is an established OGC standard, it would be good if deck.gl/loaders.gl supports the necessary glue code, ideally both for. Places where we can put such code is in:

- `@loaders.gl/wms` - this is a very natural place, as loaders.gl offers the more we can place here the better
- `WMSImageLayer` / `WMSTileLayer` - We could do this, but it starts taking us a down a road of a "forest" of subclasses, which ends up being very hard to maintain and refactor.
- `WMSDataSource` - make the `ImageLayer` and `TileLayer` work agains more well defined data sources. An evolution of the `Tileset2D` perhaps?

## Other WMS capabilities

- `GetLegendGraphic` - the WMS standard allows the service to provide a legend graphic that can be overlaid on the map. It is unclear if this is commonly supported by WMS services, and styling is likely to be inconsistent with the application.
- `GetFeatureInfo` -

## DataSource ideas

One could abstract the WMS data source along these lines.

```typescript
interface ImageDataSource {
  getCapabilities(): Promise<ImageDataSourceCapabilities>;
  getImage({boundingBox, width, height, layers, parameters}): Promise<Image>;
  getLegendImage({layers, parameters}): Promise<Image>;
  getFeatureInfo({layers, parameters}): Promise<ImageFeatureInfo>;
  getLayerInfo({layers, parameters}): Promise<ImageDataSourceLayerInfo>
}

import {load, LoaderOptions} from '@loaders.gl/core';
import {WMSCapabilitiesLoader, WMSFeatureInfoLoader} from '@loaders.gl/wms';
import {ImageLoader} from '@loaders.gl/images';

class WMSDataSource implements ImageDataSource {
  url: string;
  loadOptions: LoaderOptions = {};

  constructor({url, loadOptions: LoaderOptions}) {
    this.url = url;
    this.loadOptions = loadOptions;
  }

  getCapabilities(): Promise<ImageDataSourceCapabilities> {
    const url = this._getUrl({request: 'GetCapabilities', layers, parameters});
    return load(url, WMSCapabilitiesLoader, this.loadOptions);
  }

  getImage({boundingBox, width, height, layers: string[], parameters: Record<string, unknown>}): Promise<Image> {
    const url = this._getUrl({request: 'GetMap', layers, parameters});
    return load(url, ImageLoader, this.loadOptions);
  }

  getLegendImage(options: {layers: string[], parameters: Record<string, unknown>}): Promise<Image> {
    const url = this._getUrl({request: 'GetLegendImage', layers, parameters});
    return load(url + '?REQUEST=GetCapabilities', WMSCapabilitiesLoader, this.loadOptions);
  }

  getFeatureInfo({layers: string[], parameters: Record<string, unknown>}): Promise<ImageFeatureInfo> {
    const url = this._getUrl({request: 'GetFeatureInfo', layers, parameters});
    return load(url + '?REQUEST=GetCapabilities', ImageLoader, this.loadOptions);
  }

  getLayerInfo({layers: string[], parameters: Record<string, unknown>}): Promise<ImageDataSourceLayerInfo> {
    const url = this._getUrl({request: 'GetLayerInfo', layers, parameters})
    return load(url + '?REQUEST=GetLayerInfo', WMSLayerInfoLoader, this.loadOptions);
  }

  /**
   * @note protected, since perhaps getUrl may need to be overridden to handle certain backends?
   * @note if override is common, maybe add a callback prop?
   * */
  protected getUrl(options: {request: string; layers: string[], parameters: Record<string, unknown>}): string {
    let url = `${this.url}?REQUEST=${options.request}`;
    if (options.layers.length) {
      url += `&LAYERS=[${options.layers.join(',')}]`;
    }
  }
}
```

This might trigger a process to define similar data sources for other services.

```typescript
interface VectorTileDataSource {
  getCapabilities(): Promise<IVectorTileDataSourceCapabilities>;
  getTile({boundingBox, width, height, layers, parameters}): Promise<VectorTile>;
}
```

Such a set of data sources would ideally be completely independent of deck.gl,
and probably best placed in loaders.gl.


## Appendix: Potential Future Improvements

### Mosaicing and Client-Side Tiling ideas

It is inevitable that zooming and panning will temporarily show empty areas and a pixelated image.

- So it is tempting to reuse existing images from a cache if they partially cover the empty/pixelated areas.
- However, "mosaicing" a collection of "random-size" images from a cache does not sound practical.

A possible solution would be client-side tiling: request a full screen image but then cut it into tiles on the client. This way we can leverage the tile layers existing "mosaicing" logic.

We could request a slightly bigger image than is needed to cover the screen to make sure we can cut it into an even number of tiles.

##

```
type ImageLayerProps = {
  boundingBox: [number, number, number, number];
  data: dataSource;
}
```
