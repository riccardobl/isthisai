"use strict";
if (typeof module !== "undefined") {
    var Victor = require('victor');
    var RL = require('./reinforcejs/lib/rl.js').RL;

}

const Rewards = {
    poison: -1.0,
    food: 1.0,
    wandering: -0.01
}

const Settings = {
    version: "4",

    async: true,
    playerSize: 0.12,
    pickupSize: 0.07,
    nPickups: 4,

    rotationSpeed: 6.0,
    velocity: [0, .5]
}

class Entity {
    constructor(s, size) {
        this.alive = true;
        this.duration = 20000;
        this.value = s;
        this.size = size;
        this.collisionSize = size;
        this.pos = new Victor(.5, .5);
        this.drawingPos = null;
    }
    setCollisionSize(v) {
        this.collisionSize = v;
    }



}



class Food extends Entity {
    constructor() {
        super(Rewards.food, Settings.pickupSize);
    }
}


class Poison extends Entity {
    constructor() {
        super(Rewards.poison, Settings.pickupSize);
    }
}

class Player extends Entity {
    constructor(env, name, agentOptions) {
        super(1.0, Settings.playerSize);

        agentOptions.update = 'qlearn'; // qlearn | sarsa
        agentOptions.gamma = 0.9; // discount factor, [0, 1)
        agentOptions.experience_add_every = 10; // number of time steps before we add another experience to replay memory
        agentOptions.experience_size = 10000; // size of experience replay memory
        agentOptions.learning_steps_per_iteration = 20;
        agentOptions.tderror_clamp = 1.0; // for robustness
        agentOptions.num_hidden_units = 100 // number of neurons in hidden layer

        this.agent = new RL.DQNAgent(env, agentOptions)
        this.name = name;

        this.rotation = 0;
        this.setCollisionSize(0.04);

        this.newPos = new Victor(this.pos.x, this.pos.y);
    }
    rotate(v) {
        this.rotation += v;
    }
    walk(v) {
        // console.log("walk");
        this.newPos.x = this.pos.x;
        this.newPos.y = this.pos.y;
        this.newPos.add(v.rotate(this.rotation));
        if (this.newPos.x < 1 && this.newPos.x > 0 &&
            this.newPos.y < 1 && this.newPos.y > 0) {
            this.pos.x = this.newPos.x;
            this.pos.y = this.newPos.y;
            //   console.log(this.newPos);

        }
    }
    getForward() {
        return new Victor(...Settings.velocity).rotate(this.rotation);
    }
}




class Caesar extends Player {
    constructor(env) {
        super(env, "Caesar", {
            alpha: 0.9,
            epsilon: 0.4
        });
    }


}

class Chicken extends Player {
    constructor(env) {
        super(env, "Pollo", {
            alpha: 0.99,
            epsilon: 0.01
        });
    }

}

class Logic {
    simplify(x,n){
        const f=10.*n;
        return Math.floor(x*f)/f;
    };
    
    constructor() {
        this.pickupsTypes = [Food, Poison];
        this.players = [];
        this.pickups = [];
        const env = {};
        env.getNumStates = function () { return 3 * Settings.nPickups; }
        env.getMaxNumActions = function () { return 3; }


        this.players.push(new Caesar(env));
        this.players.push(new Chicken(env));

    }

    getPlayers() {
        this.players.sort((a, b) => {
            return b.value - a.value;
        });
        return this.players;
    }

    getPickups() {
        return this.pickups;
    }





    loop(deltaT, rewardCallback) {

        // Remove dead pickups
        for (let i = 0; i < this.pickups.length; i++) {
            if ((this.pickups[i].duration -= deltaT) <= 0) {
                this.pickups[i].alive = false;
            }
            if (!this.pickups[i].alive) {
                this.pickups.splice(i, 1);
                i--;
            }
        }

        // Spawn pickups    
        while (this.pickups.length < Settings.nPickups) {
            const pickup = new this.pickupsTypes[Math.floor(Math.random() * this.pickupsTypes.length)]();
            pickup.pos.x = Math.random() * (1 - pickup.size * 2) + pickup.size;
            pickup.pos.y = Math.random() * (1 - pickup.size * 2) + pickup.size;
            this.pickups.push(pickup);
        }

        for (let i in this.players) {
            this._updatePlayerLogic(deltaT, this.players[i], rewardCallback);
        }


    }


    _updatePlayerLogic(deltaT, player, rewardCallback) {
        const agent = player.agent;

        const deltaTf = (deltaT) / 1000.;

        // Create state
        const v = [];
        for (let i in this.pickups) {
            const p2p = this.pickups[i].pos.clone().subtract(player.pos);

  

            v.push(this.simplify(player.getForward().dot(p2p),1));
            v.push(this.pickups[i].value);
            v.push(this.simplify(this.pickups[i].pos.distance(player.pos),2.));
            // console.log(v);
        }


        // Compute action
        const action = agent.act(v);

        let walking = false;
        switch (action) {
            case 0: { // walk
                walking = true;
                player.walk(new Victor(...Settings.velocity).multiply(new Victor(deltaTf, deltaTf)));
                break;
            }
            case 1: { // rotate ->
                player.rotate(deltaTf * Settings.rotationSpeed)
                break;
            }
            case 2: { // rotate <-
                player.rotate(-deltaTf * Settings.rotationSpeed)
                break;
            }

        }

        let reward = 0.0;


        // Check if it collides with any pickup
        for (let i in this.pickups) {
            const p = this.pickups[i];
            if (player.pos.distance(p.pos) < player.collisionSize + p.collisionSize) {
                reward += p.value;
                if (rewardCallback) rewardCallback(reward, player, p);


                player.value += reward;
                p.alive = false
            }
        }

        if (reward == 0 && walking) reward = Rewards.wandering;
        agent.learn(reward);
    }


    serialize() {
        const data = {
            version: Settings.version
        };
        for (let i in this.players) {
            const player = this.players[i];
            const agent = player.agent;
            data[player.name] = (agent.toJSON());
        }
        return JSON.stringify(data);
    }

    deserialize(json) {
        const data = JSON.parse(json);
        if (data.version != Settings.version) {
            return false;
        }
        for (let i in this.players) {
            const player = this.players[i];
            const dd = data[player.name];
            if (dd) {
                console.log("Deserialize", player.name);
                player.agent.fromJSON(dd);
            }
        }
        return true;
    }
}

if (typeof module !== "undefined") {
    module.exports = {
        Logic: Logic,
        Entity: Entity,
        Food: Food,
        Poison: Poison,
        Caesar: Caesar,
        Player: Player,
        Chicken: Chicken
    }
}



