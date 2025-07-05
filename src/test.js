
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);
        
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // ------------------------
        // LIGHTING
        // ------------------------
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;

        // ------------------------
        // PHYSICS WORLD (CANNON.js)
        // ------------------------
        const physicsWorld = new CANNON.World();
        physicsWorld.gravity.set(0, -9.82, 0);

        // ------------------------
        // OBJECTS (THREE.js Mesh + CANNON.js Body)
        // ------------------------
        const objectsToUpdate = [];

        // --- GROUND ---
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, side: THREE.DoubleSide });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.receiveShadow = true;
        scene.add(groundMesh);
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        physicsWorld.addBody(groundBody);

        // --- PLAYER ---
        const playerRadius = 1;
        const playerGeometry = new THREE.SphereGeometry(playerRadius, 32, 32);
        const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        playerMesh.position.y = 5;
        playerMesh.castShadow = true;
        scene.add(playerMesh);

        const playerShape = new CANNON.Sphere(playerRadius);
        const playerBody = new CANNON.Body({
            mass: 5,
            position: new CANNON.Vec3(0, 5, 0),
            shape: playerShape,
            material: new CANNON.Material({ friction: 0.1, restitution: 0.1 })
        });
        physicsWorld.addBody(playerBody);
        objectsToUpdate.push({ mesh: playerMesh, body: playerBody });
        
        // --- BOXES (Obstacles) ---
        function createBox(size, position) {
            const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
            boxMesh.position.copy(position);
            boxMesh.castShadow = true;
            scene.add(boxMesh);

            const boxShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
            const boxBody = new CANNON.Body({ mass: 0, shape: boxShape, position: new CANNON.Vec3(position.x, position.y, position.z) });
            physicsWorld.addBody(boxBody);
        }
        createBox({x: 2, y: 2, z: 2}, {x: 5, y: 1, z: -5});
        createBox({x: 4, y: 1, z: 2}, {x: -8, y: 0.5, z: 8});
        createBox({x: 1, y: 4, z: 3}, {x: -10, y: 2, z: -10});

        // ------------------------
        // CONTROLS AND CAMERA
        // ------------------------
        const keysPressed = {};
        let canJump = true;
        const moveSpeed = 30;
        const jumpForce = 10;

        // Camera control variables
        let cameraYaw = 0;
        let cameraPitch = 0.4; // Initial up/down angle
        const mouseSensitivity = 0.002;
        const cameraDistance = 8;

        // Fullscreen and Pointer Lock
        renderer.domElement.addEventListener('click', () => {
            document.body.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
            renderer.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === renderer.domElement) {
                document.getElementById('instructions').style.display = 'none';
            } else {
                document.getElementById('instructions').style.display = 'block';
            }
        });

        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === renderer.domElement) {
                cameraYaw -= event.movementX * mouseSensitivity;
                cameraPitch -= event.movementY * mouseSensitivity;

                // Clamp pitch to prevent flipping
                cameraPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, cameraPitch));
            }
        });

        window.addEventListener('keydown', (event) => { keysPressed[event.key.toLowerCase()] = true; });
        window.addEventListener('keyup', (event) => { keysPressed[event.key.toLowerCase()] = false; });
        
        playerBody.addEventListener("collide", (event) => {
            if (event.contact.ni.y > 0.5) canJump = true;
        });
        
        function updatePlayerAndCamera() {
            const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
            const right = new THREE.Vector3(forward.z, 0, -forward.x);
            
            const moveDirection = new THREE.Vector3();
            if (keysPressed['w']) moveDirection.add(forward);
            if (keysPressed['s']) moveDirection.sub(forward);
            if (keysPressed['d']) moveDirection.add(right);
            if (keysPressed['a']) moveDirection.sub(right);

            if (moveDirection.length() > 0) {
                moveDirection.normalize().multiplyScalar(moveSpeed);
            }

            // Apply movement forces (keeping y velocity for gravity/jump)
            playerBody.velocity.x = moveDirection.x;
            playerBody.velocity.z = moveDirection.z;

            if (keysPressed[' '] && canJump) {
                playerBody.velocity.y = jumpForce;
                canJump = false;
            }
            
            // --- Camera Follow ---
            const cameraOffset = new THREE.Vector3(
                cameraDistance * Math.sin(cameraYaw) * Math.cos(cameraPitch),
                cameraDistance * Math.sin(cameraPitch),
                cameraDistance * Math.cos(cameraYaw) * Math.cos(cameraPitch)
            );
            
            const desiredCameraPosition = playerMesh.position.clone().add(cameraOffset);
            camera.position.lerp(desiredCameraPosition, 0.1);
            camera.lookAt(playerMesh.position.x, playerMesh.position.y + 1, playerMesh.position.z); // Look slightly above the player center
        }

        // ------------------------
        // ANIMATION LOOP
        // ------------------------
        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();
            
            physicsWorld.step(1 / 60, deltaTime, 3);
            
            updatePlayerAndCamera();

            for (const obj of objectsToUpdate) {
                obj.mesh.position.copy(obj.body.position);
                obj.mesh.quaternion.copy(obj.body.quaternion);
            }

            renderer.render(scene, camera);
        }
        animate();
  