import test from 'tape-promise/tape';
import {CollideExtension} from '@deck.gl/extensions';
import {ScatterplotLayer, GeoJsonLayer} from '@deck.gl/layers';
import {testLayer} from '@deck.gl/test-utils';

import {geojson} from 'deck.gl-test/data';

test.only('CollideExtension', t => {
  const testCases = [
    {
      props: {
        id: 'collide-extension-test',
        data: [],
        extensions: [new CollideExtension()],
        collideGroup: 'COLLIDE_GROUP',
        getRadius: 1,

        // simulate CollideEffect parameters
        collideMaps: {
          COLLIDE_GROUP: 'COLLIDE_TEXTURE'
        },
        drawToCollideMap: false,
        dummyCollideMap: 'DUMMY_TEXTURE'
      },
      onAfterUpdate: ({layer}) => {
        const uniforms = layer.getModels()[0].getUniforms();
        t.ok(uniforms.collide_enabled, 'collide_enabled in uniforms');
        t.equal(uniforms.collide_sort, false, 'collide_sort in disabled when reading');
        t.equal(uniforms.collide_texture, 'COLLIDE_TEXTURE', 'collide_texture correctly set');
        t.equal(layer.props.getRadius, 1, 'getRadius set to default');
      }
    },
    {
      updateProps: {
        collideGroup: 'NONEXISTENT'
      },
      onAfterUpdate: ({layer}) => {
        const uniforms = layer.getModels()[0].getUniforms();
        t.equal(uniforms.collide_enabled, false, 'collide_enabled is disabled');
        t.equal(uniforms.collide_sort, false, 'collide_sort in disabled when reading');
        t.equal(uniforms.collide_texture, 'DUMMY_TEXTURE', 'collide_texture set to dummy texture');
      }
    },
    {
      updateProps: {
        collideGroup: 'COLLIDE_GROUP',
        drawToCollideMap: true
      },
      onAfterUpdate: ({layer}) => {
        const uniforms = layer.getModels()[0].getUniforms();
        const attributes = layer.getAttributeManager().getAttributes();
        t.ok(uniforms.collide_enabled, 'collide_enabled in uniforms');
        t.equal(
          uniforms.collide_sort,
          false,
          'collide_sort in disabled when getCollidePriority not set'
        );
        t.equal(
          uniforms.collide_texture,
          'DUMMY_TEXTURE',
          'collide_texture set to dummy texture when drawing'
        );
        t.equal(attributes.collidePriorities, undefined, 'no collidePriorities attribute added');
      }
    },
    {
      updateProps: {
        getCollidePriority: d => d.priority
      },
      onAfterUpdate: ({layer}) => {
        const uniforms = layer.getModels()[0].getUniforms();
        const attributes = layer.getAttributeManager().getAttributes();
        t.ok(uniforms.collide_enabled, 'collide_enabled in uniforms');
        t.ok(uniforms.collide_sort, 'collide_sort enabled when getCollidePriority set');
        t.ok(attributes.collidePriorities, 'collidePriorities attribute added');
      }
    }
  ];

  testLayer({Layer: ScatterplotLayer, testCases, onError: t.notOk});

  t.end();
});
