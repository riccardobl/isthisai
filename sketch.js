const Rewards={
    poison: -1,
    food:1.0,
    wandering: -0.1
}

const Settings={
    debug:true,
    playerSize:0.12,
    pickupSize:0.07,
    nPickups:8,
    step:0.08,
    rotationSpeed:12,
    velocity:[0,1],
    worldSize:[480,640],
    color1:"#424874",
    color2:"#a6b1e1",

    color3:"#cbe2b0",
    color4:"#f1935c",

}


function drawArrow(basex, vecx, myColor) {
    const base=createVector(basex.x,basex.y);
    base.mult(createVector(Settings.worldSize[0],Settings.worldSize[1]));
    const vec=createVector(vecx.x,vecx.y);
    vec.mult(createVector(Settings.worldSize[0],Settings.worldSize[1]));

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

const Assets={

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
        src: ['assets/September (Master).mp3']
    });
    

    Assets.coffee1.resize(64,64);
    Assets.coffee2.resize(64,64);
    Assets.chicken.resize(64,64);
    Assets.caesar.resize(64,64);
    
}


class Entity{
    constructor(s,size){
        this.alive=true;
        this.duration=20000;
        this.value=s;
        this.size=size;
        this.collisionSize=size;
        this.pos=createVector(.5,.5);
        this.drawingPos=null;   
    }
    setCollisionSize(v){
        this.collisionSize=v;
    }

    drawPixels(x,y,size){

    }
    draw(){
        const x=Settings.worldSize[0]*this.pos.x;
        const y=Settings.worldSize[1]*this.pos.y;
        const size=Settings.worldSize[0]*this.size;
        this.drawPixels(x,y,size);
    }
}

class Food extends Entity{
    constructor(){
        super(Rewards.food,Settings.pickupSize);
    }
    drawPixels(x,y,size){

            fill(Settings.color3);
       
            ellipse(x,y,size+6,size+6);
            image(Assets.coffee1, x-size/2, y-size/2, size, size);


    }
}


class Poison extends Entity{
    constructor(){
        super(Rewards.poison,Settings.pickupSize);
    }
    drawPixels(x,y,size){
        

        fill(Settings.color4);
        ellipse(x,y,size+6,size+6);
        image(Assets.coffee2, x-size/2,y-size/2, size, size);
    }
}

class Player extends Entity{
    constructor(env,name,img,voice,agentOptions){
        super(1.0,Settings.playerSize);

        agentOptions.update = 'qlearn'; // qlearn | sarsa
        agentOptions.gamma = 0.9; // discount factor, [0, 1)
        agentOptions.experience_add_every = 10; // number of time steps before we add another experience to replay memory
        agentOptions.experience_size = 10000; // size of experience replay memory
        agentOptions.learning_steps_per_iteration = 20;
        agentOptions.tderror_clamp = 1.0; // for robustness
        agentOptions.num_hidden_units = 100 // number of neurons in hidden layer

        this.agent=new RL.DQNAgent(env,agentOptions)
        this.voice=voice;
        this.img=img;
        this.name=name;

        this.rotation=0;
        this.setCollisionSize(0.04);

        this.newPos=createVector(this.pos.x,this.pos.y);
    }
    rotate(v){
        this.rotation+=v;
        // console.log("rotate"+v)
    }
    walk(v){
        this.newPos.set(this.pos.x,this.pos.y).add(v.rotate(this.rotation));
        // this.pos.add(v.rotate(this.rotation));
        if(this.newPos.x<1&&this.newPos.x>0&&
            this.newPos.y<1&&this.newPos.y>0){
          this.pos.set(this.newPos.x,this.newPos.y);
      }
    }
    getForward(){
        return createVector(...Settings.velocity).rotate(this.rotation);
        // return  createVector(0, Settings.velocity[1]).mult(50);

    }
    drawPixels(x,y,size){    
        image(this.img, x-size/2,y-size/2, size, size);
    }
}




class Caesar extends Player{
    constructor(env){
        super(env,"Caesar",Assets.caesar,-0.2,{
            alpha:0.9,
            epsilon: 0.5
        });
    }


}

class Chicken extends Player{
    constructor(env){
        super(env,"Pollo",Assets.chicken,0.5,{
            alpha:0.9,
            epsilon: 0.8
        });
    }

}



const pickupsTypes=[Food,Poison]
const players=[]
const pickups=[];

function setup() {
  
    frameRate(120);
    const a=Settings.worldSize[0]/Settings.worldSize[1];

    Settings.worldSize[1]=windowHeight;
    Settings.worldSize[0]=windowHeight*a;

    createCanvas(Settings.worldSize[0],Settings.worldSize[1]);

    smooth();
    Assets.music.play();

    const env = {};
    env.getNumStates = function() { return 3*Settings.nPickups; }
    env.getMaxNumActions = function() { return 2; }

   
    // create the DQN agent


    // players.push(new Caesar(env));
    players.push(new Chicken(env ));
    // For each agent
    // setInterval(()=>{
      
    // },1000./60.);
 
}

let lastLoopTime=null;
 async function aiLoop(player){
    const agent=player.agent;

    const t=Date.now();
    const deltaT=t-lastLoopTime;
    const deltaTf=(deltaT)/1000.;

    if(!lastLoopTime)lastLoopTime=t;
    // Remove dead pickups
    for(let i =0;i<pickups.length;i++){
        if((pickups[i].duration-=deltaT)<=0){
            pickups[i].alive=false;
        }
        if(!pickups[i].alive){
            pickups.splice(i,1);
            i--;
        }
    }
    lastLoopTime=t;

    // Spawn pickups
    
    while(pickups.length<Settings.nPickups){
        const pickup=new pickupsTypes[Math.floor(Math.random()*pickupsTypes.length)]( );
        pickup.pos.set(   
            Math.random()*(1-pickup.size*2)+pickup.size,
            Math.random()*(1-pickup.size*2)+pickup.size
       );
        pickups.push(pickup);
    }


    // Create state
    const v=[];
    // v.push(player.rotation);
  
    // v.push(1.-player.pos[0]);
    // v.push(1.-player.pos[1]);
    for(let i in pickups){
        // v.push(player.getForward().dot());
        const p2p = p5.Vector.sub(pickups[i].pos, player.pos);
        v.push(player.getForward().dot(p2p));
        v.push(pickups[i].pos.dist(player.pos));
        v.push(pickups[i].value);
    }

    // console.log(v);

    // Compute action
    const action = agent.act(v); 

    // const newPos=[player.pos[0],player.pos[1]];
    switch(action){
        case 0:{ // walk
            player.walk(createVector(...Settings.velocity).mult(deltaTf));

            break;
        }
        case 1: { // rotate ->
            player.rotate(deltaTf*Settings.rotationSpeed)
            break;
        }
        // case 2: { // rotate <-
        //     player.rotate(-deltaTf*Settings.rotationSpeed)
        //     break;
        // }
        // case 2:{ // y
        //     newPos[1]=player.pos[1]+Settings.step;
        //     break;
        // }
        // case 3:{ //-y
        //     newPos[1]=player.pos[1]-Settings.step;
        //     break;
        // }
    }

    let reward=0.0;

    //Moving to a wall
    // if(
    //     newPos[0]<player.collisionSize||newPos[0]>1-player.collisionSize
    //     || newPos[1]<player.collisionSize||newPos[1]>1.-player.collisionSize
    // ){
    //     reward=Rewards.wall;
    //     console.log("Rewarded",reward);
    //     agent.learn(reward); 
    //     Assets.hitWall.play();
    //     Assets.hitWall.rate(1+player.voice);
    //     Assets.hitWall.setVolume(0.08);
    //     return; // DOn't perform the action
    // }
 
    // Move
    // player.setPos(newPos);

    // Check if it collides with any pickup
    for(let i in pickups){
        const p=pickups[i];
        if(player.pos.dist(p.pos)<player.collisionSize+p.collisionSize){
            reward+=p.value;
            if(reward>0){
                Assets.slurp.rate(1.+player.voice);
                Assets.slurp.play();

                // Assets.slurp.setVolume(0.4);
            }else{
                Assets.cough.rate(1.+player.voice);
                Assets.cough.play();

                // Assets.cough.setVolume(0.4);
            }
            player.value+=reward;
            console.log("Rewarded",reward);
            p.alive=false

        }
    }

    // Wandering cost
    if(reward==0)reward-=Rewards.wandering;


    agent.learn(reward); 

}
let currentFramerate=-1;
function draw() {
    for(let i in players){
        // console.log(players[i]);
        aiLoop(players[i]);
    }
    background(Settings.color2);
    select("body").style("background",Settings.color1);

    noFill();
    stroke(Settings.color4)
    strokeWeight(3)
    rect(0,0,width,height);
    stroke(Settings.color1)

    for (let i = 0; i < pickups.length; i++) {
        pickups[i].draw();
    }


    let line=0;
    let spacing=10;
    textSize(24)
    textAlign("right","top")
    fill(Settings.color1);

    players.sort((a,b)=>{
        return b.value-a.value;
    })
    for(let i in players){
        const player=players[i];
        player.draw();
        line+=spacing;
        text(player.name+": "+player.value.toFixed(2) ,width-10,line)
        line+=24;
    }

    textAlign("left","top")

    if(currentFramerate<0)currentFramerate=frameRate();
    else currentFramerate=lerp(currentFramerate,frameRate(),0.1);
    text("FPS: "+  currentFramerate.toFixed(1),spacing,spacing);



    if(Settings.debug){
    for (let j in players) {
        const player = players[j];

        for (let i = 0; i < pickups.length; i++) {
            const pickup = pickups[i];

            const p2p = p5.Vector.sub(pickup.pos, player.pos);

            const d=player.getForward().dot(p2p);

            drawArrow(player.pos, p2p, d>0?"green":"red");
        }
        drawArrow(player.pos, player.getForward().mult(0.08), 'black');

        

    }
}

}
