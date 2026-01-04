class RouletteItem {
    constructor(id, name, color, weight = 1, splitCount = 1) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.weight = weight;
        this.splitCount = splitCount;
    }
}

class RouletteApp {
    constructor() {
        this.canvas = document.getElementById('rouletteCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.items = [];
        this.isSpinning = false;
        this.currentRotation = 0;

        this.init();
    }

    init() {
        // Adjust canvas resolution
        const size = 600;
        this.canvas.width = size;
        this.canvas.height = size;

        this.bindEvents();
        this.addDefaultItems();
        this.drawWheel();
    }

    bindEvents() {
        document.getElementById('spinBtn').addEventListener('click', () => this.spin());
        document.getElementById('addItemBtn').addEventListener('click', () => this.addNewItem());
        // More bindings...
    }

    addDefaultItems() {
        this.items.push(new RouletteItem('1', 'Tacos', this.getRandomColor(), 1));
        this.items.push(new RouletteItem('2', 'Burger', this.getRandomColor(), 1));
        this.items.push(new RouletteItem('3', 'Pizza', this.getRandomColor(), 1));
        this.renderItemsList();
    }

    getRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 60%)`;
    }

    addNewItem() {
        const id = Date.now().toString();
        const newItem = new RouletteItem(id, `Item ${this.items.length + 1}`, this.getRandomColor());
        this.items.push(newItem);
        this.renderItemsList();
        this.drawWheel();
    }

    renderItemsList() {
        const listContainer = document.getElementById('itemsList');
        listContainer.innerHTML = '';

        this.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'item-row';
            el.innerHTML = `
                <input type="color" value="${this.convertHslToHex(item.color)}" class="color-picker" data-id="${item.id}">
                <input type="text" value="${item.name}" class="item-name" data-id="${item.id}">
                <input type="number" value="${item.weight}" min="1" class="item-weight" data-id="${item.id}">
                <button class="item-delete" data-id="${item.id}">×</button>
            `;
            listContainer.appendChild(el);

            // Add listeners for immediate updates
            const colorInput = el.querySelector('.color-picker');
            const nameInput = el.querySelector('.item-name');
            const weightInput = el.querySelector('.item-weight');
            const deleteBtn = el.querySelector('.item-delete');

            colorInput.addEventListener('input', (e) => {
                item.color = e.target.value;
                this.drawWheel();
            });

            nameInput.addEventListener('input', (e) => {
                item.name = e.target.value;
                // No need to redraw immediately for name mostly, but maybe if we show text on wheel
                this.drawWheel();
            });

            weightInput.addEventListener('change', (e) => {
                const val = parseInt(e.target.value);
                if (val > 0) item.weight = val;
                this.drawWheel();
            });

            deleteBtn.addEventListener('click', () => {
                this.items = this.items.filter(i => i.id !== item.id);
                this.renderItemsList();
                this.drawWheel();
            });
        });
    }

    // Helper to accept HSL or Hex, but input type=color needs Hex
    convertHslToHex(color) {
        // Very basic check, if already hex return it
        if (color.startsWith('#')) return color;

        // Ensure we are working with an HSL string
        // Assuming format "hsl(h, s%, l%)"
        // For simplicity in this rough draft, we might just force hex generation in getRandomColor
        // But let's fix getRandomColor to return hex for simplicity with input[type=color]
        return '#FF0000'; // Placeholder fix in next step
    }

    drawWheel() {
        // Placeholder draw
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = this.canvas.width / 2 - 20;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw standard wheel
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#334155';
        ctx.fill();
        ctx.stroke();
    }

    spin() {
        if (this.isSpinning) return;
        this.isSpinning = true;
        console.log('Spinning...');
        // Animation logic to come
        setTimeout(() => this.isSpinning = false, 2000);
    }
}

// Fix random color to return Hex for easier binding
RouletteApp.prototype.getRandomColor = function () {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Overwrite the helper to just pass through for now since we switched to Hex
RouletteApp.prototype.convertHslToHex = function (color) {
    return color;
}

window.addEventListener('DOMContentLoaded', () => {
    new RouletteApp();
});
