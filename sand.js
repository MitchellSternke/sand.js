/**
 * Types of particles.
 * 
 * We omit the last bit since this is used for frame tracking.
 */
var ParticleType = {
    EMPTY : 0x000000 & 0xfffffe,
    WALL : 0x808080 & 0xfffffe,
    PLANT: 0x00ff00 & 0xfffffe,
    SAND : 0xedc9af & 0xfffffe,
    WATER : 0x0000ff & 0xfffffe,
    SALT : 0xffffff & 0xfffffe,
    SALTWATER : 0x000080 & 0xfffffe,
    OIL : 0x301934 & 0xfffffe,
    FIRE : 0xff0000 & 0xfffffe,
    STEAM : 0x00bfff & 0xfffffe,
    TORCH : 0x800000 & 0xfffffe,
    SPOUT : 0x008080 & 0xfffffe
};

class Particle {
    static isValid(p) {
        var valid = false;
        switch (p) {
            case ParticleType.EMPTY:
            case ParticleType.WALL:
            case ParticleType.PLANT:
            case ParticleType.SAND:
            case ParticleType.WATER:
            case ParticleType.SALT:
            case ParticleType.SALTWATER:
            case ParticleType.OIL:
            case ParticleType.FIRE:
            case ParticleType.STEAM:
            case ParticleType.TORCH:
            case ParticleType.SPOUT:
                valid = true;
            default:
                break;
        }

        return valid;
    }

    static isLiquid(p) {
        var liquid = false;
        switch (p) {
            case ParticleType.SAND:
            case ParticleType.WATER:
            case ParticleType.SALT:
            case ParticleType.SALTWATER:
            case ParticleType.OIL:
                liquid = true;
            default:
                break;
        }

        return liquid;
    }

    static isGas(p) {
        var gas = false;
        switch (p) {
            case ParticleType.FIRE:
            case ParticleType.STEAM:
                gas = true;
            default:
                break;
        }

        return gas;
    }

    static isActiveSolid(p) {
        var active = false;
        switch (p) {
            case ParticleType.TORCH:
            case ParticleType.SPOUT:
                active = true;
            default:
                break;
        }

        return active;
    }

    static getAction(p) {
        switch (p) {
            case ParticleType.FIRE:
                if (Math.random() < 0.05) {
                    // Dissipate
                    //
                    return ParticleType.EMPTY;
                }
                break;
            case ParticleType.STEAM:
                if (Math.random() < 0.01) {
                    // Condense
                    //
                    return ParticleType.WATER;
                }
            default:
                break;
        }

        return p;
    }

    static getInteraction(p, q) {
        switch (p) {
            case ParticleType.WATER:
                switch (q) {
                    case ParticleType.PLANT:
                        // Grow!
                        //
                        return [ParticleType.PLANT, ParticleType.PLANT];
                    case ParticleType.SALT:
                        // Dissolve the salt
                        //
                        return [ParticleType.SALTWATER, ParticleType.EMPTY];
                    default:
                        break;
                }
                break;
            
            case ParticleType.FIRE:
                switch (q) {
                    case ParticleType.PLANT:
                    case ParticleType.OIL:
                        // Burn!
                        //
                        return [ParticleType.FIRE, ParticleType.FIRE];
                    case ParticleType.WATER:
                        // Boil
                        //
                        return [ParticleType.FIRE, ParticleType.STEAM];
                    case ParticleType.SALTWATER:
                        // Distill
                        //
                        return [ParticleType.SALT, ParticleType.STEAM];
                    default:
                        break;
                }
                break;

            case ParticleType.TORCH:
                if (q == ParticleType.EMPTY && Math.random() < 0.25) {
                    return [ParticleType.TORCH, ParticleType.FIRE];
                }
                break;
            
            case ParticleType.SPOUT:
                if (q == ParticleType.EMPTY && Math.random() < 0.25) {
                    return [ParticleType.SPOUT, ParticleType.WATER];
                }
                break;
            
            default:
                break;
        }

        // Unchanged by default
        //
        return [p, q];
    }
}

class Sandbox {
    constructor(canvas) {
        var context = canvas.getContext("2d");

        this.width = canvas.width;
        this.height = canvas.height;

        this.setImageData(context.createImageData(this.width, this.height));

        // TODO: this is not used (I think)
        this.dataSize = this.width * this.height * 4;

        for (var i = 0; i < this.dataSize; i += 4) {
            this.data[i] = 0;
            this.data[i + 1] = 0;
            this.data[i + 2] = 0;
            this.data[i + 3] = 0xff;
        }

        // Bit that flips every frame
        //
        this.frameBit = 0;

        this.pen = ParticleType.EMPTY;
    }

    setImageData(imageData) {
        this.imageData = imageData;
        this.data = this.imageData.data;
    }

    getParticle(x, y) {
        const index = (y * this.width + x) * 4;
        const r = this.data[index];
        const g = this.data[index + 1];
        const b = this.data[index + 2];
        const a = this.data[index + 3];

        return (a << 24) | (r << 16) | (g << 8) | b;
    }

    setParticle(x, y, p) {
        const index = (y * this.width + x) * 4;
        const r = (p & 0xff0000) >> 16;
        const g = (p & 0xff00) >> 8;
        const b = (p & 0xff);

        this.data[index] = r;
        this.data[index + 1] = g;
        this.data[index + 2] = b ^ this.frameBit;
        this.data[index + 3] = 0xff;
    }

    updateParticle(x, y, p) {
        const index = (y * this.width + x) * 4;
        const r = (p & 0xff0000) >> 16;
        const g = (p & 0xff00) >> 8;
        const b = (p & 0xff);

        this.data[index] = r;
        this.data[index + 1] = g;
        this.data[index + 2] = b ^ this.frameBit ^ 1;
        this.data[index + 3] = 0xff;
    }

    update() {
        for (var y = this.height - 2; y > 0; y--) {
            for (var x = 1; x < this.width - 1; x++) {
                var p = this.getParticle(x, y);

                // If this is not a valid particle (from canvas antialiasing), then correct it to the current pen
                //
                if (!Particle.isValid(p & 0xfffffe)) {
                    this.updateParticle(x, y, this.pen);
                    continue;
                }

                // If the bit is set from the current frame, skip this particle
                //
                if ((p & 1) != this.frameBit) {
                    continue;
                }

                // Skip processing solids
                //
                var type = p & 0xfffffe;
                var dy = 1;
                var activeSolid = Particle.isActiveSolid(type);
                if (Particle.isGas(type)) {
                    dy = -1;
                } else if (!Particle.isLiquid(type) && !activeSolid) {
                    continue;
                }

                // Attempt to interact with all 8 neighbors
                //
                var done = false;
                for (var i = -1; i <= 1 && !done; i++) {
                    for (var j = -1; j <= 1 && !done; j++) {
                        if (i == 0 && j == 0) {
                            continue;
                        }

                        var q = this.getParticle(x + i, y + j);
                        if ((q & 1) != this.frameBit) {
                            continue;
                        }
                        var type2 = q & 0xfffffe;
                        var interaction = Particle.getInteraction(type, type2);

                        if (interaction[0] != type || interaction[1] != type2) {
                            // If the interaction did anything, then be done
                            //
                            this.updateParticle(x, y, interaction[0]);
                            this.updateParticle(x + i, y + j, interaction[1]);
                            done = true;
                        }
                    }
                }
                // Active solids no longer need to be processed
                //
                if (done || activeSolid) {
                    continue;
                }

                // Perform self actions for the particle
                //
                type = Particle.getAction(p & 0xfffffe);
                if (type != (p & 0xfffffe)) {
                    // If we performed an action (transformed) we are done
                    //
                    this.updateParticle(x, y, type);
                    continue;
                }

                // Try to move down (or up if gas) (and to the left/right)
                //
                var dx = 0;
                if (Math.random() < 0.5) {
                    dx = (Math.floor(Math.random() * 2) | 0);
                    if (dx == 0) {
                        dx = -1;
                    }
                }

                var q = this.getParticle(x + dx, y + dy);
                var type2 = q & 0xfffffe;
                if (type2 == ParticleType.EMPTY) {
                    // Go!
                    //
                    this.updateParticle(x + dx, y + dy, type);
                    this.updateParticle(x, y, ParticleType.EMPTY);
                } else if (dx != 0) {
                    // Try to move left/right only
                    //
                    q = this.getParticle(x + dx, y);
                    type2 = q & 0xfffffe;
                    if (type2 == ParticleType.EMPTY) {
                        this.updateParticle(x + dx, y, type);
                        this.updateParticle(x, y, ParticleType.EMPTY);
                    } else if (Particle.isLiquid(type2)) {
                        // Freely swap with liquids
                        //
                        this.updateParticle(x + dx, y, type);
                        this.updateParticle(x, y, type2);
                    } else if ((q & 1) != this.frameBit) {
                        // Interact
                        //
                        var interaction = Particle.getInteraction(type, type2);
                        this.updateParticle(x, y, interaction[0]);
                        this.updateParticle(x + dx, y, interaction[1]);
                    } else {
                        // Do nothing
                        //
                        this.updateParticle(x, y, type);
                    }
                } else if ((q & 1) != this.frameBit) {
                    // Interact
                    //
                    var interaction = Particle.getInteraction(type, type2);
                    this.updateParticle(x, y, interaction[0]);
                    this.updateParticle(x + dx, y + dy, interaction[1]);
                } else {
                    // Do nothing
                    //
                    this.updateParticle(x, y, type);
                }
            }
        }

        // Clear the outer frame
        //
        for (var x = 0; x < this.width; x++) {
            this.setParticle(x, 0, ParticleType.EMPTY);
            this.setParticle(x, this.height - 1, ParticleType.EMPTY);
        } 
        for (var y = 0; y < this.height; y++) {
            this.setParticle(0, y, ParticleType.EMPTY);
            this.setParticle(this.width - 1, y, ParticleType.EMPTY);
        }

        // Flip the frame bit
        //
        this.frameBit ^= 1;
    }
}
