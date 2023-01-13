import test from 'tape-promise/tape';
import {MapView, LayerManager} from 'deck.gl';
import {COORDINATE_SYSTEM} from '@deck.gl/core';
import {SolidPolygonLayer} from '@deck.gl/layers';
import {CollideExtension} from '@deck.gl/extensions';
import CollideEffect from '@deck.gl/extensions/collide/collide-effect';
import * as FIXTURES from 'deck.gl-test/data';
import {gl} from '@deck.gl/test-utils';

const testViewport = new MapView().makeViewport({
  width: 100,
  height: 100,
  viewState: {longitude: -122, latitude: 37, zoom: 13}
});

const TEST_LAYER = new SolidPolygonLayer({
  data: FIXTURES.polygons.slice(0, 3),
  getPolygon: f => f,
  extensions: [new CollideExtension()],
  collideGroup: 'COLLIDE_GROUP'
});

test('CollideEffect#constructor', t => {
  const collideEffect = new CollideEffect();
  t.ok(collideEffect, 'Collide effect created');
  t.ok(collideEffect.useInPicking, 'Collide effect enabled for picking render');
  t.deepEqual(collideEffect.collidePasses, {}, 'Collide effect created with no passes');
  t.deepEqual(collideEffect.channels, [], 'Collide effect created with no channels');
  collideEffect.cleanup();
  t.end();
});

test('CollideEffect#cleanup', t => {
  const collideEffect = new CollideEffect();

  const layerManager = new LayerManager(gl, {viewport: testViewport});
  layerManager.setLayers([TEST_LAYER]);
  layerManager.updateLayers();

  collideEffect.preRender(gl, {
    layers: layerManager.getLayers(),
    onViewportActive: layerManager.activateViewport,
    viewports: [testViewport]
  });

  t.ok(collideEffect.collidePasses['COLLIDE_GROUP'], 'CollidePass is created');
  t.ok(collideEffect.dummyCollideMap, 'Dummy collide map is created');
  t.ok(collideEffect.channels['COLLIDE_GROUP'], 'Channel is created');
  t.equal(collideEffect.lastViewport, testViewport, 'Last viewport is saved');

  collideEffect.cleanup();

  t.deepEqual(collideEffect.collidePasses, {}, 'Collide passes are removed');
  t.notOk(collideEffect.dummyCollideMap, 'Dummy collide map is deleted');
  t.deepEqual(collideEffect.channels, {}, 'Channels are removed');
  t.notOk(collideEffect.lastViewport, 'Last viewport is deleted');

  t.end();
});

test('CollideEffect#update', t => {
  const collideEffect = new CollideEffect();

  const TEST_LAYER_2 = TEST_LAYER.clone({id: 'test-layer-2'});
  const TEST_LAYER_DIFFERENT_GROUP = TEST_LAYER.clone({
    id: 'test-layer-different-group',
    collideGroup: 'COLLIDE_GROUP_2'
  });

  const layerManager = new LayerManager(gl, {viewport: testViewport});

  const preRenderWithLayers = (layers, description) => {
    t.comment(description);
    layerManager.setLayers(layers);
    layerManager.updateLayers();

    collideEffect.preRender(gl, {
      layers: layerManager.getLayers(),
      onViewportActive: layerManager.activateViewport,
      viewports: [testViewport]
    });
  };

  preRenderWithLayers([TEST_LAYER], 'Initial render');
  let parameters = collideEffect.getModuleParameters();
  t.equal(Object.keys(parameters.collideMaps).length, 1, 'single collide map in parameters');
  t.ok(parameters.collideMaps['COLLIDE_GROUP'], 'collide map is in parameters');
  t.ok(parameters.dummyCollideMap, 'dummy collide map is in parameters');

  preRenderWithLayers([TEST_LAYER, TEST_LAYER_2], 'Add second collide layer');
  parameters = collideEffect.getModuleParameters();
  t.equal(Object.keys(parameters.collideMaps).length, 1, 'single collide map in parameters');
  t.ok(parameters.collideMaps['COLLIDE_GROUP'], 'collide map is in parameters');
  t.ok(parameters.dummyCollideMap, 'dummy collide map is in parameters');

  preRenderWithLayers([TEST_LAYER_2], 'Remove first layer');
  parameters = collideEffect.getModuleParameters();
  t.equal(Object.keys(parameters.collideMaps).length, 1, 'single collide map in parameters');
  t.ok(parameters.collideMaps['COLLIDE_GROUP'], 'collide map is in parameters');
  t.ok(parameters.dummyCollideMap, 'dummy collide map is in parameters');

  preRenderWithLayers(
    [TEST_LAYER_2, TEST_LAYER_DIFFERENT_GROUP],
    'Add layer with different collide group'
  );
  parameters = collideEffect.getModuleParameters();
  t.equal(Object.keys(parameters.collideMaps).length, 2, 'two collide maps in parameters');
  t.ok(parameters.collideMaps['COLLIDE_GROUP'], 'collide map is in parameters');
  t.ok(parameters.collideMaps['COLLIDE_GROUP_2'], 'collide map is in parameters');
  t.ok(parameters.dummyCollideMap, 'dummy collide map is in parameters');

  collideEffect.cleanup();
  t.end();
});
