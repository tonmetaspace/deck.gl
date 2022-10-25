/* global fetch */
import React, {useState, useMemo} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {COORDINATE_SYSTEM, OPERATION} from '@deck.gl/core';
import {ScatterplotLayer, SolidPolygonLayer} from '@deck.gl/layers';
import {MaskExtension} from '@deck.gl/extensions';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

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
    data: points,
    radiusUnits: 'pixels',
    getPosition: d => d.coordinates,
    getRadius: 25,
    getFillColor: [0, 255, 0]
  };

  const layers = [
    new ScatterplotLayer({
      id: 'mask',
      operation: OPERATION.MASK,
      ...props,
      getRadius: 2 * props.getRadius // HACK, not sure why this happens
    }),
    new ScatterplotLayer({
      id: 'circles',
      extensions: [new MaskExtension()],
      maskId: maskEnabled && 'mask',
      maskByInstance: false,
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
