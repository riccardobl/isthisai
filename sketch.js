
"use strict";
const RenderSettings={
    debug:true,
    async:false,
    frameLimit:60,
 

    worldSize:[480,640],
    color1:"#424874",
    color2:"#a6b1e1",

    color3:"#cbe2b0",
    color4:"#f1935c",

}

const PretrainedModels = [
    "https://training1.frk.wf/espresso1.json?time="+Date.now(),
    "espresso1.json?time="+Date.now()
];


function toP5v(v){
    return createVector(v.x,v.y);
}

function drawArrow(basex, vecx, myColor) {
    const base = createVector(basex.x, basex.y);
    base.mult(createVector(RenderSettings.worldSize[0], RenderSettings.worldSize[1]));
    const vec = createVector(vecx.x, vecx.y);
    vec.mult(createVector(RenderSettings.worldSize[0], RenderSettings.worldSize[1]));

    push();
    stroke(myColor);
    strokeWeight(1);
    fill(myColor);
    translate(base.x, base.y);
    line(0, 0, vec.x, vec.y);
    rotate(vec.heading());
    let arrowSize = 7;
    translate(vec.mag() - arrowSize, 0);
    triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
    pop();
}

const Assets = {

}

function preload() {
    Assets.coffee1 = loadImage("assets/coffee1.png");
    Assets.coffee2 = loadImage("assets/coffee2.png");
    Assets.caesar = loadImage("assets/caesar.png");
    Assets.chicken = loadImage("assets/chicken.png");

      

    Assets.slurp = new Howl({
        src: ['assets/Slurp-SoundBible.com-2051284741.ogg']
    });

    Assets.cough = new Howl({
        src: ['assets/old-man-cough.ogg']
    });

    Assets.music = new Howl({
        src: ['assets/September (Master).mp3'],
        loop: true
    });



}


const Renderer = {};
let gameLogic;
let currentLoopMode = 0;
let currentFramerate = -1;

class Renderable {
    constructor(background, image, voice) {
        this.background = background;
        this.image = image;
        this.voice = voice;
    }
    drawPixels(x, y, size, p) {
        if (this.background) {
            strokeWeight(3);
            stroke(RenderSettings.color1);
            fill(this.background);
            ellipse(x, y, size + 6, size + 6);
        }
        if (this.image) image(this.image, x - size / 2, y - size / 2, size, size);
    }
    draw(p) {
        const pos=toP5v(p.pos);

        const x = RenderSettings.worldSize[0] * pos.x;
        const y = RenderSettings.worldSize[1] * pos.y;
        const size = RenderSettings.worldSize[0] * p.size;

        this.drawPixels(x, y, size, p);
    }
}


function setup() {
    gameLogic = new Logic();
    let model=0;
    const loadPretrainedModel=()=>{

            if(model>=PretrainedModels.length){
                console.error("Can't load any pretrained model. Start fresh.");
                return;
            }
            const tryModel=PretrainedModels[model++];
            console.log("Try model",tryModel);
            const error=()=>{
                console.log("Can't load pretrained model",tryModel,"try next.");
                loadPretrainedModel();
            }
            const modelData=loadStrings(tryModel,()=>{
                if(gameLogic.deserialize(modelData)){
                    console.info("Loaded pretrained model",tryModel);
                }else{
                    console.error("Can't load pretrained model",tryModel);
                    error();
                }
            },error);

    };
    loadPretrainedModel();


    smooth();

    frameRate(RenderSettings.frameLimit);
    const a = RenderSettings.worldSize[0] / RenderSettings.worldSize[1];
    let imgSize = a * 256;

    Assets.coffee1.resize(imgSize, imgSize);
    Assets.coffee2.resize(imgSize, imgSize);
    Assets.chicken.resize(imgSize, imgSize);
    Assets.caesar.resize(imgSize, imgSize);

    RenderSettings.worldSize[1] = windowHeight;
    RenderSettings.worldSize[0] = windowHeight * a;

    createCanvas(RenderSettings.worldSize[0], RenderSettings.worldSize[1]);


    Renderer["Caesar"] = new Renderable(
        null,
        Assets.caesar,
        -0.2
    );

    Renderer["Chicken"] = new Renderable(
        null,
        Assets.chicken,
        0.5
    );

    Renderer["Food"] = new Renderable(
        RenderSettings.color3,
        Assets.coffee1,
        null
    );

    Renderer["Poison"] = new Renderable(
        RenderSettings.color4,
        Assets.coffee2,
        null
    );

    Assets.music.play();

}




function draw() {

    const rewardCallback = (reward, player, pickup) => {
        const rr = Renderer[player.constructor.name];
        if (!rr) return;
        const voice = rr.voice;

        if (reward > 0) {
            Assets.slurp.rate(1. + voice);
            Assets.slurp.play();
        } else {
            Assets.cough.rate(1. + voice);
            Assets.cough.play();
        }
        console.log("Rewarded", reward);
    };

    const expectedLoopMode = RenderSettings.async ? 2 : 1;
    if (currentLoopMode != expectedLoopMode) {
        if (RenderSettings.async) {
            const loop=()=>{
                gameLogic.loop(1000./60.,rewardCallback);
                if(RenderSettings.async)setTimeout(loop,0);
            };
            loop();
        }
        currentLoopMode = expectedLoopMode;
        console.log("Changed loop mode",expectedLoopMode)
    }
    if (!RenderSettings.async) gameLogic.loop(deltaTime,rewardCallback);

    background(RenderSettings.color2);
    select("body").style("background", RenderSettings.color1);

    noFill();
    stroke(RenderSettings.color4)
    strokeWeight(3)
    rect(0, 0, width, height);
    stroke(RenderSettings.color1)

    for (let i = 0; i < gameLogic.getPickups().length; i++) {
        const p = gameLogic.getPickups()[i];
        Renderer[p.constructor.name].draw(p);
    }

    let line = 0;
    let spacing = 10;
    textSize(24)
    textAlign("right", "top")
    fill(RenderSettings.color1);


    for (let i in gameLogic.getPlayers()) {
        const player = gameLogic.getPlayers()[i];
        Renderer[player.constructor.name].draw(player);
        // player.draw();
        line += spacing;
        text(player.name + ": " + player.value.toFixed(2), width - 10, line)
        line += 24;
    }

    textAlign("left", "top")

    if (currentFramerate < 0) currentFramerate = frameRate();
    else currentFramerate = lerp(currentFramerate, frameRate(), 0.1);
    text("FPS: " + currentFramerate.toFixed(1), spacing, spacing);

    if (RenderSettings.debug) {
        for (let j in gameLogic.getPlayers()) {
            const player = gameLogic.getPlayers()[j];
            const fw=toP5v(player.getForward());


            for (let i = 0; i < gameLogic.getPickups().length; i++) {
                const pickup = gameLogic.getPickups()[i];

                const p2p = p5.Vector.sub(toP5v(pickup.pos), toP5v(player.pos));
                const d = fw.dot(p2p);

                drawArrow(player.pos, p2p, d > 0 ? "green" : "red");
            }
            drawArrow(player.pos, fw.normalize().mult(0.08), 'black');
        }
    }

}
