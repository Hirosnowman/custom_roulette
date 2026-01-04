class RouletteItem {
    constructor(id, name, color, weight = 1, splitCount = 1, textSize = 20) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.weight = weight;
        this.splitCount = splitCount;
        this.textSize = textSize;
    }
}

class RouletteApp {
    constructor() {
        this.canvas = document.getElementById('rouletteCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.items = [];
        this.isSpinning = false;
        this.currentRotation = 0;
        this.isShuffled = false;
        this.appBg = '#1a1a2a'; // Default
        this.isLightMode = false;
        this.spinTime = 6; // Default seconds
        this.presets = JSON.parse(localStorage.getItem('roulette_presets') || '{}');

        this.init();
    }

    init() {
        const size = 600;
        this.canvas.width = size;
        this.canvas.height = size;

        // Restore settings before binding events so inputs have correct values
        this.loadData();

        this.bindEvents();
        this.updatePresetSelect();

        // Initial render logic
        if (this.items.length === 0) {
            this.addDefaultItems();
        } else {
            this.renderItemsList();
            this.drawWheel();
        }

        // Apply loaded BG
        this.updateAppBackground(this.appBg);
        this.applyTheme();
    }

    bindEvents() {
        document.getElementById('spinBtn').addEventListener('click', () => this.spin());
        document.getElementById('resetBtn').addEventListener('click', () => {
            document.getElementById('result-overlay').classList.remove('visible');
            document.getElementById('result-overlay').classList.add('hidden');
            this.isSpinning = false;
        });
        document.getElementById('addItemBtn').addEventListener('click', () => this.addNewItem());

        // Shuffle
        const shuffleToggle = document.getElementById('shuffleToggle');
        if (shuffleToggle) {
            shuffleToggle.checked = this.isShuffled;
            shuffleToggle.addEventListener('change', (e) => {
                this.isShuffled = e.target.checked;
                this.drawWheel();
                this.saveData();
            });
        }

        // Background
        const bgPicker = document.getElementById('bgColorPicker');
        if (bgPicker) {
            bgPicker.value = this.appBg;
            bgPicker.addEventListener('input', (e) => {
                this.updateAppBackground(e.target.value);
                this.saveData();
            });
        }

        // Spin Time
        const timeInput = document.getElementById('spinTimeInput');
        if (timeInput) {
            timeInput.value = this.spinTime;
            timeInput.addEventListener('change', (e) => {
                let val = parseFloat(e.target.value);
                if (val < 0.1) val = 0.1; // allow fast
                this.spinTime = val;
                this.saveData();
            });
        }

        // Theme Toggle
        const themeBtn = document.getElementById('themeToggleBtn');
        if (themeBtn) {
            this.updateThemeBtnText();
            themeBtn.addEventListener('click', () => {
                this.isLightMode = !this.isLightMode;
                this.applyTheme();
                this.saveData();
            });
        }

        // Preset Events
        document.getElementById('savePresetBtn').addEventListener('click', () => {
            const name = document.getElementById('presetNameInput').value.trim();
            if (name) {
                this.savePreset(name);
                document.getElementById('presetNameInput').value = '';
            }
        });

        document.getElementById('loadPresetBtn').addEventListener('click', () => {
            const name = document.getElementById('presetSelect').value;
            if (name) {
                this.loadPreset(name);
            }
        });

        // Delete Preset
        const delBtn = document.getElementById('deletePresetBtn');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                this.deletePreset();
            });
        }

        // Toggle Settings Panel
        const toggleBtn = document.getElementById('toggleSettingsBtn');
        const settingsContent = document.getElementById('settingsContent');
        const panel = document.querySelector('.controls-panel');

        if (toggleBtn && settingsContent) {
            toggleBtn.addEventListener('click', () => {
                settingsContent.classList.toggle('settings-hidden');
                panel.classList.toggle('collapsed');
                toggleBtn.textContent = settingsContent.classList.contains('settings-hidden') ? '▲' : '▼';

                // Redraw to ensure canvas size is correct after layout change if needed
                setTimeout(() => this.drawWheel(), 50);
            });
        }
    }

    updateAppBackground(color) {
        this.appBg = color;
        document.documentElement.style.setProperty('--app-bg', color);
    }

    applyTheme() {
        if (this.isLightMode) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
        this.updateThemeBtnText();
        this.drawWheel(); // Redraw for text color if canvas needs it? Canvas text assumes white currently.
    }

    updateThemeBtnText() {
        const btn = document.getElementById('themeToggleBtn');
        if (btn) btn.textContent = this.isLightMode ? '☀️' : '🌙';
    }

    updatePresetSelect() {
        const select = document.getElementById('presetSelect');
        select.innerHTML = '<option value="">Select Preset...</option>';
        Object.keys(this.presets).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
        });
    }

    deletePreset() {
        const select = document.getElementById('presetSelect');
        const name = select.value;
        if (!name) return;

        if (confirm(`Delete preset "${name}"?`)) {
            delete this.presets[name];
            localStorage.setItem('roulette_presets', JSON.stringify(this.presets));
            this.updatePresetSelect();
        }
    }

    savePreset(name) {
        // Save Items + Global Settings
        const data = this.items.map(item => ({
            id: item.id,
            name: item.name,
            color: item.color,
            weight: item.weight,
            splitCount: item.splitCount,
            textSize: item.textSize,
            textColor: item.textColor
        }));

        const presetData = {
            items: data,
            appBg: this.appBg,
            isShuffled: this.isShuffled,
            isLightMode: this.isLightMode,
            spinTime: this.spinTime
        };

        this.presets[name] = presetData;
        localStorage.setItem('roulette_presets', JSON.stringify(this.presets));
        this.updatePresetSelect();
        document.getElementById('presetSelect').value = name;
        alert(`Preset "${name}" saved! (with Settings)`);
    }

    loadPreset(name) {
        if (this.presets[name]) {
            const data = this.presets[name];

            // Handle legacy presets
            if (Array.isArray(data)) {
                this.items = data.map(d => new RouletteItem(d.id || Date.now().toString(), d.name, d.color, d.weight, d.splitCount, d.textSize, d.textColor));
            } else {
                // New format with settings
                if (data.items) {
                    this.items = data.items.map(d => new RouletteItem(d.id || Date.now().toString(), d.name, d.color, d.weight, d.splitCount, d.textSize, d.textColor));
                }

                if (data.appBg !== undefined) this.updateAppBackground(data.appBg);
                if (data.isShuffled !== undefined) {
                    this.isShuffled = !!data.isShuffled;
                    const toggle = document.getElementById('shuffleToggle');
                    if (toggle) toggle.checked = this.isShuffled;
                }
                if (data.isLightMode !== undefined) {
                    this.isLightMode = !!data.isLightMode;
                    this.applyTheme();
                }
                if (data.spinTime !== undefined) {
                    this.spinTime = data.spinTime;
                    const timeInput = document.getElementById('spinTimeInput');
                    if (timeInput) timeInput.value = this.spinTime;
                }

                const bgPicker = document.getElementById('bgColorPicker');
                if (bgPicker) bgPicker.value = this.appBg;
            }

            this.renderItemsList();
            this.drawWheel();
            this.saveData();

            alert(`Loaded preset: ${name}` + (hasSettings ? " (Settings Restored)" : " (Items Only)"));
        }
    }

    addDefaultItems() {
        this.items.push(new RouletteItem('1', 'Tacos', this.getRandomColor(), 1));
        this.items.push(new RouletteItem('2', 'Burger', this.getRandomColor(), 1));
        this.items.push(new RouletteItem('3', 'Pizza', this.getRandomColor(), 1));
        this.renderItemsList();
        this.saveData();
    }

    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    convertHslToHex(color) {
        if (color && color.startsWith('#')) return color;
        return '#FF0000';
    }

    addNewItem() {
        const id = Date.now().toString();
        const newItem = new RouletteItem(id, `Item ${this.items.length + 1}`, this.getRandomColor());
        this.items.push(newItem);
        this.renderItemsList();
        this.drawWheel();
        this.saveData();
    }

    renderItemsList() {
        const listContainer = document.getElementById('itemsList');
        listContainer.innerHTML = '';

        this.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'item-row';
            const size = item.textSize || 20;
            const txtColor = item.textColor || '#ffffff';

            el.innerHTML = `
                <div class="row-top">
                    <div class="color-group">
                        <input type="color" value="${this.convertHslToHex(item.color)}" class="color-picker" data-id="${item.id}" title="Background Color">
                        <input type="color" value="${txtColor}" class="text-color-picker" data-id="${item.id}" title="Text Color">
                    </div>
                    <input type="text" value="${item.name}" class="item-name" data-id="${item.id}" placeholder="Name">
                    <button class="item-delete" data-id="${item.id}">×</button>
                </div>
                <div class="row-bottom">
                    <div class="input-group" title="Weight">
                        <span class="label">Ratio</span>
                        <input type="number" value="${item.weight}" min="1" class="item-weight" data-id="${item.id}">
                    </div>
                    <div class="input-group" title="Split Count">
                        <span class="label">Split</span>
                        <input type="number" value="${item.splitCount}" min="1" class="item-split" data-id="${item.id}">
                    </div>
                    <div class="input-group" title="Text Size">
                        <span class="label">Size</span>
                        <input type="number" value="${size}" min="1" class="item-text-size" data-id="${item.id}">
                    </div>
                </div>
            `;
            listContainer.appendChild(el);

            const colorInput = el.querySelector('.color-picker');
            const textColorInput = el.querySelector('.text-color-picker');
            const nameInput = el.querySelector('.item-name');
            const weightInput = el.querySelector('.item-weight');
            const splitInput = el.querySelector('.item-split');
            const textSizeInput = el.querySelector('.item-text-size');
            const deleteBtn = el.querySelector('.item-delete');

            const update = () => {
                this.drawWheel();
                this.saveData();
            };

            colorInput.addEventListener('input', (e) => {
                item.color = e.target.value;
                update();
            });

            textColorInput.addEventListener('input', (e) => {
                item.textColor = e.target.value;
                update();
            });

            nameInput.addEventListener('input', (e) => {
                item.name = e.target.value;
                update();
            });

            weightInput.addEventListener('change', (e) => {
                const val = parseInt(e.target.value);
                if (val > 0) item.weight = val;
                update();
            });

            splitInput.addEventListener('change', (e) => {
                const val = parseInt(e.target.value);
                if (val > 0) item.splitCount = val;
                update();
            });

            textSizeInput.addEventListener('change', (e) => {
                const val = parseInt(e.target.value);
                if (val > 0) item.textSize = val;
                update();
            });

            deleteBtn.addEventListener('click', () => {
                this.items = this.items.filter(i => i.id !== item.id);
                this.renderItemsList();
                this.drawWheel();
                this.saveData();
            });
        });
    }

    getSegments() {
        let segments = [];

        if (this.isShuffled) {
            let workingItems = this.items.map(i => ({ ...i, remainingSplits: i.splitCount }));
            while (workingItems.some(i => i.remainingSplits > 0)) {
                workingItems.forEach(item => {
                    if (item.remainingSplits > 0) {
                        segments.push({
                            ...item,
                            sliceWeight: item.weight / item.splitCount
                        });
                        item.remainingSplits--;
                    }
                });
            }
        } else {
            this.items.forEach(item => {
                const count = item.splitCount || 1;
                for (let i = 0; i < count; i++) {
                    segments.push({
                        ...item,
                        sliceWeight: item.weight / count
                    });
                }
            });
        }

        return segments;
    }

    drawWheel() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = width / 2 - 20;

        ctx.clearRect(0, 0, width, height);

        const segments = this.getSegments();
        if (segments.length === 0) return;

        const totalWeight = segments.reduce((acc, seg) => acc + seg.sliceWeight, 0);
        let startAngle = this.currentRotation;

        segments.forEach(seg => {
            const sliceAngle = (seg.sliceWeight / totalWeight) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();

            ctx.fillStyle = seg.color;
            ctx.fill();

            // Contrast stroke
            ctx.strokeStyle = this.isLightMode ? '#000000' : '#ffffff';
            ctx.lineWidth = 2; // Make it slightly thicker
            ctx.stroke();

            // Text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = "right";

            // Use custom text color, remove shadow
            ctx.fillStyle = seg.textColor || "#ffffff";

            const fontSize = seg.textSize || 20;
            ctx.font = `bold ${fontSize}px Outfit, sans-serif`;

            // REMOVED SHADOW to fix "gradient/ugly" look
            // ctx.shadowColor = "rgba(0,0,0,0.5)";
            // ctx.shadowBlur = 4;

            // Slightly adjustable baseline logic
            ctx.fillText(seg.name, radius * 0.85, fontSize * 0.35);
            ctx.restore();

            startAngle = endAngle;
        });

        // Center decoration
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = this.isLightMode ? '#000000' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#000";
    }

    spin() {
        if (this.isSpinning) return;
        if (this.items.length === 0) return;

        this.isSpinning = true;

        // Hide overlay immediately
        const overlay = document.getElementById('result-overlay');
        overlay.classList.remove('visible');
        overlay.classList.add('hidden');

        document.getElementById('spinBtn').disabled = true;

        const startRotation = this.currentRotation;
        const randomOffset = Math.random() * 2 * Math.PI;
        // Scale rotations by time (approx 2 rotations per second)
        const rotations = Math.max(5, this.spinTime * 2);
        const finalTarget = startRotation + (rotations * 2 * Math.PI) + randomOffset;

        const duration = this.spinTime * 1000;
        const startTime = performance.now();
        let lastTickAngle = startRotation;

        const animate = (time) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            this.currentRotation = startRotation + (finalTarget - startRotation) * ease;
            this.drawWheel();

            // Sound check (simple approx)
            if (Math.abs(this.currentRotation - lastTickAngle) > 0.5) {
                this.playSound('tick');
                lastTickAngle = this.currentRotation;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                document.getElementById('spinBtn').disabled = false;
                this.showResult();
            }
        };

        requestAnimationFrame(animate);
    }

    showResult() {
        const normalizedRotation = this.currentRotation % (2 * Math.PI);
        let angleOnWheel = (1.5 * Math.PI - normalizedRotation) % (2 * Math.PI);
        if (angleOnWheel < 0) angleOnWheel += 2 * Math.PI;

        const segments = this.getSegments();
        const totalWeight = segments.reduce((acc, seg) => acc + seg.sliceWeight, 0);

        let currentAngle = 0;
        let winner = null;

        for (const seg of segments) {
            const sliceAngle = (seg.sliceWeight / totalWeight) * 2 * Math.PI;
            if (angleOnWheel >= currentAngle && angleOnWheel < currentAngle + sliceAngle) {
                winner = seg;
                break;
            }
            currentAngle += sliceAngle;
        }

        if (winner) {
            const overlay = document.getElementById('result-overlay');
            const text = document.getElementById('result-text');
            text.textContent = winner.name;
            overlay.classList.remove('hidden');
            overlay.classList.add('visible');
            this.playSound('win');
        }
    }

    initAudio() {
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { console.warn("Audio API not supported"); }
    }

    playSound(type) {
        if (!this.audioCtx) this.initAudio();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        const now = this.audioCtx.currentTime;

        if (type === 'tick') {
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            gainNode.gain.setValueAtTime(0.1, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'win') {
            [440, 554, 659].forEach((freq, i) => {
                const o = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                o.connect(g);
                g.connect(this.audioCtx.destination);
                o.frequency.value = freq;
                g.gain.setValueAtTime(0.2, now + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
                o.start(now + i * 0.1);
                o.stop(now + i * 0.1 + 0.5);
            });
        }
    }

    saveData() {
        const data = this.items.map(item => ({
            id: item.id,
            name: item.name,
            color: item.color,
            weight: item.weight,
            splitCount: item.splitCount,
            textSize: item.textSize || 20,
            textColor: item.textColor || '#ffffff'
        }));

        const payload = {
            items: data,
            isShuffled: this.isShuffled,
            appBg: this.appBg,
            isLightMode: this.isLightMode,
            spinTime: this.spinTime
        };

        localStorage.setItem('roulette_data', JSON.stringify(payload));
    }

    loadData() {
        const json = localStorage.getItem('roulette_data');
        if (json) {
            try {
                let parsed = JSON.parse(json);
                let itemsData = parsed;

                if (!Array.isArray(parsed) && parsed.items) {
                    itemsData = parsed.items;
                    this.isShuffled = !!parsed.isShuffled;
                    this.appBg = parsed.appBg || '#1a1a2a';
                    this.isLightMode = !!parsed.isLightMode;
                    this.spinTime = parsed.spinTime || 6;
                } else if (!Array.isArray(parsed)) {
                    itemsData = [];
                }

                this.items = itemsData.map(d => new RouletteItem(d.id, d.name, d.color, d.weight, d.splitCount, d.textSize, d.textColor));
                return true;
            } catch (e) {
                console.error('Failed to load data', e);
            }
        }
        return false;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new RouletteApp();
});
