/* global fetch */
import React, {useState, useMemo} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {COORDINATE_SYSTEM, OPERATION} from '@deck.gl/core';
import {GeoJsonLayer, ScatterplotLayer, TextLayer} from '@deck.gl/layers';
import {CollideExtension} from '@deck.gl/extensions';
import {CartoLayer, setDefaultCredentials, MAP_TYPES} from '@deck.gl/carto';
import {parse} from '@loaders.gl/core';

setDefaultCredentials({
  accessToken: 'XXX'
});

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json';
const AIR_PORTS =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_airports.geojson';
const PLACES =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_populated_places_simple.geojson';
const COUNTRIES =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_scale_rank.geojson';

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
  const [collideEnabled, setCollideEnabled] = useState(true);
  const [showCarto, setShowCarto] = useState(false);
  const [showPoints, setShowPoints] = useState(true);
  const [showLabels, setShowLabels] = useState(false);

  const props = {
    pointRadiusUnits: 'pixels',
    getPointRadius: 8,
    getFillColor: d => [25 * d.properties.scalerank, 255 - 25 * d.properties.scalerank, 123],
    pickable: true, // TODO Currently required!!!!!
    onClick: ({object}) => console.log(object.properties)
  };

  const points = new GeoJsonLayer({
    id: 'points',
    data: PLACES,

    pointType: 'circle',
    ...props,

    extensions: [new CollideExtension()],
    collideEnabled,
    getCollidePriority: d => -d.properties.scalerank,
    collideTestProps: {
      pointAntialiasing: false, // Does this matter for collisions?
      radiusScale: 2 // Enlarge point to increase hit area
    }
  });
  const labels = new TextLayer({
    id: 'collide-labels',
    data: AIR_PORTS,
    dataTransform: d => d.features,

    getText: f => f.properties.name,
    getColor: [0, 155, 0],
    getSize: 24,
    getPosition: f => f.geometry.coordinates,
    ...props,

    extensions: [new CollideExtension()],
    collideEnabled,
    getCollidePriority: d => -d.properties.scalerank,
    collideGroup: 'labels',
    collideTestProps: {
      sizeScale: 2 // Enlarge text to increase hit area
    }
  });
  const carto = new CartoLayer({
    id: 'places',
    connection: 'bigquery',
    type: MAP_TYPES.TABLE,
    data: 'cartobq.public_account.populated_places',

    getFillColor: [200, 0, 80],
    pointType: 'text',
    getText: f => f.properties.name,
    getTextColor: [0, 0, 0],
    getTextSize: 12,
    pickable: true,
    parameters: {depthTest: false},

    extensions: [new CollideExtension()],
    collideEnabled,
    // TODO interlayer priority not working
    getCollidePriority: 0,
    collideTestProps: {
      sizeScale: 2 // Enlarge text to increase hit area
    }
  });
  const viewState = {
    longitude: 60,
    latitude: 40,
    zoom: 2,
    maxZoom: 20,
    pitch: 0,
    bearing: 0
  };

  const layers = [showCarto && carto, showPoints && points, showLabels && labels];

  return (
    <>
      <DeckGL layers={layers} initialViewState={viewState} controller={true}>
        <StaticMap reuseMaps mapStyle={MAP_STYLE} preventStyleDiffing={true} />
      </DeckGL>
      <div style={{left: 200, position: 'absolute', background: 'white', padding: 10}}>
        <label>
          <input
            type="checkbox"
            checked={collideEnabled}
            onChange={() => setCollideEnabled(!collideEnabled)}
          />
          Collisions
        </label>
        <label>
          <input type="checkbox" checked={showCarto} onChange={() => setShowCarto(!showCarto)} />
          Show carto
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
