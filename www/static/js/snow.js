(function() {
  var html = document.documentElement;
  
  function Snowflake(maxX) {
    var rand = Math.random();
    var sizeRand;
    var chanceOfLargeSnowflake = 0.15;
    
    if (Math.random() < chanceOfLargeSnowflake) {
      sizeRand = Math.random() * 0.9 + 0.1;
    }
    else {
      sizeRand = Math.random() * 0.1;
    }
    
    this.size = sizeRand * 20 + 2.5;
    this.vel = sizeRand * 4 + 1;
    this.alpha = (1 - sizeRand * 0.9);
    
    // random x position
    this.midX = Math.random() * maxX;
    this.y = -this.size;
    
    // side-to-side movement
    this.sidePhase = 0;
    this.sideAmp = sizeRand * 40;
    this.sideVel = Math.random() * 0.05;
  }
  Snowflake.prototype.tick = function() {
    var sidePhase = this.sidePhase += this.sideVel;
    this.y += this.vel;
    this.x = this.midX + Math.sin(sidePhase) * this.sideAmp;
  };
  
  (function() {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var settleCanvas = document.createElement('canvas');
    var settleContext = context && settleCanvas.getContext('2d');
    var canvasStyle = canvas.style;
    var settleCanvasStyle = settleCanvas.style;
    var windowResized;
    var activeFlakes = [];
    var snowflakesPerPixelPerSecond = 0.02;
    var PIx2 = Math.PI*2;
    var assumedFps = 60;
    var settlePoint;

    function resizeCanvas() {
      settlePoint = Array(html.clientWidth);
      settleCanvas.width = canvas.width = html.clientWidth;
      settleCanvas.height = canvas.height = html.clientHeight;
    }

    function updateSettlePoints(flake) {
      var size = flake.size * 0.8; // reduce coral effect
      var xStart = Math.floor(flake.x - size);
      var range = size * 2;
      var newY;

      if (xStart < 0) {
        range += xStart;
        xStart = 0;
      }
      else if (xStart + range > settlePoint.length) {
        range -= xStart + range - settlePoint.length;
      }

      for (var i = 0; i < range; i++) {
        newY = flake.y - (size * Math.cos( (i/range) * Math.PI - (Math.PI/2) ));
        settlePoint[i + xStart] = Math.min(settlePoint[i + xStart] || Infinity, newY);
      }
    }
    
    var flakesToCreate = 0;
    function frame() {
      flakesToCreate += (snowflakesPerPixelPerSecond / assumedFps) * canvas.width;
      var flakesThisFrame = Math.floor(flakesToCreate);
      flakesToCreate -= flakesThisFrame;
      
      // clear canvas
      if (windowResized) {
        resizeCanvas();
        windowResized = false;
      }
      else {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      // add new flake?
      while ( flakesThisFrame-- ) {
        activeFlakes.push( new Snowflake(canvas.width) );
      }
      
      var i = activeFlakes.length;
      var flake;
      
      // for each flake...
      while (i--) {
        flake = activeFlakes[i];
        flake.tick();
        
        // splice flake if it's now out of rendering zone
        if (flake.y >= canvas.height || flake.y >= settlePoint[Math.floor(flake.x)]) {
          activeFlakes.splice(i, 1);
          // this flake effects our settle points
          if (flake.alpha > 0.8) {
            updateSettlePoints(flake);
          }
          settleContext.fillStyle='rgba(255, 255, 255, ' + flake.alpha + ')';
          settleContext.beginPath();
          settleContext.arc(flake.x, flake.y, flake.size, 0, PIx2, true);
          settleContext.closePath();
          settleContext.fill();
          continue;
        }
        
        // render to canvas
        context.fillStyle='rgba(255, 255, 255, ' + flake.alpha + ')';
        context.beginPath();
        context.arc(flake.x, flake.y, flake.size, 0, PIx2, true);
        context.closePath();
        context.fill();
      }
    }
    
    if (context) {
      resizeCanvas();
      
      // style the canvas
      canvasStyle.position = 'fixed';
      canvasStyle.top = 0;
      canvasStyle.left = 0;
      canvasStyle.zIndex = 1138;
      canvasStyle['pointerEvents'] = 'none';
      
      settleCanvasStyle.cssText = canvasStyle.cssText;
      
      // watch out for resizes
      window.addEventListener('resize', function() {
        windowResized = true;
      }, false);
      
      // add it to the page & start animating
      document.body.appendChild(canvas);
      document.body.appendChild(settleCanvas);
      setInterval(frame, 1000 / assumedFps);
    }
  })();
  
})();