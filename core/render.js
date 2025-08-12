export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileWidth = 64;   // Breite eines Tiles
        this.tileHeight = 32;  // Höhe eines Tiles
        this.cameraX = 0;
        this.cameraY = 0;
        this.scale = 1;

        this.images = {};
        this.mapWidth = 0;
        this.mapHeight = 0;

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    async loadImage(name, src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                resolve(img);
            };
            img.src = src;
        });
    }

    async loadAssets(assetList) {
        const promises = [];
        for (const [name, src] of Object.entries(assetList)) {
            promises.push(this.loadImage(name, src));
        }
        await Promise.all(promises);
    }

    setMapSize(w, h) {
        this.mapWidth = w;
        this.mapHeight = h;
    }

    isoToScreen(x, y) {
        return {
            x: (x - y) * this.tileWidth / 2,
            y: (x + y) * this.tileHeight / 2
        };
    }

    screenToIso(screenX, screenY) {
        const x = ((screenX / this.scale) / (this.tileWidth / 2) + (screenY / this.scale) / (this.tileHeight / 2)) / 2;
        const y = ((screenY / this.scale) / (this.tileHeight / 2) - (screenX / this.scale) / (this.tileWidth / 2)) / 2;
        return { x, y };
    }

    drawMap(map) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2 + this.cameraX, 100 + this.cameraY);
        this.ctx.scale(this.scale, this.scale);

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = map[y][x];
                const { x: sx, y: sy } = this.isoToScreen(x, y);
                if (tile.ground && this.images[tile.ground]) {
                    this.ctx.drawImage(this.images[tile.ground], sx - this.tileWidth / 2, sy - this.tileHeight / 2);
                }
                if (tile.object && this.images[tile.object]) {
                    // Gebäude-Offset, damit es mittig sitzt
                    const img = this.images[tile.object];
                    this.ctx.drawImage(img, sx - img.width / 2, sy - img.height + this.tileHeight / 2);
                }
            }
        }

        this.ctx.restore();
    }
}
