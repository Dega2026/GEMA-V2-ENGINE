(function initGEMAEngine() {
    if (window.GEMA_ENGINE_INITIALIZED) return;
    window.GEMA_ENGINE_INITIALIZED = true;

    function start() {
        const container = document.getElementById("canvas-container");
        
        // تأكيد وجود المكتبات والكونتينر قبل البدء
        if (!container || typeof THREE === 'undefined' || typeof Swiper === 'undefined') {
            setTimeout(start, 100); 
            return;
        }

        // 1. إعداد المشهد (The Matrix)
        const scene = new THREE.Scene();
        
        // وظيفة لجلب الأبعاد الحقيقية للكونتينر المرن (Flexbox Friendly)
        const getW = () => container.clientWidth || container.offsetWidth;
        const getH = () => container.clientHeight || container.offsetHeight;

        const camera = new THREE.PerspectiveCamera(45, getW() / getH(), 0.1, 1000);
        
        const renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true,
            powerPreference: "high-performance" 
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(getW(), getH());
        renderer.setClearColor(0x000000, 0); // خلفية شفافة تماماً لمنع السواد

        container.innerHTML = ""; // تنظيف أي بقايا سابقة
        container.appendChild(renderer.domElement);

        // 2. الإضاءة (Pro Lighting)
        const mainLight = new THREE.DirectionalLight(0xffffff, 2);
        mainLight.position.set(5, 10, 7);
        scene.add(mainLight);
        
        const fillLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(fillLight);

        // 3. بناء السرنجة الذهبية (The Golden Asset)
        const group = new THREE.Group();
        const goldMat = new THREE.MeshPhongMaterial({ 
            color: 0xD4AF37, 
            shininess: 120,
            specular: 0xffffff
        });

        // جسم السرنجة
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6, 32), goldMat);
        
        // الحلقة العلوية
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 16, 100), goldMat);
        ring.rotation.x = Math.PI / 2; 
        ring.position.y = 2.5;

        group.add(body, ring);
        scene.add(group);
        
        camera.position.z = window.innerWidth <= 768 ? 12 : 9;

        // 4. محرك السلايدر (The Swiper Driver)
        let targetRotX = 0;
        const isRTL = document.documentElement.dir === "rtl" || localStorage.getItem("selectedLang") === "ar";

        const swiper = new Swiper(".mfg-slider", {
            loop: true, 
            speed: 1200,
            autoplay: { delay: 5000, disableOnInteraction: false },
            pagination: { el: ".swiper-pagination", clickable: true },
            navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
            effect: isRTL ? "slide" : "fade",
            fadeEffect: { crossFade: true },
            on: { 
                slideChange: () => { 
                    // حركة الشقلبة عند تغيير السلايد
                    targetRotX += Math.PI * 2; 
                } 
            }
        });

        // 5. محرك الأنيميشن (The Animation Loop)
        function animate() {
            requestAnimationFrame(animate);
            
            // دوران Y مستمر
            group.rotation.y += 0.01;
            
            // دوران X (الشقلبة) مع تنعيم الحركة (Lerp)
            group.rotation.x += (targetRotX - group.rotation.x) * 0.05;
            
            // حركة تنفس بسيطة (Floating Effect)
            group.position.y = Math.sin(Date.now() * 0.001) * 0.2;

            renderer.render(scene, camera);
        }
        animate();

        // 6. استجابة الأبعاد (Resize Handling)
        window.addEventListener('resize', () => {
            const width = getW();
            const height = getH();
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            
            // ضبط الزووم للموبايل
            camera.position.z = window.innerWidth <= 768 ? 12 : 9;
        });

        // "زقة" خفيفة للريندرر بعد التحميل عشان يظبط أبعاده مع الـ Flexbox
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    }

    // الانتظار حتى تحميل الصفحة بالكامل
    if (document.readyState === 'complete') {
        start();
    } else {
        window.addEventListener('load', start);
    }
})();