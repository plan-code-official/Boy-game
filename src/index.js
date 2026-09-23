import { Application, Assets, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Controller } from './Controller';
import { Scene } from './Scene';
import { Robot } from './Robot';
import { Balloon } from './Balloon';
import robotImage from './robot.png';
import robot2Image from './robot2.png';
import hakimCore from './hakim/core.png';
import hakimHead from './hakim/head.png';
import hakimHappyHead from './hakim/happy.png';
import hakimSadHead from './hakim/sad.png';
import hakimRightArm from './hakim/right-arm.png';
import hakimLeftArm from './hakim/left-arm.png';
import bgImage from './BG.png';
import { Bullet } from './Bullet';
import { playShootSound, playPopSound, playVictorySound, playErrorSound } from './SoundEffects';
import { GameAPI, BOY_GAME_ID, wordToLetters } from './gameApi';
import React from 'react';
import { createRoot } from 'react-dom/client';
import EndGameFlow from './EndGameFlow';

// Asynchronous IIFE
(async () => {
  // Create a PixiJS application.
  const app = new Application();

  // Initialize the application.
  await app.init({ background: '#1099bb', resizeTo: window });

  // Then adding the application's canvas to the DOM body.
  document.body.appendChild(app.canvas);

  // API Setup - Read URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const urlGameId = urlParams.get('gameId') ? parseInt(urlParams.get('gameId')) : null;
  const urlLessonId = urlParams.get('lessonId') ? parseInt(urlParams.get('lessonId')) : null;
  const tokenParam = urlParams.get('token');
  
  let token = tokenParam || localStorage.getItem('childToken') || sessionStorage.getItem('childToken');
  if (tokenParam) {
    localStorage.setItem('childToken', tokenParam);
  }
  
  let gameAPI = null;
  let sessionId = null;
  let backendWords = [];
  let currentQuestionIndex = 0;
  let targetWord = '';
  let targetWordId = null;
  let targetLetters = [];
  let collectedLetters = [];
  let sessionAnswers = [];

  const loadingOverlayEl = document.getElementById('loading-overlay');
  const errorOverlayEl = document.getElementById('error-overlay');
  const errorMessageEl = document.getElementById('error-message');

  const showError = (msg) => {
    if (loadingOverlayEl) loadingOverlayEl.classList.add('hidden');
    if (errorOverlayEl) {
      errorOverlayEl.classList.remove('hidden');
      if (errorMessageEl) errorMessageEl.textContent = msg;
    }
  };

  if (!token || !urlLessonId) {
    showError("Missing authentication token or lesson ID.");
    return; // block game
  }

  if (token) {
    gameAPI = new GameAPI(token);
    try {
      const gameIdToUse = urlGameId || BOY_GAME_ID;
      const data = await gameAPI.getQuestions(gameIdToUse, urlLessonId);
      
      // Filter out invalid options and transform backend questions to word list format
      const validQuestions = data.questions.filter(q => Array.isArray(q.options));
      
      backendWords = validQuestions.map(q => {
        // Extract letters from options (which are array of objects with 'text' property)
        const letters = q.options.map(opt => 
          typeof opt === 'string' ? opt : opt.text
        );
        
        return {
          word: q.question,
          letters: letters,
          id: q.id
        };
      });
      // Remove log
      if (loadingOverlayEl) loadingOverlayEl.classList.add('hidden');
    } catch (err) {
      // Remove error log
      showError("Failed to load game questions.");
      return; // block game
    }
  }

  // Load the assets.
  await Assets.load([
    {
      alias: 'robot',
      src: robotImage,
    },
    {
      alias: 'robot2',
      src: robot2Image,
    },
    { alias: 'hakim-core', src: hakimCore },
    { alias: 'hakim-head', src: hakimHead },
    { alias: 'hakim-happy-head', src: hakimHappyHead },
    { alias: 'hakim-sad-head', src: hakimSadHead },
    { alias: 'hakim-right-arm', src: hakimRightArm },
    { alias: 'hakim-left-arm', src: hakimLeftArm },
    {
      alias: 'cityBg',
      src: bgImage,
    },
    {
      alias: 'platform',
      src: 'https://pixijs.com/assets/tutorials/spineboy-adventure/platform.png',
    },
  ]);

  // Create a controller that handles keyboard inputs.
  const controller = new Controller();

  // Wire mobile on-screen controls
  const setupTouchBtn = (id, key) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    const press = (e) => { 
      e.preventDefault(); 
      e.stopPropagation();
      controller.setTouchKeyState(key, true); 
    };
    const release = (e) => { 
      e.preventDefault(); 
      e.stopPropagation();
      controller.setTouchKeyState(key, false); 
    };
    
    // Use pointer events to correctly stop propagation to the global window listener
    btn.addEventListener('pointerdown', press, { passive: false });
    btn.addEventListener('pointerup', release, { passive: false });
    btn.addEventListener('pointercancel', release, { passive: false });
    btn.addEventListener('pointerleave', release, { passive: false });
  };

  setupTouchBtn('btn-up', 'up');
  setupTouchBtn('btn-left', 'left');
  setupTouchBtn('btn-right', 'right');
  setupTouchBtn('btn-down', 'down');
  setupTouchBtn('btn-run', 'run');
  setupTouchBtn('btn-jump-right', 'up');

  // Create a scene that holds the environment.
  const scene = new Scene(app.screen.width, app.screen.height);

  // Create our   
  const player = new Robot();
  player.setHeadFrames({
    normal: Assets.get('hakim-head'),
    happy: Assets.get('hakim-happy-head'),
    sad: Assets.get('hakim-sad-head'),
  });

  // Adjust views' transformation.
  scene.view.y = app.screen.height;
  player.view.x = app.screen.width / 2;
  player.view.y = app.screen.height - scene.floorHeight;
  // A wider camera framing gives the player more room to see incoming balloons.
  const PLAYER_CAMERA_SCALE = 0.22;
  player.view.scale.set(scene.scale * PLAYER_CAMERA_SCALE);

  // Handle window resizing dynamically to maintain center positioning
  window.addEventListener('resize', () => {
    // A slight delay helps mobile browsers correctly report dimensions after an orientation change
    setTimeout(() => {
      app.resize(); // Force pixi to re-evaluate window size
      scene.resize(app.screen.width, app.screen.height);
      scene.view.y = app.screen.height;
      player.view.x = app.screen.width / 2;
      player.view.y = app.screen.height - scene.floorHeight;
      player.groundY = player.view.y;
      player.view.scale.set(scene.scale * PLAYER_CAMERA_SCALE);
    }, 100);
  });

  // Containers for balloons, bullets, and floating effects
  const balloonContainer = new Container();
  const bulletContainer = new Container();
  const effectContainer = new Container();

  // Add elements in drawing depth order (Scene -> Balloons -> Bullets -> Particles -> Character)
  app.stage.addChild(scene.view);
  app.stage.addChild(balloonContainer);
  app.stage.addChild(bulletContainer);
  app.stage.addChild(effectContainer);
  app.stage.addChild(player.view);

  // Trigger character's spawn animation.
  player.spawn();

  // Game States
  let score = 0;
  let combo = 0;
  let comboTimer = 0;
  const COMBO_WINDOW = 3.5; // Seconds before combo multiplier resets
  let highscore = parseInt(localStorage.getItem('spineboy_highscore') || '0', 10);

  const balloons = [];
  const bullets = [];
  const particles = [];
  const floatingTexts = [];

  let balloonSpawnTimer = 0;
  let shootCooldown = 0;
  const SHOOT_COOLDOWN_MAX = 10;
  let gameStarted = false;
  let gameWon = false;
  let totalMistakes = 0;

  // Word Spelling Challenge States (Arabic Words with their individual letters)
  const fallbackWords = [
    { word: "قَلَم", letters: ['ق', 'ل', 'م'] },
    { word: "كِتَاب", letters: ['ك', 'ت', 'ا', 'ب'] },
    { word: "وَلَد", letters: ['و', 'ل', 'د'] },
    { word: "تُفَّاحَة", letters: ['ت', 'ف', 'ا', 'ح', 'ة'] },
    { word: "مَدْرَسَة", letters: ['م', 'د', 'ر', 'س', 'ة'] }
  ];
  
  // Use backend words if available, otherwise fallback
  const wordsList = backendWords.length > 0 ? backendWords : fallbackWords;
  

  // HUD elements references
  const scoreValEl = document.getElementById('score-val');
  const comboValEl = document.getElementById('combo-val');
  const comboPanelEl = document.getElementById('combo-panel');
  const highscoreValEl = document.getElementById('highscore-val');
  const tutorialOverlayEl = document.getElementById('tutorial-overlay');
  const winOverlayEl = document.getElementById('win-overlay');
  const completedWordEl = document.getElementById('completed-word');
  const finalScoreValEl = document.getElementById('final-score-val');
  const finalStarsValEl = document.getElementById('final-stars-val');
  const finalCoinsValEl = document.getElementById('final-coins-val');
  const finalXpValEl = document.getElementById('final-xp-val');
  const finalPercentValEl = document.getElementById('final-percent-val');
  const retryBtn = document.getElementById('retry-button');

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      // Reload page to start a fresh game session
      window.location.reload();
    });
  }

  // Initialize word target
  const initWordTarget = () => {
    if (currentQuestionIndex >= wordsList.length) {
      return false; // No more questions
    }
    const wordObj = wordsList[currentQuestionIndex];
    targetWord = wordObj.word;
    targetWordId = wordObj.id;
    targetLetters = wordObj.letters;
    collectedLetters = new Array(targetLetters.length).fill(false);

    const slotsContainer = document.getElementById('word-slots');
    if (slotsContainer) {
      slotsContainer.innerHTML = '';
      for (let i = 0; i < targetLetters.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'letter-slot';
        slot.id = `slot-${i}`;
        slot.textContent = targetLetters[i];
        slotsContainer.appendChild(slot);
      }
    }
    return true;
  };

  const updateHUD = () => {
    if (scoreValEl) scoreValEl.textContent = String(score);
    if (highscoreValEl) highscoreValEl.textContent = String(highscore).padStart(4, '0');
    if (comboValEl) comboValEl.textContent = `x${combo}`;
    if (comboPanelEl) {
      if (combo > 1) {
        comboPanelEl.style.opacity = '1';
        comboPanelEl.style.transform = 'scale(1.05)';
      } else {
        comboPanelEl.style.opacity = '0';
        comboPanelEl.style.transform = 'scale(0.8)';
      }
    }

    // Update letter slot classes
    for (let i = 0; i < targetLetters.length; i++) {
      const slot = document.getElementById(`slot-${i}`);
      if (slot) {
        if (collectedLetters[i]) {
          slot.classList.add('collected');
        } else {
          slot.classList.remove('collected');
        }
      }
    }
  };

  const resetGame = () => {
    score = 0;
    combo = 0;
    comboTimer = 0;
    gameWon = false;
    gameStarted = false;
    totalMistakes = 0;
    currentQuestionIndex = 0;
    sessionId = null; // Clear session ID so a new one is created on next start
    sessionAnswers = [];

    // Destroy existing Pixi components
    balloons.forEach(b => b.destroy());
    bullets.forEach(b => b.destroy());
    particles.forEach(p => p.destroy());
    floatingTexts.forEach(t => t.destroy());

    balloons.length = 0;
    bullets.length = 0;
    particles.length = 0;
    floatingTexts.length = 0;

    balloonSpawnTimer = 0;
    shootCooldown = 0;

    // Reset states
    initWordTarget();
    updateHUD();

    // Reset HTML layouts
    if (winOverlayEl) winOverlayEl.classList.add('hidden');
    if (tutorialOverlayEl) tutorialOverlayEl.classList.remove('hidden');

    // Trigger character spawn
    player.spawn();
  };

  const spawnExplosion = (x, y, color) => {
    const count = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const p = new Graphics();
      const radius = 2.5 + Math.random() * 4;
      p.circle(0, 0, radius);
      p.fill({ color });
      p.x = x;
      p.y = y;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 1.5; // upwards bias
      p.alpha = 1;

      effectContainer.addChild(p);
      particles.push(p);
    }
  };

  // Initializedisplays
  initWordTarget();
  updateHUD();

  // Initialize Rotate Screen Overlay state (let CSS handle orientation logic, just remove any default hidden classes if we want it to work)
  // The portrait overlay is handled purely by CSS media queries now.

  // Animate the scene and the character based on the controller's input.
  app.ticker.add(() => {
    // If the game is completed, completely freeze the loop.
    // Restarts are now exclusively handled by the React EndGame modal.
    if (gameWon) {
      return;
    }

    // Ignore the update loops while the character is doing the spawn animation.
    if (player.isSpawning()) {
      player.update(app.ticker.deltaTime);
      return;
    }

    // Start game upon any player interaction
    if (!gameStarted && (
      controller.keys.left.pressed ||
      controller.keys.right.pressed ||
      controller.keys.up.pressed ||
      controller.keys.shoot.pressed
    )) {
      gameStarted = true;
      
      // Start backend session
      if (gameAPI && !sessionId) {
        const gameIdToUse = urlGameId || BOY_GAME_ID;
        gameAPI.startSession(gameIdToUse, urlLessonId).then(session => {
          sessionId = session.sessionId || session.id;
          if (sessionId === 'null') sessionId = null;
          // Session started
        }).catch(err => {
          // Silent catch
        });
      }
    }

    // Update character's state based on the controller's input.
    player.state.walk = controller.keys.left.pressed || controller.keys.right.pressed;
    if (player.state.run && player.state.walk) player.state.run = true;
    else player.state.run = controller.keys.run.pressed || controller.keys.left.doubleTap || controller.keys.right.doubleTap;
    player.state.hover = controller.keys.down.pressed;
    // Keyboard direction owns the symmetric A/D movement and facing.
    if (controller.keys.left.pressed && !controller.keys.right.pressed) player.direction = -1;
    else if (controller.keys.right.pressed && !controller.keys.left.pressed) player.direction = 1;
    player.state.jump = controller.keys.up.pressed;
    player.state.shoot = controller.keys.shoot.pressed;

    // Keep the body facing the pointer while it is idle; the arm still applies
    // its own fixed-shoulder safety arc in robot-local space.
    if (!player.state.walk && controller.lastShootType === 'pointer'
      && Math.abs(controller.pointer.x - player.view.x) > 6) {
      player.direction = controller.pointer.x < player.view.x ? -1 : 1;
    }

    // Dynamically update aiming targets (either tracking the pointer or aiming straight ahead)
    if (controller.lastShootType === 'pointer') {
      player.aimAt(controller.pointer.x, controller.pointer.y);
    }

    // Update character animation after the target pose has been calculated.
    player.update(app.ticker.deltaTime);

    // Determine the scene's horizontal scrolling speed based on the character's state.
    let speed = 1.25;
    if (player.state.hover) speed = 7.5;
    else if (player.state.run) speed = 3.75;

    // Shift the scene's position based on the character's facing direction, if in a movement state.
    let scrollX = 0;
    if (player.state.walk) {
      scrollX = speed * scene.scale * player.direction;
      scene.positionX -= scrollX;
    }

    // Handle shooting and rate-of-fire cooldowns
    if (player.state.shoot) {
      if (shootCooldown <= 0) {
        playShootSound();

        // Instantly face the target coordinates when shooting via mouse click
        if (controller.lastShootType === 'pointer') {
          if (!player.state.walk) {
            player.direction = controller.pointer.x < player.view.x ? -1 : 1;
          }
          // Update aiming immediately for correct initial bullet spawn orientation
          player.aimAt(controller.pointer.x, controller.pointer.y);
          player.update(app.ticker.deltaTime);
        }

        // The complete left-arm sprite provides the laser muzzle.
        const muzzlePos = player.getMuzzlePosition();
        const gunX = muzzlePos.x;
        const gunY = muzzlePos.y;
        // Pointer shots travel from the transformed muzzle directly toward the
        // pointer position captured at click time. Keyboard shots retain the
        // existing arm-forward direction.
        const angle = controller.lastShootType === 'pointer'
          ? Math.atan2(controller.pointer.y - gunY, controller.pointer.x - gunX)
          : player.getGunAngle();

        // Spawn muzzle flash sparks!
        const sparkCount = 8;
        for (let j = 0; j < sparkCount; j++) {
          const p = new Graphics();
          const radius = 1 + Math.random() * 2;
          p.circle(0, 0, radius);
          // Spark color: 80% cyan, 20% white
          const color = Math.random() < 0.8 ? 0x00ffff : 0xffffff;
          p.fill({ color });
          p.x = gunX;
          p.y = gunY;

          // Project sparks along the exact same muzzle-to-target direction as
          // the bullet, so the visual effect never diverges from the shot.
          const baseAngle = angle;
          const sparkAngle = baseAngle + (Math.random() - 0.5) * 0.8;
          const speed = 2 + Math.random() * 5;
          p.vx = Math.cos(sparkAngle) * speed;
          p.vy = Math.sin(sparkAngle) * speed - 1.0;
          p.alpha = 1.0;

          effectContainer.addChild(p);
          particles.push(p);
        }

        const bullet = new Bullet(gunX, gunY, angle);
        bulletContainer.addChild(bullet.view);
        bullets.push(bullet);

        shootCooldown = SHOOT_COOLDOWN_MAX;
      }
    }

    if (shootCooldown > 0) {
      shootCooldown -= app.ticker.deltaTime;
    }

    // Balloon Spawning
    balloonSpawnTimer -= app.ticker.deltaTime;
    if (balloonSpawnTimer <= 0) {
      const rand = Math.random();
      let type = 'normal';
      if (rand < 0.25) type = 'small';
      else if (rand < 0.45) type = 'large';
      else if (rand < 0.50) type = 'special';

      // Decide which letter to spawn inside the balloon
      let letterToSpawn = 'أ';
      const nextNeededIndex = collectedLetters.findIndex(c => !c);

      // 60% chance to spawn the next needed letter, 40% chance for a random Arabic letter
      if (nextNeededIndex !== -1 && Math.random() < 0.6) {
        letterToSpawn = targetLetters[nextNeededIndex];
      } else {
        const alphabet = 'أبتثجحخدذرزسشصضطظعغفقكلمنهوي';
        letterToSpawn = alphabet[Math.floor(Math.random() * alphabet.length)];
      }

      const x = 50 + Math.random() * (app.screen.width - 100);
      const y = app.screen.height + 60;
      const balloon = new Balloon(x, y, type, letterToSpawn);
      balloonContainer.addChild(balloon.view);
      balloons.push(balloon);

      // Randomize spawn intervals
      balloonSpawnTimer = 35 + Math.random() * 45;
    }

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      bullet.update(app.ticker, scrollX);
      if (!bullet.active) {
        bullet.destroy();
        bullets.splice(i, 1);
      }
    }

    // Update Balloons
    for (let i = balloons.length - 1; i >= 0; i--) {
      const balloon = balloons[i];
      balloon.update(app.ticker, scrollX);
      if (!balloon.active) {
        // Reset combo if player lets a balloon float off-screen
        if (balloon.y < 0) {
          combo = 0;
          updateHUD();
        }
        balloon.destroy();
        balloons.splice(i, 1);
      }
    }

    // Update Explosion Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * app.ticker.deltaTime;
      p.y += p.vy * app.ticker.deltaTime;
      p.vy += 0.12 * app.ticker.deltaTime; // gravity force
      p.alpha -= 0.025 * app.ticker.deltaTime; // fade rate
      p.x -= scrollX;
      if (p.alpha <= 0) {
        p.destroy();
        particles.splice(i, 1);
      }
    }

    // Update Score Floating Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const t = floatingTexts[i];
      t.y -= 1.2 * app.ticker.deltaTime; // rise up speed
      t.alpha -= 0.02 * app.ticker.deltaTime;
      t.x -= scrollX;
      if (t.alpha <= 0) {
        t.destroy();
        floatingTexts.splice(i, 1);
      }
    }

    // Update Combo Decay Timer
    if (combo > 0) {
      comboTimer -= (app.ticker.deltaTime / 60);
      if (comboTimer <= 0) {
        combo = 0;
        updateHUD();
      }
    }

    // Collision Detection: Laser Bullets vs Floating Balloons
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      if (!bullet.active) continue;

      for (let j = balloons.length - 1; j >= 0; j--) {
        const balloon = balloons[j];
        if (!balloon.canBeHit()) continue;

        // Circle-to-Circle Collision Check
        const distSq = (bullet.x - balloon.x) ** 2 + (bullet.y - balloon.y) ** 2;
        const minDist = bullet.radius + balloon.radius;
        if (distSq < minDist ** 2) {
          // Deactivate entities
          bullet.active = false;

          // Process letter collection (must be in sequential order)
          let letterCollected = false;
          const nextNeededIndex = collectedLetters.findIndex(c => !c);
          if (nextNeededIndex !== -1 && targetLetters[nextNeededIndex] === balloon.letter) {
            collectedLetters[nextNeededIndex] = true;
            letterCollected = true;
          }

          let scoreTextText = "";
          let scoreTextColor = "";

          if (letterCollected) {
            // Sound pop
            playPopSound();
            player.triggerHeadAnimation('correct');

            scoreTextText = balloon.letter;
            scoreTextColor = balloon.scoreColor;
          } else {
            // Mistake penalty!
            playErrorSound();
            player.triggerHeadAnimation('wrong');

            totalMistakes++;
            
            // Wrong answer gives 0 points
            scoreTextText = `0`;
            scoreTextColor = "#ff3333"; // Red indicator
          }

          updateHUD();

          // Every hit bursts exactly once at the collision point. Marking the
          // balloon inactive prevents any later bullet from processing it.
          balloon.active = false;
          balloon.view.visible = false;
          spawnExplosion(balloon.x, balloon.y, balloon.color);

          // Spawn floating score/error display text
          const scoreStyle = new TextStyle({
            fontFamily: 'Cairo',
            fontSize: 20,
            fontWeight: 'bold',
            fill: scoreTextColor,
            stroke: { color: 0x121621, width: 4 }
          });
          const ft = new Text({ text: scoreTextText, style: scoreStyle });
          ft.x = balloon.x;
          ft.y = balloon.y - balloon.radius;
          ft.anchor.set(0.5);
          effectContainer.addChild(ft);
          floatingTexts.push(ft);

          // Check if word is complete
          const allCollected = collectedLetters.every(c => c);
          if (allCollected) {
            playVictorySound();
            
            // The word is complete, award 1 coin (score)
            score += 1;
            updateHUD();
            
            // Clean up balloons and bullets from screen
            balloons.forEach(b => b.destroy());
            balloons.length = 0;
            bullets.forEach(b => b.destroy());
            bullets.length = 0;

            // Accumulate answers for this question
            sessionAnswers.push({
              questionId: targetWordId,
              selectedAnswer: targetWord
            });

            // Move to next question
            currentQuestionIndex++;
            const hasMore = initWordTarget();
            
            if (hasMore) {
              // Update HUD for next word and continue playing
              updateHUD();
            } else {
              // No more words, completely finish the game session
              gameWon = true;

              const renderReactEndgame = (apiResult = {}) => {
                const finalScore = apiResult.score || score;
                const earnedCoins = apiResult.coins || score; // Match coins to score since there's no combo
                
                const reactRootEl = document.createElement('div');
                reactRootEl.id = 'react-endgame-root';
                reactRootEl.style.position = 'fixed';
                reactRootEl.style.top = '0';
                reactRootEl.style.left = '0';
                reactRootEl.style.width = '100vw';
                reactRootEl.style.height = '100vh';
                reactRootEl.style.zIndex = '9999';
                document.body.appendChild(reactRootEl);
                
                const root = createRoot(reactRootEl);
                root.render(
                  React.createElement(EndGameFlow, {
                    score: finalScore,
                    totalScore: wordsList.length, // total correct possible is number of questions
                    correctAnswers: score, // score is exactly number of correct answers
                    wrongAnswers: totalMistakes,
                    coins: earnedCoins,
                    onRetry: () => window.location.reload(),
                    onBack: () => window.history.back()
                  })
                );
              };

              if (gameAPI && sessionId) {
                const currentSessionId = sessionId; // Capture to prevent it from being nullified by resetGame
                gameAPI.submitAnswers(currentSessionId, sessionAnswers)
                  .then(() => gameAPI.completeSession(currentSessionId))
                  .then(result => {
                    renderReactEndgame(result);
                  })
                  .catch(err => {
                    console.error('Failed to complete session', err);
                    renderReactEndgame();
                  });
              } else {
                renderReactEndgame();
              }
            }
            
            return; // Exit the ticker loop immediately since all objects are destroyed
          }

          // Clean up models immediately
          bullet.destroy();
          bullets.splice(i, 1);
          if (letterCollected) {
            balloon.destroy();
            balloons.splice(j, 1);
          }

          break; // break loop for this bullet since it exploded
        }
      }
    }
  });
})();
