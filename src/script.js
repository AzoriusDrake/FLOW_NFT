
import * as Utils from "./utils.js";
import Vector from "./vector.js";
import { noise } from "./perlin.js";
import * as Tone from 'tone';

// import { GUI } from 'dat.gui'

import './style.css';

const configFile =
    "https://assets.codepen.io/6722884/DigiScapes_5_config+.json";


const connectButton = document.getElementById('walletButton');
const mintButton = document.getElementById('mintButton');

const api = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
console.log("xrpl api");
console.log(api);
let isConnected = false;
const walletAddress = 'rsQyPD6nhrcXimdnq5F7rqZE867DikLMDF';
const walletSecret = 'sEdS44vZ1J3PqVVsiitv9g354F86wWW';
let canvasImage = null;

/// XRPL INTEGRATION
async function connectXRPL() {
    if (!isConnected) {
        try {
            await api.connect();
            isConnected = true;
            console.log('Connected to XRP Testnet Wallet!');
        } catch (error) {
            console.log('Error connecting: ' + error.message);
        }
    } else {
        console.log('Already connected!');
    }
}

async function mintToken(uri = "FlowUri") {
    if (!isConnected) {
        console.log('Please connect to the wallet first!');
        return;
    }

    let results = 'Connecting to XRP Testnet...';
    console.log(results);

    const standby_wallet = xrpl.Wallet.fromSeed(walletSecret); // Use your testnet secret here

    try {
        // Note that you must convert the token URL to a hexadecimal 
        // value for this transaction.
        const transactionJson = {
            "TransactionType": "NFTokenMint",
            "Account": standby_wallet.classicAddress,
            "URI": xrpl.convertStringToHex(uri), // Replace with your NFT URI
            "Flags": 0,
            "TransferFee": 0,
            "NFTokenTaxon": 0 // Required, but if you have no use for it, set to zero.
        };

        const tx = await api.submitAndWait(transactionJson, { wallet: standby_wallet });
        const nfts = await api.request({
            method: "account_nfts",
            account: standby_wallet.classicAddress
        });
        results += '\n\nxrpl token, ipfs: ' + uri;
        results += '\n\nTransaction result: ' + tx.result.meta.TransactionResult;
        results += '\n\nNFTs: ' + JSON.stringify(nfts, null, 2);

        console.log(results);
    } catch (error) {
        console.log('Error minting NFT: ' + error.message);
    }
}
connectButton.addEventListener('click', connectXRPL);

/// MAIN SETUP

const ctx = Utils.qs("canvas").getContext("2d");
ctx.fillStyle = "red";
ctx.fillRect(10, 10, 80, 80);

const TAU = Math.PI * 2;

const preloader = document.querySelector('.start');
const cyclesAmountDiv = document.querySelector("footer .cycles .amount");
const cyclesTotalDiv = document.querySelector("footer .cycles .total");
const drawCanvas = document.querySelector("canvas.js-canvas");
const container = document.querySelector(".container");
const thumbnails = document.querySelector(".thumbnails");
const rangeCycles = document.querySelector('.range__cycles');
const rangeScale = document.querySelector('.range__scale');
const rangeDepth = document.querySelector('.range__depth');
const rangeStyle = document.querySelector('.range__style');
const rangeMultiplier = document.querySelector('.range__multiplier');
const bubbleCycles = document.querySelector('.bubble__cycles');
const bubbleScale = document.querySelector('.bubble__scale');
const bubbleDepth = document.querySelector('.bubble__depth');
const bubbleStyle = document.querySelector('.bubble__style');
const bubbleMultiplier = document.querySelector('.bubble__multiplier');

/// DEV STATS
/// const stats = new Stats();
///container.appendChild(stats.dom);

let gui;
let noiseFunctionGuiController;
let paletteGuiController;
let noiseScaleGuiController;
let noiseMultiplierGuiController;
let formulaGuiController;
let isUpdatingGui = false;
let isPaused = false;

let W = 800;
let H = 200;
let MID_X = W >> 1;
let MID_Y = H >> 1;
let HYPO = Math.hypot(W, H);

let noiseFunction = "perlin2";
let palette = "kazen";
let noiseScale = 0.09;
let noiseMultiplier = 1;
let formula = "none";

let maxIterations = 500;

let count = 0;
let startTime, endTime, elapsedTime;

let shouldRun = false;

let isAudioInited = false;
let isAudioStarted = false;
let isAudioMuted = false;
let masterVolume;
let audioMasterVolume = 0;
let player;
const audioPath = 'audio/flowSample.wav';

const paletteDivs = [];
const paletteNames = [
    "Fire",
    "Water",
    "Rainbow",
    "World",
    "Universe",
    "Lights",
    "Sunrise",
    "Gems",
    "Divine",
    "Kazen"
];

const PALETTES = {
    Fire: "ffb114-fa7610-ff5912-fc3f00-ff2205-f70000-cb0000-a80000-ff4d00-ffcc00",
    Earth: "dbff70-00521f-85ff0a-007a00-b8fb88-005200-47e000-205600-b6f452",
    Water: "03045e-023e8a-0077b6-0096c7-00b4d8-48cae4-90e0ef-ade8f4-caf0f8",
    Rainbow: "ffff00-ffc000-ff8000-ff4000-ff0000-c00040-800080-4000c0-0000ff",
    World:
        "c03908-e67c1f-f8ed75-cbdf68-7ec42a-2dc05c-28a9d8-489ff5-dafbf2-ffffff",
    Universe: "00b2ff-f50000-00b2ff-f50000-00b2ff-f50000-00b2ff-f50000-00b2ff",
    Lights: "ff70b3-da99ff-85d6ff-adffcd-fff599",
    Sunrise:
        "ff6d00-9d4edd-ff7900-7b2cbf-ff8500-5a189a-ff9100-3c096c-ff9e00-240046",
    Gems: "d77a1d-df8a36-e79a4e-dcac6d-d1be8b-89d8af-57d5b2-24d2b4-26baa2",
    Divine: "090a0b-ffff85-8e99a4-dee2e6-ffff00-dee2e6-8e99a4-ffff85-090a0b",
    Kazen: "000000-5c5c5c-999999-da3131-9c1c1c-b8b8b8-999999-5c5c5c-000000"
};

const scaleMap = {
    "1": 0.001,
    "2": 0.003,
    "3": 0.005,
    "4": 0.007,
    "5": 0.01,
    "6": 0.025,
    "7": 0.05,
    "8": 0.1
}

const multiplierMap = {
    "1": 1,
    "2": 2,
    "3": 5,
    "4": 10,
    "5": 25,
    "6": 50,
    "7": 200,
    "8": 500
}

const options = {
    palette: "Kazen",
    maxIterations: 500,
    noiseScale: 0.01,
    noiseMultiplier: 50,
    noiseFunction: "perlin2",
    formula: "none",
    timeUpdate: 0.1,
    load: function () {
        loadConfig();
    },
    pause: function () {
        togglePause();
    }
};

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    return result
        ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ]
        : null;
};

const formulas = {
    none: () => new Vector(0, 0),

    astroid: (x, y) => {
        const xt = Math.pow(Math.cos(x), 3);
        const yt = Math.pow(Math.sin(y), 3);

        return new Vector(xt, yt);
    },

    maltese: (x, y) => {
        const xt = (2 * Math.cos(x)) / Math.sqrt(Math.sin(4 * x));
        const yt = (2 * Math.sin(y)) / Math.sqrt(Math.sin(4 * y));

        return new Vector(xt, yt);
    },

    cycloid: (x, y) => {
        const xt = Math.cos(x) * (2 * Math.cos(2 * x) + 1);
        const yt = Math.sin(y) * (2 * Math.cos(2 * y) + 1);

        return new Vector(xt, yt);
    },

    tschirnhausen: (x, y) => {
        const xt = 1 - 3 * Math.pow(x, 2);
        const yt = 3 - Math.pow(y, 2);

        return new Vector(xt, yt);
    }
};

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let imagedata = null;
let colors = [];
let points = [];
let time = 0;
let rafId = null;

/// ON START

generatePalettes();
initCanvas();
randomizeValues();
runAsyncFunctions();
window.addEventListener("resize", onWindowResize);
window.screen.orientation.onchange = onWindowResize;

setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    togglePause();
}, 500);

/// PRELOADER-COVER
async function runAsyncFunctions() {
    changePreloaderText('CONNECTING');
    setTimeout(() => {
        togglePause();
        hidePreloader();
        //ctx.canvas.addEventListener("click", onClick);
    }, 3000);
}

function changePreloaderText(newText) {
    preloader.textContent = newText;
}

function hidePreloader() {
    preloader.classList.add('hidden');
}

function showPreloader() {
    preloader.classList.remove('hidden');
}
function togglePreloader(active = true, text = null) {

    if (text != null) {
        changePreloaderText(text);
    }
    if (active) {
        showPreloader();
    } else {
        hidePreloader()
    }
}

/// DRAW

function initCanvas() {
    W = container.offsetWidth;
    H = W / 4;

    //W = Math.floor(window.innerWidth * 0.88);
    //H = Math.floor(W / 3);
    MID_X = W >> 1;
    MID_Y = H >> 1;
    HYPO = Math.hypot(W, H);
    ctx.canvas.width = W;
    ctx.canvas.height = H;
}

function getColors(name = null) {
    let c;
    const paletteName = name || palette;
    const capitalized = paletteName.charAt(0).toUpperCase() + paletteName.slice(1);
    c = PALETTES[capitalized]
        .split("-")
        //.splice(1)
        .map((hex) => hexToRgb(`#${hex}`));

    return c;
}

function getPointColor(pos) {
    const dist = Utils.distanceBetween(new Vector(), pos);
    const colorIndex = Math.round((colors.length - 1) * (dist / HYPO));
    const rgb = colors[colorIndex];

    return rgb;
};

function drawPoint(ctx, point, rgb) {
    ctx.beginPath();
    ctx.fillStyle = `rgb(${rgb.join(", ")})`;
    ctx.arc(point.x, point.y, 0.7, 0, TAU, false);
    ctx.fill();
    ctx.closePath();
};

function clear() {
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
};

function draw() {
    // Draw Function will be openSource at each season release
};

function loop() {
    if (shouldRun) {
        draw();
        count++;
        maxIterations = Number(rangeCycles.value);

        onTimerUpdate();
        if (cyclesTotalDiv && cyclesAmountDiv) {
            cyclesAmountDiv.textContent = count;
            cyclesTotalDiv.textContent = `/${maxIterations}`;
        }

        if (count < maxIterations) {
            rafId = requestAnimationFrame(loop);
        } else {
            onDrawingFinished();
        }
    }
}

function onDrawingFinished() {
    //console.log("onDrawingFinished");
}

function run() {
    
};

function onClick() {
    // if (!isAudioInited) initAudio();
    run();
}

function updateGui() {
    if (gui !== undefined) {
        isUpdatingGui = true;

        paletteGuiController.setValue(palette);
        noiseFunctionGuiController.setValue(noiseFunction);
        noiseScaleGuiController.setValue(noiseScale);
        noiseMultiplierGuiController.setValue(noiseMultiplier);
        formulaGuiController.setValue(formula);

        isUpdatingGui = false;
    }
}

function togglePause() {
    shouldRun = !shouldRun;
    if (shouldRun) loop();
}


/// UI 
function onGuiUpdate() {
    if (isUpdatingGui === false) {
        palette = options["palette"];
        noiseFunction = options["noiseFunction"];
        noiseScale = options["noiseScale"];
        noiseMultiplier = options["noiseMultiplier"];
        formula = options["formula"];
    }

    run();
}

function updateSliders() {
    if (isUpdatingGui === false) {
        palette = options["palette"];

        noiseScale = scaleMap[rangeScale.value];
        noiseMultiplier = multiplierMap[rangeMultiplier.value];

        //console.log(noiseScale + " " + noiseMultiplier);

        const depthValue = Number(rangeDepth.value);
        noiseFunction = depthValue === 1 ? 'perlin2' : depthValue === 2 ? 'perlin3' : 'simplex3';
        const styleValue = Number(rangeStyle.value);
        formula = styleValue === 1 ? 'none' : styleValue === 2 ? 'astroid' : styleValue === 3 ? 'cycloid' : 'tschirnhausen';
    }

    run();
}

function generatePalettes() {
    // :)
}

function setActivePalette(name) {
    paletteDivs.map(pd => {
        if (pd.name === name) pd.div.classList.add('selected');
        else pd.div.classList.remove('selected');
    });

    options["palette"] = name;
    updateSliders();
}

function initGui() {

    let h = gui.addFolder("Options");

    paletteGuiController = h
        .add(options, "palette", paletteNames)
        .onFinishChange(onGuiUpdate);

    h.add(options, "maxIterations").step(1).min(500).max(3000).onFinishChange(run);

    noiseScaleGuiController = h
        .add(options, "noiseScale")
        .step(0.01)
        .min(0.01)
        .max(0.5)
        .onFinishChange(onGuiUpdate);

    noiseMultiplierGuiController = h
        .add(options, "noiseMultiplier", [1, 5, 10, 20, 30, 50, 200])
        .onFinishChange(onGuiUpdate);

    noiseFunctionGuiController = h
        .add(options, "noiseFunction", ["perlin2", "perlin3", "simplex3"])
        .onFinishChange(onGuiUpdate);

    formulaGuiController = h
        .add(options, "formula", ["none", ...Object.keys(formulas)])
        .onFinishChange(onGuiUpdate)
        .listen();
   
    h.closed = false;

    onGuiUpdate();

}

/// DEV DatGui
// gui = new GUI();
// initGui();

/// TIMER
function startTimer() {
    startTime = new Date();
}

function onTimerUpdate() {
    endTime = new Date();
    let timeDiff = endTime - startTime; //in ms
    // strip the ms
    timeDiff /= 1000;

    // get seconds
    elapsedTime = Math.round(timeDiff);
    //console.log(elapsedTime + " seconds");
}

function endTimer() {
    console.log("endTimer");
}

/// UI


const pause = document.querySelector(".button__pause");
if (pause) {
    pause.addEventListener("click", function (e) {
        togglePause();
        if (shouldRun) {
            pause.innerText = "pause";
        } else {
            pause.innerText = "resume";
        }
    });
}



/// CANVAS MANIPULATION
function createCanvasImage() {
    const encodedImage = drawCanvas.toDataURL();
    canvasImage = {
        data: encodedImage,
        mimeType: "image/png",
        fileName: "FlowCanvas.png"
    };
}

function getCanvasImage() {
    if (isMobile) {
        togglePause();
        drawCanvas.toBlob(async (blob) => {
            const filesArray = [
                new File(
                    [blob],
                    'image.jpg',
                    {
                        type: "image/jpeg",
                        lastModified: new Date().getTime()
                    }
                )
            ];
            const shareData = {
                files: filesArray,
            };
            try {
                await navigator.share(shareData);
            } catch (e) {
                console.error(e);
            }
        });
    } else {
        const link = document.createElement("a");
        link.download = "FlowCanvas.png";
        link.href = drawCanvas.toDataURL();
        link.click();
        link.delete();
    }
}

const download = document.querySelector(".button__download");
if (download) {
    download.addEventListener("click", function (e) {
        //getCanvasImage();
    });
}

const allRanges = document.querySelectorAll('.option');
allRanges.forEach(option => {
    const range = option.querySelector('.range');
    const bubble = option.querySelector('.bubble');

    range.addEventListener('input', () => {
        setBubble(range, bubble);
        updateSliders();
    });

    setBubble(range, bubble);
});

function setBubble(range, bubble) {
    const val = range.value;
    const min = range.min ? range.min : 0;
    const max = range.max ? range.max : 0;
    bubble.innerHTML = val;

    const halfThumbWidth = 20;
    const left = (((val - min) / (max - min)) * ((range.clientWidth - halfThumbWidth) - halfThumbWidth)) + 27;
    bubble.style.left = `${left}px`;
}

const randomizeButton = document.querySelector('.button__randomize');
if (randomizeButton) {
    randomizeButton.addEventListener('click', randomizeValues);
}

function repositionSliders() {
    setBubble(rangeScale, bubbleScale);
    setBubble(rangeMultiplier, bubbleMultiplier);
    setBubble(rangeDepth, bubbleDepth);
    setBubble(rangeCycles, bubbleCycles);
    setBubble(rangeStyle, bubbleStyle);
}

function randomizeValues() {
    const randomScaleValue = Number(getRandomNumber(Number(rangeScale.min), Number(rangeScale.max)).toFixed(2));
    rangeScale.value = randomScaleValue;
    const randomMultiplierValue = Math.round(getRandomNumber(Number(rangeMultiplier.min), Number(rangeMultiplier.max)));
    rangeMultiplier.value = randomMultiplierValue;
    const randomDepthValue = Math.round(getRandomNumber(Number(rangeDepth.min), Number(rangeDepth.max)));
    rangeDepth.value = randomDepthValue;
    const randomStyleValue = Math.round(getRandomNumber(Number(rangeStyle.min), Number(rangeStyle.max)));
    rangeStyle.value = randomStyleValue;
    const randomCyclesValue = Math.round(getRandomNumber(Number(rangeCycles.min), Number(rangeCycles.max)));
    rangeCycles.value = randomCyclesValue;
    const randomPaletteValue = paletteNames[Math.round(getRandomNumber(0, paletteNames.length - 1))];
    setActivePalette(randomPaletteValue);

    repositionSliders();

    updateSliders();
}

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}



const generateSoundtrackButton = document.querySelector('.button__audio');
if (generateSoundtrackButton) {
    generateSoundtrackButton.addEventListener('click', () => {

        togglePreloader(true, "AI CREATING MUSIC");

        console.log('getCanvas');
        createCanvasImage();
        console.log(canvasImage);
        console.log('img2txt');
        console.log('txt2audio');


        setTimeout(() => {
            togglePreloader(false);
            initAudio();
            startAudio();
            run();
        }, 1800);

        //initAudio();
        //startAudio();

    });
}

const restartButton = document.querySelector('.button__restart');
if (restartButton) {
    restartButton.addEventListener('click', () => {
        run();
    });
}

const requestMintButton = document.querySelector('.button__mint');
if (requestMintButton) {
    requestMintButton.addEventListener('click', () => {
        const config = {
            palette,
            noiseFunction,
            noiseMultiplier,
            noiseScale,
            maxIterations,
            formula,
            audioPath
        };
        console.log('get Config');
        console.log({ config });
        console.log('set cover Image: ')
        console.log('set audio track');

        console.log('store & pack');
        console.log('retrieve ipfs');

        ///MINT TOKEN 
        mintToken("MyFlowIpfs");

    });
}

/// LISTENERS

function onWindowResize() {
    //console.log('test')
    repositionSliders();
    initCanvas();
    run();
    /*
    shouldRun = false;
    shouldRun = true;
    */
}

///  CONFIG

function loadConfig() {
    console.log("loadConfig");
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.onload = function () {
        const data = JSON.parse(this.responseText);
        onConfigLoad(data);
    };
    xmlhttp.open("GET", configFile);
    xmlhttp.send();
}

function onConfigLoad(content) {
    console.log(content);

    palette = content.palette;
    noiseFunction = content.noiseFunction;
    noiseScale = content.noiseScale;
    noiseMultiplier = content.noiseMultiplier;
    formula = content.formula;

    updateGui();

    run();
}

/// AUDIO

function initAudio() {
    if (player) player.dispose();
    player = new Tone.Player({
        url: audioPath,
        loop: true,
        autostart: true,
        onload: () => {
            isAudioInited = true;
            console.log("InitAudio, isAudioInited: " + isAudioInited);
        }
    });
}

function startAudio() {
    player.toDestination();

    console.log("startAudio: isAudioStarted: " + isAudioStarted);
}

function resetAudio() {
    isAudioStarted = false;
    /*
    if (masterVolume !== undefined) {
      //masterVolume.dispose();
    }
    */
}

function disposeAudio() {
    /*
    if (masterVolume !== undefined) {
      masterVolume.dispose();
    }
    */
    console.log("disposeAudio");
}

function toggleAudioMute() {
    isAudioMuted = !isAudioMuted;
    Tone.Master.mute = isAudioMuted;
    console.log(isAudioMuted + "  " + Tone.Master.mute);
}


