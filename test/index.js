var test = require('tape');
var mercury = require('mercury');
var Ndarray = require('ndarray');
var raf = require('raf');
var event = require('synthetic-dom-events');
var document = require('global/document');
var stringify = require('node-stringify');

var Grid = require('../');

// if we are in a browser
if (process.browser) {
  // include example app styles
  require('../example/app.css');

  // include grid-ui styles
  require('../index.css');
}

function end (t, el, elRm) {
  // cleanup
  elRm();
  document.body.removeChild(el);
  t.end();
}

test("creating a 4x4 grid of random content", function (t) {
  // setup
  var ndarray = new Ndarray([
    0,[],"",{},null,undefined,
  ], [2,3]);
  var grid = Grid({
    model: ndarray,
    config: {
      edgeSize: 40,
      itemSize: {
        x: 80,
        y: 80,
      },
    },
  });

  // start app
  var elRm = mercury.app(document.body, grid.state, Grid.render);

  // after render
  raf(function () {
    var el = document.getElementsByClassName('grid ui')[0];

    t.equal(el.style.paddingBottom, "40px");
    t.equal(el.style.paddingLeft, "40px");
    t.equal(el.style.paddingRight, "40px");
    t.equal(el.style.paddingTop, "40px");

    var controls = el.childNodes[0];
    t.ok(controls);
    t.equal(controls.className, "controls");
    var rows = el.childNodes[1];
    t.ok(rows);
    t.equal(rows.className, "rows");

    for (var y = 0; y < rows.childNodes.length; y++) {
      var row = rows.childNodes[y];
      t.equal(row.className, "row");
      
      for (var x = 0; x < row.childNodes.length; x++) {
        var itemContainer = row.childNodes[x];
        t.equal(itemContainer.className, "item");
        t.equal(itemContainer.style.height, "80px");
        t.equal(itemContainer.style.width, "80px");
        t.equal(itemContainer.childNodes.length, 1);
        var item = itemContainer.childNodes[0];
        t.equal(
          item.textContent || item.data,
          stringify(ndarray.get(x, y))
        );
      }
    }

    end(t, el, elRm);
  });
});

function assertShape (t, el, data, shape) {
  var ndarray = new Ndarray(data, shape);

  var rows = el.getElementsByClassName('rows')[0];
  t.equal(rows.childNodes.length, shape[1]);

  for (var y = 0; y < rows.childNodes.length; y++) {
    var row = rows.childNodes[y];
    t.equal(row.childNodes.length, shape[0]);

    for (var x = 0; x < row.childNodes.length; x++) {
      var itemContainer = row.childNodes[x];
      var item = itemContainer.childNodes[0];
      t.equal(
        item.textContent || item.data,
        stringify(ndarray.get(x, y))
      );
    }
  }
}

test("change shape of grid with controls", function (t) {
  // setup
  var data = [
    0,1,2,3,4,5
  ];
  var grid = Grid({
    model: new Ndarray(data, [2, 3]),
    config: {
      debug: true,
    },
  });

  // start app
  var elRm = mercury.app(document.body, grid.state, Grid.render);

  function changeShape (el, shape) {

    if (shape[0]) {
      var xControl = el.getElementsByClassName('shape x control')[0];
      var xInput = xControl.getElementsByClassName('input')[0];
      xInput.value = shape[0].toString();
      xInput.dispatchEvent(event('input', { bubbles: true }));
    }

    if (shape[1]) {
      var yControl = el.getElementsByClassName('shape y control')[0];
      var yInput = yControl.getElementsByClassName('input')[0];
      yInput.value = shape[1].toString();
      yInput.dispatchEvent(event('input', { bubbles: true }));
    }
  }

  // animate
  raf(function () {
    var el = document.getElementsByClassName('grid ui')[0];

    assertShape(t, el, data, [2, 3]);
    changeShape(el, [3, 2]);

    raf(function () {
      assertShape(t, el, data, [3, 2]);
      changeShape(el, [1, 6]);

      raf(function () {
        assertShape(t, el, data, [1, 6]);
        changeShape(el, [6, 1]);

        raf(function () {
          assertShape(t, el, data, [6, 1]);

          end(t, el, elRm);
        });
      });
    });
  });
});

function simulateClient (el, state) {
  var shape = state.model.shape.slice();
  el.clientWidth = el.clientWidth ||
    (state.config.itemSize.x * shape[0] + (state.config.edgeSize.x * 2));
  el.clientHeight = el.clientHeight ||
    (state.config.itemSize.y * shape[1] + (state.config.edgeSize.y * 2));
}

test("change shape of grid by dragging right edge", function (t) {
  var data = [
    0,1,2,3,4,5
  ];
  var grid = Grid({
    model: new Ndarray(data, [2, 3]),
    config: {
      edgeSize: {
        x: 80,
        y: 50,
      },
      itemSize: {
        x: 60,
        y: 100,
      },
    },
  });

  // start app
  mercury.app(document.body, grid.state, Grid.render);

  function mouseDown (el, state) {
    var start = {
      x: el.clientWidth / 2,
      y: state.config.edgeSize.y / 2,
    };

    el.dispatchEvent(event("mousedown", {
      target: el,
      offsetX: start.x,
      offsetY: start.y,
    }));

    return start;
  }

  raf(function () {
    var el = document.getElementsByClassName('grid ui')[0];
    var state = grid.state();

    simulateClient(el, state);
    var start = mouseDown(el, state);

    // ease from start to end
    // for each delta, emit mousemove event
    // on raf, assert shape then repeat

    end(t, el);
  });
});
