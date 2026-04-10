document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const generateBtn = document.getElementById('generateBtn');
    const resultSection = document.getElementById('resultSection');
    const loader = document.getElementById('loader');
    const captionContainer = document.getElementById('captionContainer');
    const captionText = document.getElementById('captionText');
    const typeCursor = document.getElementById('typeCursor');
    const copyBtn = document.getElementById('copyBtn');
    const mainPanel = document.getElementById('mainPanel');

    let selectedFile = null;

    // --- Particle Background Logic ---
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particlesArray;

    function initCanvas() {
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 10000;
        for(let i = 0; i < numberOfParticles; i++){
            let size = (Math.random() * 2) + 1;
            let x = Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2;
            let y = Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2;
            let directionX = (Math.random() * .4) - .2;
            let directionY = (Math.random() * .4) - .2;
            let color = `rgba(168, 85, 247, ${Math.random() * 0.3})`;
            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x; this.y = y; this.directionX = directionX; this.directionY = directionY;
            this.size = size; this.color = color;
        }
        draw() {
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color; ctx.fill();
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
            this.x += this.directionX; this.y += this.directionY; this.draw();
        }
    }

    function animateParticles() {
        requestAnimationFrame(animateParticles);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for(let i = 0; i < particlesArray.length; i++){ particlesArray[i].update(); }
    }
    
    window.addEventListener('resize', initCanvas);
    initCanvas(); animateParticles();

    // --- 3D Hover Tilt Effect ---
    window.addEventListener('mousemove', (e) => {
        if (window.innerWidth < 768) return; // Disable on mobile
        let xAxis = (window.innerWidth / 2 - e.pageX) / 40;
        let yAxis = (window.innerHeight / 2 - e.pageY) / 40;
        mainPanel.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    });
    // Reset on leave
    document.body.addEventListener('mouseleave', () => {
        mainPanel.style.transform = `rotateY(0deg) rotateX(0deg)`;
    });

    // --- File Handling ---
    uploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => { if(e.target.files.length) handleFile(e.target.files[0]); });
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault(); uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation(); selectedFile = null;
        imagePreviewContainer.classList.remove('active');
        generateBtn.disabled = true; imageInput.value = '';
        resultSection.classList.remove('active'); captionContainer.classList.remove('active');
    });

    function handleFile(file) {
        if (!file.type.match('image.*')) return alert('Please select an image file (JPG or PNG)');
        if (file.size > 5 * 1024 * 1024) return alert('File size exceeds 5MB limit');
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.add('active');
            generateBtn.disabled = false;
            resultSection.classList.remove('active'); captionContainer.classList.remove('active');
        };
        reader.readAsDataURL(file);
    }

    // --- Typewriter Effect ---
    function typeWriter(text, i, cb) {
        if (i===0) { captionText.textContent = ""; typeCursor.classList.remove('hidden'); }
        if (i < text.length) {
            captionText.textContent += text.charAt(i);
            setTimeout(() => typeWriter(text, i + 1, cb), 40); // Type speed millisecond
        } else {
            typeCursor.classList.add('hidden');
            if(cb) cb();
        }
    }

    // --- API Call ---
    generateBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        
        generateBtn.disabled = true;
        resultSection.classList.add('active');
        loader.classList.add('active');
        captionContainer.classList.remove('active');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('/api/generate-caption', {
                method: 'POST', body: formData
            });
            if (!response.ok) { let e = await response.json(); throw new Error(e.detail || 'API Error'); }
            const data = await response.json();
            
            // Hide Loader, Show Caption UI
            loader.classList.remove('active');
            captionContainer.classList.add('active');
            
            // Start Typing effect
            typeWriter(data.caption, 0);

        } catch (error) {
            loader.classList.remove('active');
            captionContainer.classList.add('active');
            captionText.textContent = "";
            captionText.style.color = "var(--error)";
            typeWriter("Error: " + error.message, 0);
        } finally {
            generateBtn.disabled = false;
        }
    });

    // --- Copy Button ---
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(captionText.textContent).then(() => {
            const icon = copyBtn.querySelector('i');
            icon.className = 'fa-solid fa-check';
            icon.style.color = 'var(--success)';
            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                icon.style.color = '';
            }, 2000);
        });
    });
});
