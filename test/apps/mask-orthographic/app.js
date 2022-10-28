/* global fetch */
import React, {useState, useMemo} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {COORDINATE_SYSTEM, OPERATION} from '@deck.gl/core';
import {GeoJsonLayer, ScatterplotLayer, SolidPolygonLayer} from '@deck.gl/layers';
import {MaskExtension} from '@deck.gl/extensions';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json';
const AIR_PORTS =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_airports.geojson';
const PLACES =
  // 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_populated_places_simple.geojson';
  'ne_10m_populated_places_simple.geojson';
const COUNTRIES =
  // 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_scale_rank.geojson';
  'ne_50m_admin_0_scale_rank.geojson';

const basemap = new GeoJsonLayer({
  id: 'base-map',
  data: COUNTRIES,
  // Styles
  stroked: true,
  filled: true,
  lineWidthMinPixels: 2,
  opacity: 0.4,
  getLineColor: [60, 60, 60],
  getFillColor: [200, 200, 200]
});

/* eslint-disable react/no-deprecated */
export default function App() {
  const [maskEnabled, setMaskEnabled] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const props = {
    data: PLACES,
    pointRadiusUnits: 'pixels',
    getPointRadius: 8,
    getFillColor: [0, 255, 0],
    pickable: true, // Needed to send through pickingColor
    onClick: ({object}) => console.log(object.properties)
  };

  const pointsProps = {
    ...props,
    pointType: 'circle',
    getText: f => f.properties.name,
    getTextColor: [0, 0, 0],
    getTextSize: 18
  };

  const points = [
    new GeoJsonLayer({
      id: 'mask-points', // Hacked to 'collision-mask' in MaskEffect
      operation: OPERATION.MASK,
      pointAntialiasing: false,
      ...pointsProps,
      getPointRadius: 4 * pointsProps.getPointRadius // Enlarge point to increase hit area
    }),
    new GeoJsonLayer({
      id: 'points',
      extensions: [new MaskExtension()],
      maskId: maskEnabled && 'collision-mask',
      ...pointsProps
    })
  ];

  const labelsProps = {
    ...props,
    pointType: 'text',
    getText: f => f.properties.name,
    getTextColor: [0, 0, 0],
    getTextSize: 18
  };

  const labels = [
    new GeoJsonLayer({
      id: 'mask-labels', // Hacked to 'collision-mask' in MaskEffect
      operation: OPERATION.MASK,
      textBackground: true, // Only draw box for mask
      ...labelsProps,
      getTextSize: 4 * labelsProps.getTextSize // Enlarge point to increase hit area
    }),
    new GeoJsonLayer({
      id: 'labels',
      extensions: [new MaskExtension()],
      maskId: maskEnabled && 'collision-mask',
      ...labelsProps
    })
  ];

  const viewState = {
    longitude: 60,
    latitude: 40,
    zoom: 2,
    maxZoom: 20,
    pitch: 0,
    bearing: 0
  };

  //<StaticMap reuseMaps mapStyle={MAP_STYLE} preventStyleDiffing={true} />
  return (
    <>
      <DeckGL
        layers={[basemap].concat(showPoints ? points : []).concat(showLabels ? labels : [])}
        initialViewState={viewState}
        controller={true}
      ></DeckGL>
      <div style={{left: 200, position: 'absolute', background: 'white', padding: 10}}>
        <label>
          <input
            type="checkbox"
            checked={maskEnabled}
            onChange={() => setMaskEnabled(!maskEnabled)}
          />
          Use mask
        </label>
        <label>
          <input type="checkbox" checked={showPoints} onChange={() => setShowPoints(!showPoints)} />
          Show points
        </label>
        <label>
          <input type="checkbox" checked={showLabels} onChange={() => setShowLabels(!showLabels)} />
          Show labels
        </label>
      </div>
    </>
  );
}

export function renderToDOM(container) {
  render(<App />, container);
}
