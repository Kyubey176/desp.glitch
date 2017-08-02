// create web audio api context
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Create a gain node.
var gainNode = audioCtx.createGain();
// Connect the gain node to the destination.
gainNode.connect(audioCtx.destination);
gainNode.gain.value = 0.5;

var offset = 0; //(notes['C3'] - notes['F2']) * 1;
// var offset = 0 - ((notes['C3'] - notes['C#3']) * -0);


function makeDistortionCurve(amount) {
  var k = typeof amount === 'number' ? amount : 50,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for ( ; i < n_samples; ++i ) {
    x = i * 2 / n_samples - 1;
    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
  }
  return curve;
};

function createOscillator(hz) {
  // create Oscillator node
  var oscillator = audioCtx.createOscillator();
  oscillator.type = Math.random() > 0.5 ? 'sine' : 'sine';
  oscillator.frequency.value = hz; // value in hertz
  // console.log(hz);
  
  var highpass = audioCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 0;
  highpass.Q.value = 10;
  var lowpass = audioCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 50000;
  lowpass.Q.value = 10;
  var distortion = audioCtx.createWaveShaper();
  oscillator.connect(lowpass);
  lowpass.connect(highpass);
  // oscillator.connect(gainNode);
  oscillator.start();
  oscillator.highpass = highpass;
  oscillator.lowpass = lowpass;
  oscillator.distortion = distortion;
  distortion.curve = makeDistortionCurve(100);
  distortion.oversample = '4x';
  
  // Connect the source to the gain node.
  highpass.connect(distortion);
  distortion.connect(gainNode);
  return oscillator;
}

// var oscillators = [48 + offset, 56 + offset, 64 + offset].map(hz => {
var oscillators = [notes['C2']  + offset, notes['G2'] + offset, notes['D3'] + offset,
                   notes['C3']  + offset, notes['G3'] + offset, notes['D4'] + offset].map(createOscillator);

// biquadFilterNode.connect(gainNode);

function Sequencer() {
  
}

function Sequence(notes, interval, target) {
    this.notes = notes;
    this.interval = interval;
    this.length = notes.length * interval;
    this.target = target;
}

// var seq = new Sequence([
//    'F1',
//    'A2',
//    'C2',
//    'E2',
// ], 1/2);


var seqA = new Sequence([
   notes['D3'],
   notes['C3'],
   notes['G3'], // notes['A3'],
   notes['G2'],
   notes['G3'],
   notes['G2'],
], 2, oscillators[0].frequency);

var seqB = new Sequence([
   notes['D4'],
   notes['C4'],
   notes['F4'],
   notes['G3'],
], 1/4, oscillators[1].frequency);


function Timeline() {
   this.looping = [];
   this.deferred = {};
   this.thunks = {};
   this.BPM = 80;
   this.barLength = (60 / this.BPM) * 4;
   this.scheduled = {};
}

Timeline.prototype.loop = function(seq, delay) {
   if (delay) {
     this.deferred[delay] = seq;
   } else {
     this.looping.push(seq);
   }
}

Timeline.prototype.thunk = function(thunk, delay) {
   this.thunks[delay] = thunk;
}

Timeline.prototype.schedule = function() {
   var now = new Date().getTime();
   var cur = audioCtx.currentTime;
   var nextBar = (Math.ceil(cur / this.barLength) * this.barLength) / this.barLength;
   // console.log([nextBar, this.barLength, cur]);
   if (this.deferred[nextBar]) {
       this.loop(this.deferred[nextBar]);
       delete this.deferred[nextBar];
   }
   if (this.thunks[nextBar]) {
       this.thunks[nextBar]();
       delete this.thunks[nextBar];
   }
   this.looping.forEach((seq) => {
     var nextBar = Math.ceil(cur / seq.length) * seq.length;
     if (!this.scheduled[nextBar]) {
       this.scheduled[nextBar] = true;
       var interval = this.barLength * seq.interval;
       // oscillators[0].frequency.linearRampToValueAtTime(seq.notes[0] + offset, nextBar);
       // oscillators[0].frequency.linearRampToValueAtTime(seq.notes[0] + offset, nextBar + (interval * 0.9999));
       // oscillators[0].frequency.linearRampToValueAtTime(seq.notes[1] + offset, nextBar + (interval * 1));
       // oscillators[0].frequency.linearRampToValueAtTime(seq.notes[1] + offset, nextBar + (interval * 1.9999));
       // oscillators[0].frequency.linearRampToValueAtTime(seq.notes[2] + offset, nextBar + (interval * 2));
       // oscillators[0].frequency.linearRampToValueAtTime(seq.notes[2] + offset, nextBar + (interval * 2.9999));
       // oscillators[0].frequency.linearRampToValueAtTime(seq.notes[3] + offset, nextBar + (interval * 3));
       // oscillators[0].frequency.linearRampToValueAtTime(seq.notes[3] + offset, nextBar + (interval * 3.9999));
       seq.target.linearRampToValueAtTime(seq.notes[0] + offset, nextBar);
       seq.target.setValueAtTime(seq.notes[1] + offset, nextBar + (interval * 1));
       seq.target.setValueAtTime(seq.notes[2] + offset, nextBar + (interval * 2));
       seq.target.setValueAtTime(seq.notes[3] + offset, nextBar + (interval * 3));
     }     
   });
}

var timeline = new Timeline();
timeline.loop(seqA);
timeline.loop(seqB, 8);
timeline.thunk(() => {
  oscillators[1].type = 'sine';
  oscillators[1].lowpass.frequency.linearRampToValueAtTime(100, 18);
  oscillators.push(createOscillator(notes['G2'] + offset));
}, 16);

// var nextKey = [
//    notes['B4'],
//    notes['A4'],
//    notes['F3'],
//    notes['G3'],
// ];

var notePool = [
  'F3', 'G3',
  'A4', 'B4', 'C4', 'D4', 'E4',
];

var leads = [
  [
   notes['D4'],
   notes['C4'],
   notes['F4'],
   notes['G3'],
  ],
  [
   notes['B4'],
   notes['A4'],
   notes['F3'],
   notes['G3'],
  ],
];

function randomizeLead() {
  leads = leads.map(ns => ns.map(n => notes[notePool[Math.floor(Math.random()*(notePool.length-1))]]));
  console.log(leads);
}

currentLead = 0;

function keyChange(time) {
  var change = leads[currentLead];
  currentLead++;
  currentLead = currentLead === leads.length ? 0 : currentLead;
  // nextKey = seqB.notes;
  if (Math.random() > 0.9) {
    var t = 200 + (Math.random() * 50000);
    oscillators.forEach(function(o){
        o.highpass.frequency.cancelScheduledValues();
        o.highpass.frequency.linearRampToValueAtTime(t, time + 2);
    });
  }
  timeline.thunk(() => {
    seqB.notes = change;
    keyChange(time + 4);
  }, time);
}

keyChange(12);

document.body.addEventListener('click', function(event){
  randomizeLead();
})

setInterval(function(){
  timeline.schedule();
}, 16);

// oscillators[0].frequency.linearRampToValueAtTime(notes['C2'], 2);
// oscillators[1].frequency.linearRampToValueAtTime(notes['E2'], 2.4);
// oscillators[2].frequency.linearRampToValueAtTime(notes['D1'], 2);

// oscillators[0].frequency.linearRampToValueAtTime(notes['C3'], 4);
// oscillators[1].frequency.linearRampToValueAtTime(notes['C2'], 4.1);
// oscillators[2].frequency.linearRampToValueAtTime(notes['F1'], 4.2);

// oscillators[0].frequency.linearRampToValueAtTime(notes['F2'], 60);
// oscillators[1].frequency.linearRampToValueAtTime(notes['A3'], 60);
// oscillators[2].frequency.linearRampToValueAtTime(notes['C4'], 60);

// setTimeout(function(){
//   gainNode.gain.linearRampToValueAtTime(0, 120);
//   oscillators[0].frequency.linearRampToValueAtTime(notes['F2'], 90);
//   oscillators[1].frequency.linearRampToValueAtTime(notes['A2'], 90);
//   oscillators[2].frequency.linearRampToValueAtTime(notes['C2'], 90);
// }, 80 * 1000);

// var hzs = [new TimedRange(notes['C2'], notes['D2'], 1000), new TimedRange(notes['F2'], notes['D3'], 1000), new TimedRange(notes['A2'], notes['G#1'], 1000)];
// var i = 0;

// function TimedRange(a, b, d) {
//   this.init = a;
//   this.target = b;
//   this.delta = Math.abs(b-a);
//   this.start = new Date().getTime();
//   this.duration = d;
//   this.end = this.start + this.duration;
// }

// TimedRange.prototype.value = function() {
//   let curr = new Date().getTime();
//   if (curr > this.end) {
//     return this.target;
//   }
//   return easingLib.easeInQuad(this.duration - (this.end - curr), this.init, this.delta, this.duration);
// }

// function loop() {
//   hzs.forEach((hz, i) => {
//     console.log(hz.value());
//     oscillators[i].frequency.value = hz.value();
//   });
//   // hzs = i % 2 === 0 ? [120, 56, 80]: [48, 56, 64];
//   i++;
//   setTimeout(loop, 16);
// }

// loop();


// VISUZLIZER

var analyser = audioCtx.createAnalyser();
gainNode.connect(analyser);

// ...
var width = document.body.clientWidth;
var height = document.body.clientHeight;

function setupBuffer(rez) {
  analyser.fftSize = rez;
  var bufferLength = analyser.frequencyBinCount;
  var buffer = new Uint8Array(bufferLength);
  buffer.len = bufferLength;
  return buffer;
}

function fill(buffer) {
  // analyser.getByteFrequencyData(buffer);
  analyser.getByteTimeDomainData(buffer);
}

var bufferSize = 32;

var timeDomain = setupBuffer(bufferSize);
fill(timeDomain);

// Get a canvas defined with ID "oscilloscope"
var canvas = document.getElementById("oscilloscope");
var foreCanvas = document.getElementById("foreground");
canvas.width = foreCanvas.width = width;
canvas.height = foreCanvas.height = height;
var canvasCtx = canvas.getContext("2d");
var foreCtx = foreCanvas.getContext("2d");

// draw an oscilloscope of the current audio source
canvasCtx.fillStyle = 'rgba(255, 255, 255, 1)';
// canvasCtx.strokeStyle = 'rgba(0, 5, 5, 1)';
canvasCtx.strokeStyle = `hsl(${Math.random() * 360}, 80%, 70%)`;
canvasCtx.lineWidth = 1;
foreCtx.strokeStyle = '#ffffff'; // `hsl(${Math.random() * 360}, 80%, 70%)`;
foreCtx.lineWidth = 3;

var clearCanvas = true;
  
  // var w = canvas.width / 10;
  var w = canvas.width / 50;
  var h = canvas.height / 50;

var background = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);

var polarity = 1;

function animationSequence() {
  // var lineInterval = 1 + (Math.random()*2);
  var lineInterval = 0.5;
  let bufGrow = setInterval(function(){
      timeDomain = setupBuffer(Math.max(bufferSize+=( polarity == 1 ? bufferSize : -(bufferSize/2)), 32));
      canvasCtx.lineWidth += polarity; // (canvasCtx.lineWidth / lineInterval);
      foreCtx.lineWidth += polarity; // (canvasCtx.lineWidth / lineInterval);
      // w += (w / (lineInterval ));
      fill(timeDomain);
      if (bufferSize > 5000 || bufferSize === 32) {
        clearCanvas = false;
      }
      if (bufferSize > 5000 || bufferSize === 32) {
        clearInterval(bufGrow);
        setTimeout(function(){
            var s = canvasCtx.strokeStyle;
            var f = canvasCtx.fillStyle;
            // w = canvas.width / 10;
            canvasCtx.fillStyle = s;
            canvasCtx.strokeStyle = `hsl(${Math.random() * 360}, 80%, 70%)`;
            // canvasCtx.lineWidth = foreCtx.lineWidth = 1;
            background = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
            clearCanvas = true;
            animationSequence();
            // bufferSize = 32;
            // timeDomain = setupBuffer(bufferSize);
            // fill(timeDomain);
            polarity = -polarity;
        }, 2000);
        // setTimeout(function(){
        //    canvasCtx.lineWidth = 1;
        // }, 10000);
      }
  }, 2000);
}
animationSequence();

let degree = 1;
let iter = 1;
let tpos = { x: 0, y: 0 };
function draw() {
  if (tpos.y < canvas.height-h) {
    tpos.y += h;
  } else {
    tpos.x += w;
    tpos.y = 0;
  }
  if (tpos.x > canvas.width-w) {
    tpos.x = 0;
  }
  canvasCtx.save();
  canvasCtx.translate(tpos.x, tpos.y);
  // canvasCtx.translate( canvas.width / 2, canvas.height / 2);
  // canvasCtx.rotate(degree++ * Math.PI / 180);
  // canvasCtx.translate( -(canvas.width / 2), -(canvas.height / 2));

  iter++;
  if (iter % 5 === 0) {
    canvasCtx.strokeStyle = `hsl(${Math.random() * 360}, 80%, 70%)`;
  }

  // var drawVisual = requestAnimationFrame(
  //   () => requestAnimationFrame(
  //     // () => requestAnimationFrame(
  //     //       () => requestAnimationFrame(
  //               () => requestAnimationFrame(draw)
  //     //     )
  //     // )
  //   )
  // );
  var drawVisual = requestAnimationFrame(draw);
  
  fill(timeDomain);

  if (clearCanvas) {
    // canvasCtx.putImageData(background, 0, 0);
  }
  foreCtx.clearRect(0, 0, foreCanvas.width, foreCanvas.height);

  canvasCtx.beginPath();
  foreCtx.beginPath();

  var sliceWidth = w * 1.0 / timeDomain.len;
  var x = 0;
  
  var foreSliceWidth = foreCanvas.width * 1.0 / timeDomain.len;
  var fx = 0;
  
  
  var sliceIndexs = new Array(timeDomain.len).fill(0).map((_, i) => i).sort(function(){ return Math.random() > 0.5; });

  for (var i = 0; i < timeDomain.len; i++) {

    // var v = dataArray[sliceIndexs[i]] / 128.0;
    var v = timeDomain[i] / 128.0;
    var y = v * h / 2;
    var fy = v * foreCanvas.height / 2;
    
    // canvasCtx.translate(canvas.width / 2, canvas.height / 2);
    // canvasCtx.rotate(((90 / timeDomain.len) * i) * Math.PI / 180);
    // canvasCtx.translate(-(canvas.width / 2), -(canvas.height / 2));

    if (i === 0) {
      foreCtx.moveTo(fx, fy);
      canvasCtx.moveTo(x, y);
    } else {
      foreCtx.lineTo(fx, fy);
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
    fx += foreSliceWidth;
  }
  foreCtx.lineTo(foreCanvas.width, fy);
  foreCtx.stroke();
  foreCtx.closePath();
  
  canvasCtx.lineTo(w, y);
  canvasCtx.stroke();
  canvasCtx.restore();

};

draw()