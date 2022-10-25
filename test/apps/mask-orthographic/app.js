/* global fetch */
import React, {useState, useMemo} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {COORDINATE_SYSTEM, OPERATION} from '@deck.gl/core';
import {GeoJsonLayer, ScatterplotLayer, SolidPolygonLayer} from '@deck.gl/layers';
import {MaskExtension} from '@deck.gl/extensions';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
const AIR_PORTS =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_airports.geojson';

const N = 1000;
const points = [];
for (let i = 0; i < N; i++) {
  const coordinates = [100 * Math.random() - 50, 100 * Math.random() - 50];
  points.push({coordinates});
}

/* eslint-disable react/no-deprecated */
export default function App() {
  const [maskEnabled, setMaskEnabled] = useState(true);
  const [showLayers, setShowLayers] = useState(true);

  const props = {
    // coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    data: AIR_PORTS,
    pointRadiusUnits: 'pixels',
    getPointRadius: 16,
    getFillColor: [0, 255, 0]
  };

  const layers = [
    new GeoJsonLayer({
      id: 'mask',
      operation: OPERATION.MASK,
      pickable: true,
      ...props,
      getPointRadius: 2.5 * props.getPointRadius // HACK, not sure why this happens
    }),
    new GeoJsonLayer({
      id: 'circles',

      extensions: [new MaskExtension()],
      maskId: maskEnabled && 'mask',
      maskByInstance: true,

      // Line (not working??)
      stroked: true,
      getLineWidth: 1,
      getLineColor: [255, 255, 255],
      lineWidthUnits: 'pixels',
      lineWidthMinPixels: 2,

      pickable: true,
      onClick: ({object}) => {
        console.log(object);
      },

      // pointType: 'text',
      pointType: 'circle',
      getText: f => f.properties.name,
      getTextColor: [255, 255, 255],
      getTextSize: 18,
      ...props
    })
  ];

  const viewState = {
    longitude: 0,
    latitude: 0,
    zoom: 2,
    maxZoom: 20,
    pitch: 0,
    bearing: 0
  };

  return (
    <>
      <DeckGL layers={showLayers ? layers : []} initialViewState={viewState} controller={true}>
        <StaticMap reuseMaps mapStyle={MAP_STYLE} preventStyleDiffing={true} />
      </DeckGL>
      <div style={{position: 'absolute', background: 'white', padding: 10}}>
        <label>
          <input
            type="checkbox"
            checked={maskEnabled}
            onChange={() => setMaskEnabled(!maskEnabled)}
          />
          Use mask
        </label>
        <label>
          <input type="checkbox" checked={showLayers} onChange={() => setShowLayers(!showLayers)} />
          Show layers
        </label>
      </div>
    </>
  );
}

export function renderToDOM(container) {
  render(<App />, container);
}
