# Snow in canvas land

Other peoples' code is awful, and your own code from months previous counts as someone else's. With this and the festive spirit in mind, [I dug up a canvas snow demo I made two years ago](http://jakearchibald.github.com/canvas-snow/1.html) to see how bad my code really was.

# How does it work?

Snowflake objects are created with a radius, opacity, y-velocity, and x-range (they drift from side to side). As they fall, they're drawn to a canvas, this canvas is cleared on every frame. When snowflakes land, they're drawn to another canvas, and the Snowflake is removed from the "active snowflakes" list. The second canvas is never cleared, snowflakes shapes are added as they land, meaning I don't have to redraw all the landed snowflakes per frame.

Two years of browser development later, what's wrong with it?

# Arghh! What happened to the performance?

Depending on your browser, the demo grinds to an almost halt after a few flakes appear. Chrome, Firefox Windows, and IE10 preview on Win7 all suffer. Safari Mac, Firefox Windows & Opera don't do too badly.

This slowdown wasn't there when I first made the demo, so something's changed in the browsers. The cause was pretty difficult to track down, Chrome Devtools and Firebug laid the blame on my frame function...

![Firebug](http://jakearchibald.github.com/canvas-snow/firebug-unhelpful.png)

![Chrome Devtools](http://jakearchibald.github.com/canvas-snow/initial-chrome-devtools.png)

...which isn't specific enough. Points go to IE10, which correctly called it:

![IE10 Devtools](http://jakearchibald.github.com/canvas-snow/ie10-initial.png)

I decide a flake has landed when the pixel beneath it on the "landed" canvas is above ~80% opacity. I only test one pixel per flake, but that happens every frame. For whatever reason that's more effort for some browsers than it used to be.

Instead of checking the canvas to determine if a flake should land, I instead maintain an array with length equal to the width of the canvas, where each item is the y-position that snowflakes cannot continue beyond for that x-position. When a snowflake lands, the array is updated, adding the new snowflake to the terrain.

[The improvement is huge in the browsers that were struggling before](http://jakearchibald.github.com/canvas-snow/2.html)
([diff](https://github.com/jakearchibald/canvas-snow/commit/29f3976a75480027448d1baf1491ce6c9634ce01)).
In Chrome, we're getting towards 60fps, but not quite.

# Lack of requestAnimationFrame

There are better articles on [why requestAnimtionFrame is great](http://www.html5rocks.com/en/tutorials/speed/rendering/), but basically `setTimeout` is not in sync with when the browser draws. This results in one of, or a combination of, more than one frame calculation per drawn frame, and less than one frame calculation per drawn frame. With the snow example, here it is in Chrome Devtools' frame view:

![Chrome Devtools](http://jakearchibald.github.com/canvas-snow/no-raf-jolt.png)

Here the yellow boxes represent JS triggered by `setTimeout`, the green boxes are drawn frames. The JS blocks appear before the draw, but they're out of sync. They get closer and closer until they block a draw, then the draws happen before the timers, until of course they swap over again and you get another missed draw. These dropped frames are a noticeable jolt visually.

Let's fix this. Instead of...

```javascript
function frame() {
	// ...
}
setInterval(frame, 1000 / assumedFps);
```

...we'll do:

```javascript
var requestAnimationFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(func) { setTimeout(func, 1000 / assumedFps); };

function frame() {
	// ...
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

[Here's the version using requestAnimationFrame](http://jakearchibald.github.com/canvas-snow/3.html) ([diff](https://github.com/jakearchibald/canvas-snow/commit/f8c310f76f444fb20caad0407d5f80698739a934)).The difference is noticable across all browsers except Opera (which doesn't support requestAnimationFrame yet), especially if you're not running at 60hz as the old `setTimeout` assumed. Here's how Chrome's frame view looks now:

![Chrome Devtools](http://jakearchibald.github.com/canvas-snow/with-raf.png)

A few years ago our main goal was to make stuff look "right" in all browsers. That's a lot easier than it used to be. Now most browsers can render complex designs really fast. This introduces a new challenge that was previously impossible, can you make it animate/scroll at 60fps? (or whatever refresh rate the user has)

Some things are allowed to be lumpy, like soup and perhaps orange juice. Animation is more like milk and farts: lumps are bad.

# Garbage day!*

We're so close 60fps in Chrome, but as you can see from the screenshot above, we're not always hitting it. What's going on there?

![Chrome Devtools](http://jakearchibald.github.com/canvas-snow/gc-jolt.png)

A frame was missed due to garbage collection. The most explicit bit of object creation & dereferencing I do is with the snowflakes:

```javascript
function Snowflake() {
  // ...
}

function frame() {
  // ...
  if (shouldMakeSnowflake) {
    fallingSnowflakes.push(new Snowflake());
  }
  if (shouldLandSnowflake) {
    fallingSnowflakes.splice(index, 1);
  }
  // ...
}
```

Throwing objects away and creating similar new ones is a waste (cut to scene of Native American with tear in eye), let's fix that with some recycling:

```javascript
function Snowflake() {
  this.reset();
}
Snowflake.prototype.reset = function() {
  // ...
  return this;
}

function frame() {
  // ...
  if (shouldMakeSnowflake) {
    if (snowflakePool.length) {
      fallingSnowflakes.push(snowflakePool.pop().reset());
    }
    else {
      fallingSnowflakes.push(new Snowflake());
    }
  }
  if (shouldLandSnowflake) {
    snowflakePool.push.apply(snowflakePool,
      fallingSnowflakes.splice(index, 1)
    );
  }
  // ...
}
```

Here I move my constructor stuff to a reset method, so an existing object can be reconstructed. When a snowflake lands, it's put into an array for reuse rather than being thrown away. When a new snowflake is needed, we take one from the pool, or create a new one if the pool is empty. How does that look?

![Chrome Devtools](http://jakearchibald.github.com/canvas-snow/final.png)

[60fps. Wonderful.](http://jakearchibald.github.com/canvas-snow/4.html) ([diff](https://github.com/jakearchibald/canvas-snow/commit/5325cb01d688cb364688c95656f6ba5e95a31afe))

I hope other browsers get a frame-by-frame breakdown of events similar or better than Chrome's, it's dead handy (disclaimer: I work for Google, probably biased).

*[this](http://www.youtube.com/watch?v=N5IlA4ehJck)

# A bit of artistic direction

[Paul Lewis (@aerotwist)](https://twitter.com/aerotwist) was extremely dissatisfied with my snowflake simulation, and offered up some tips. We got rid of the side-to-side wobble, instead giving each flake a constant x-velocity, tweaked the sizes a bit, And since we're hitting 60fps pretty easily... **moar snow!** [It looks much better I reckon](http://jakearchibald.github.com/canvas-snow/5.html) ([diff](https://github.com/jakearchibald/canvas-snow/commit/27aab34f27c14700d0086ca64ccfa4ffe9f9359a)).

And with that, I wish you a holiday free of inappropriate lumps!