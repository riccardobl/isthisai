const Fs=require("fs");
const Yargs = require('yargs')
const Path=require("path");
const { exit } = require("process");
const Logic=require("./logic.js").Logic;

async function main() {
    const argv=Yargs     
    .option('model', {
        alias: 'm',
        type: 'string',
        description: 'Specify rw model file. Used to store learned data'
      })
      .option('pretrained', {
        alias: 'p',
        type: 'string',
        description: 'Specify pretrained model. Used to initialize empty model file.'
      })
    .help()
    .argv;

    let model = Path.join(__dirname, "espresso1.json");
    if (argv.model) model = argv.model;

    let pretrained = null;
    if (argv.pretrained) pretrained = argv.pretrained;

    // Prepare
    const gameLogic = new Logic();

    // Load pretrained models
    if(pretrained&&Fs.existsSync(pretrained)){
        const modelData = Fs.readFileSync(pretrained);
        if(gameLogic.deserialize(modelData)){
            console.info("Loaded pretrained model",pretrained);
        }else{
            console.error("Can't load pretrained model",pretrained);
        }
    }

    if(model&&Fs.existsSync(model)){
        const modelData = Fs.readFileSync(model);
        if(gameLogic.deserialize(modelData)){
            console.info("Loaded model",model);
        }else{
            console.error("Can't load model",model);
        }
    }
    

    // Just some logging
    // const rewardCallback = (reward, player, pickup) => {
    //     console.log("Rewarded", reward,"to",player.name);
    // };
    const rewardCallback=null;
    
    console.info("Start!");
    
    // Run logic
    let lastSave=0;
    while(true){
        const t=Date.now();
        if(t-lastSave>1000*60){   // Serialize every 1 minute
            lastSave=t;
            // console.log("Save");
            const data = gameLogic.serialize();
            Fs.writeFileSync(model, data);
        }
        gameLogic.loop(1000./60.,rewardCallback);
    }

}
main();